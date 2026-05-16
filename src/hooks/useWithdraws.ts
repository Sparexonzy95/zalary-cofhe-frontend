import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, postWithFallback, toApiError } from "../lib/api";
import { routes } from "../lib/routes";
import type { ClaimRecord, EncryptedInput, SwapRouterWithdraw } from "../lib/types";
import { env } from "../lib/env";
import { SWAP_ROUTER_ABI } from "../lib/abi";
import { getWalletClients } from "../lib/wallet";
import { decryptForTx, decryptUint64ForView, encryptUint64 } from "../lib/cofhe";
import { asBool } from "../lib/utils";

const ONE_CLICK_WITHDRAW_ATTEMPTS = 45;
const ONE_CLICK_WITHDRAW_POLL_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toHexIfBigInt(value: unknown): string {
  if (typeof value === "bigint") {
    return `0x${value.toString(16)}`;
  }
  return String(value ?? "");
}

function toApiEncryptedInput(encrypted: EncryptedInput) {
  return {
    ctHash: toHexIfBigInt((encrypted as any).ctHash),
    securityZone: Number((encrypted as any).securityZone ?? 0),
    utype: Number((encrypted as any).utype ?? 0),
    signature: String((encrypted as any).signature ?? "")
  };
}

function cancelRoutes(withdrawId: number | string) {
  return [
    `/api/v1/swaprouter/withdraws/${withdrawId}/submit_cancel/`,
    `/api/v1/swaprouter/withdraws/${withdrawId}/submit_cancel_with_payload/`
  ];
}

function withdrawStatusOf(withdraw?: SwapRouterWithdraw | null) {
  return String(withdraw?.status ?? "draft").toLowerCase();
}

function isZeroBytes32(value?: string | null) {
  return !value || /^0x0{64}$/i.test(String(value));
}

function withdrawRequestId(withdraw?: SwapRouterWithdraw | null) {
  return withdraw?.pending_request_id || withdraw?.request_id || "";
}

function withdrawPendingReady(withdraw?: SwapRouterWithdraw | null) {
  return (
    withdrawStatusOf(withdraw) === "pending_ready" ||
    (!isZeroBytes32(withdraw?.pending_amount_handle) &&
      !isZeroBytes32(withdraw?.pending_ok_handle) &&
      !isZeroBytes32(withdrawRequestId(withdraw)))
  );
}

function isWithdrawTerminalFailure(withdraw?: SwapRouterWithdraw | null) {
  return ["failed", "finalized_revert", "error", "cancelled"].includes(
    withdrawStatusOf(withdraw)
  );
}

function userFacingWithdrawError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const message = raw.toLowerCase();

  if (message.includes("wallet") || message.includes("account")) {
    return new Error("Please connect your wallet to continue.");
  }

  if (
    message.includes("decrypt") ||
    message.includes("permit") ||
    message.includes("signature")
  ) {
    return new Error(
      "Private verification failed. Please reconnect your wallet and try again."
    );
  }

  if (
    message.includes("pending") ||
    message.includes("proof") ||
    message.includes("handle")
  ) {
    return new Error(
      "We could not finalize this withdrawal yet. Please try again in a few seconds."
    );
  }

  if (
    message.includes("revert") ||
    message.includes("simulation") ||
    message.includes("insufficient")
  ) {
    return new Error(
      "The transaction could not be completed. Please check your wallet balance and try again."
    );
  }

  if (message.includes("longer than expected") || message.includes("timeout")) {
    return new Error(
      "This is taking longer than expected. Please refresh in a moment and continue."
    );
  }

  return error instanceof Error ? error : new Error("Something went wrong.");
}

async function fetchWithdrawRecord(withdrawId: string | number) {
  const res = await api.get<SwapRouterWithdraw>(routes.withdraws.detail(withdrawId));
  return res.data;
}

type SyncWithdrawResponse = {
  withdrawKey?: string;
  pendingUser?: string;
  pendingAmountHandle?: string;
  pendingOkHandle?: string;
  pendingRequestId?: string;
  ready?: boolean;
};

async function syncPendingWithdrawRecord(withdrawId: string | number) {
  const res = await api.post(routes.withdraws.syncPending(withdrawId), {});
  return res.data as SyncWithdrawResponse;
}

function mergeSyncedWithdraw(
  withdraw: SwapRouterWithdraw,
  synced?: SyncWithdrawResponse
): SwapRouterWithdraw {
  if (!synced) return withdraw;

  return {
    ...withdraw,
    withdraw_key: synced.withdrawKey ?? withdraw.withdraw_key,
    pending_amount_handle:
      synced.pendingAmountHandle ?? withdraw.pending_amount_handle,
    pending_ok_handle: synced.pendingOkHandle ?? withdraw.pending_ok_handle,
    pending_request_id: synced.pendingRequestId ?? withdraw.pending_request_id,
    status: synced.ready ? "pending_ready" : withdraw.status,
  };
}

export function useWithdraw(withdrawId?: string) {
  return useQuery({
    queryKey: ["withdraw", withdrawId ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<SwapRouterWithdraw>(routes.withdraws.detail(withdrawId!));
        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(withdrawId),
    refetchInterval: (query) => {
      const withdraw = query.state.data as SwapRouterWithdraw | undefined;
      const status = String(withdraw?.status ?? "").toLowerCase();
      return [
        "request_broadcasted",
        "pending_ready",
        "finalize_broadcasted",
        "cancel_broadcasted"
      ].includes(status)
        ? 2000
        : false;
    }
  });
}

export function useCreateWithdraw() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { claimId: string | number }) => {
      try {
        const res = await api.post<SwapRouterWithdraw>(routes.withdraws.create, {
          claim_id: payload.claimId
        });
        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["claim", String(variables.claimId)] });
    }
  });
}

export function useRequestWithdraw() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      withdrawId: number | string;
      withdrawKey: string;
      amountAtomic: string;
    }) => {
      const { walletClient, publicClient, account } = await getWalletClients();

      if (!payload.withdrawKey) {
        throw new Error("withdrawKey is missing.");
      }

      const encrypted = await encryptUint64(BigInt(payload.amountAtomic)) as EncryptedInput;
      const encryptedForApi = toApiEncryptedInput(encrypted);

      const nonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending"
      });

      const hash = await walletClient.writeContract({
        account,
        address: env.swapRouterAddress,
        abi: SWAP_ROUTER_ABI,
        functionName: "requestWithdraw",
        args: [payload.withdrawKey as `0x${string}`, encrypted],
        nonce
      });

      await api.post(routes.withdraws.submitRequest(payload.withdrawId), {
        tx_hash: hash,
        sender: account,
        nonce,
        amount_atomic: String(payload.amountAtomic),
        encrypted_amount: encryptedForApi
      });

      return { txHash: hash };
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["withdraw", String(variables.withdrawId)] });
      await qc.invalidateQueries({ queryKey: ["employeeClaimables"] });
    }
  });
}

export function useSyncWithdrawPending() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { withdrawId: number | string }) => {
      try {
        const res = await api.post(routes.withdraws.syncPending(payload.withdrawId), {});
        return res.data as {
          withdrawKey?: string;
          pendingUser?: string;
          pendingAmountHandle?: string;
          pendingOkHandle?: string;
          pendingRequestId?: string;
          ready?: boolean;
        };
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["withdraw", String(variables.withdrawId)] });
    }
  });
}

export function useFinalizeWithdraw() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      withdrawId: number | string;
      withdrawKey: string;
      pendingAmountHandle: string;
      pendingOkHandle: string;
      pendingRequestId: string;
    }) => {
      const { walletClient, publicClient, account } = await getWalletClients();

      if (!payload.withdrawKey) {
        throw new Error("withdrawKey is missing.");
      }

      const amountProof = await decryptForTx(payload.pendingAmountHandle);
      const okProof = await decryptForTx(payload.pendingOkHandle);
      const okPlain = asBool(okProof.decryptedValue);

      const nonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending"
      });

      const hash = await walletClient.writeContract({
        account,
        address: env.swapRouterAddress,
        abi: SWAP_ROUTER_ABI,
        functionName: "finalizeWithdraw",
        args: [
          payload.withdrawKey as `0x${string}`,
          payload.pendingRequestId as `0x${string}`,
          BigInt(amountProof.decryptedValue),
          amountProof.signature,
          okPlain,
          okProof.signature
        ],
        nonce
      });

      await postWithFallback(
        [
          routes.withdraws.submitFinalize(payload.withdrawId),
          routes.withdraws.submitFinalizeFallback(payload.withdrawId)
        ],
        {
          tx_hash: hash,
          sender: account,
          nonce,
          request_id: payload.pendingRequestId,
          requestId: payload.pendingRequestId,
          amount_plaintext: String(amountProof.decryptedValue),
          amount_sig: String(amountProof.signature),
          ok_plaintext: okPlain,
          ok_sig: String(okProof.signature)
        }
      );

      return { txHash: hash };
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["withdraw", String(variables.withdrawId)] });
      await qc.invalidateQueries({ queryKey: ["employeeClaimables"] });
    }
  });
}

export function useCancelWithdraw() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      withdrawId: number | string;
      withdrawKey: string;
      pendingAmountHandle: string;
      pendingOkHandle: string;
      pendingRequestId: string;
    }) => {
      const { walletClient, publicClient, account } = await getWalletClients();

      if (!payload.withdrawKey) {
        throw new Error("withdrawKey is missing.");
      }

      const amountProof = await decryptForTx(payload.pendingAmountHandle);
      const okProof = await decryptForTx(payload.pendingOkHandle);
      const okPlain = asBool(okProof.decryptedValue);

      const nonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending"
      });

      const hash = await walletClient.writeContract({
        account,
        address: env.swapRouterAddress,
        abi: SWAP_ROUTER_ABI,
        functionName: "cancelPendingWithdraw",
        args: [
          payload.withdrawKey as `0x${string}`,
          payload.pendingRequestId as `0x${string}`,
          BigInt(amountProof.decryptedValue),
          amountProof.signature,
          okPlain,
          okProof.signature
        ],
        nonce
      });

      await postWithFallback(
        cancelRoutes(payload.withdrawId),
        {
          tx_hash: hash,
          sender: account,
          nonce,
          request_id: payload.pendingRequestId,
          requestId: payload.pendingRequestId,
          amount_plaintext: String(amountProof.decryptedValue),
          amount_sig: String(amountProof.signature),
          ok_plaintext: okPlain,
          ok_sig: String(okProof.signature)
        }
      );

      return { txHash: hash };
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["withdraw", String(variables.withdrawId)] });
      await qc.invalidateQueries({ queryKey: ["employeeClaimables"] });
    }
  });
}

type OneClickWithdrawOptions = {
  claimId?: string;
  claim?: ClaimRecord | null;
  withdrawId?: string | number | null;
  withdrawKey?: string | null;
  amountAtomic?: string;
  allocationHandle?: string | null;
  employeeAddress?: string;
  onWithdraw?: (withdraw: SwapRouterWithdraw) => void;
};

export function useOneClickWithdraw({
  claimId,
  claim,
  withdrawId,
  withdrawKey,
  amountAtomic,
  allocationHandle,
  employeeAddress,
  onWithdraw,
}: OneClickWithdrawOptions) {
  const qc = useQueryClient();
  const [withdrawStep, setWithdrawStep] = useState("");
  const [error, setError] = useState<Error | null>(null);

  async function invalidateWithdrawData(targetWithdrawId?: string | number) {
    if (targetWithdrawId != null) {
      await qc.invalidateQueries({ queryKey: ["withdraw", String(targetWithdrawId)] });
    }

    if (claimId) {
      await qc.invalidateQueries({ queryKey: ["claim", String(claimId)] });
    }

    await qc.invalidateQueries({ queryKey: ["claims"] });
    await qc.invalidateQueries({ queryKey: ["employeeClaimables"] });
    await qc.invalidateQueries({ queryKey: ["balances"] });

    if (employeeAddress) {
      await qc.invalidateQueries({
        queryKey: ["employeeClaimables", employeeAddress.toLowerCase()],
      });
    }
  }

  async function waitForWithdrawState(
    targetWithdrawId: string | number,
    predicate: (withdraw: SwapRouterWithdraw) => boolean,
    options: { sync?: boolean; step?: string } = {}
  ) {
    for (let attempt = 0; attempt < ONE_CLICK_WITHDRAW_ATTEMPTS; attempt += 1) {
      if (options.step) setWithdrawStep(options.step);

      let latest = await fetchWithdrawRecord(targetWithdrawId);

      if (predicate(latest)) return latest;

      if (isWithdrawTerminalFailure(latest)) {
        throw new Error(latest.last_error || "Withdrawal failed.");
      }

      if (
        options.sync &&
        ["draft", "request_broadcasted", "pending_ready"].includes(
          withdrawStatusOf(latest)
        )
      ) {
        try {
          const synced = await syncPendingWithdrawRecord(targetWithdrawId);
          latest = mergeSyncedWithdraw(latest, synced);
          if (predicate(latest)) return latest;
        } catch (syncError) {
          console.warn("[ONE CLICK WITHDRAW] sync pending failed:", syncError);
        }
      }

      await sleep(ONE_CLICK_WITHDRAW_POLL_MS);
    }

    throw new Error("This is taking longer than expected.");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setWithdrawStep("Preparing withdrawal...");

      try {
        const { walletClient, publicClient, account } = await getWalletClients();

        if (!claimId) {
          throw new Error("Claim ID is missing.");
        }

        if (String(claim?.status ?? "").toLowerCase() !== "finalized_success") {
          throw new Error("Please claim this salary before withdrawing.");
        }

        let targetWithdraw: SwapRouterWithdraw | null = null;
        const existingWithdrawId =
          withdrawId ?? claim?.withdraw_id ?? null;

        if (existingWithdrawId) {
          targetWithdraw = await fetchWithdrawRecord(existingWithdrawId);
        } else {
          const created = await api.post<SwapRouterWithdraw>(
            routes.withdraws.create,
            { claim_id: claimId }
          );
          targetWithdraw = created.data;
          onWithdraw?.(targetWithdraw);
          await invalidateWithdrawData(targetWithdraw.id);
        }

        const targetWithdrawId = targetWithdraw.id;
        const targetWithdrawKey =
          targetWithdraw.withdraw_key ??
          withdrawKey ??
          claim?.withdraw_key ??
          "";

        if (!targetWithdrawKey) {
          throw new Error("withdrawKey is missing.");
        }

        if (withdrawStatusOf(targetWithdraw) === "finalized_success") {
          setWithdrawStep("Withdrawal successful.");
          onWithdraw?.(targetWithdraw);
          await invalidateWithdrawData(targetWithdrawId);
          return targetWithdraw;
        }

        if (withdrawStatusOf(targetWithdraw) === "finalize_broadcasted") {
          const finalized = await waitForWithdrawState(
            targetWithdrawId,
            (item) => withdrawStatusOf(item) === "finalized_success",
            { step: "Finalizing payout..." }
          );
          setWithdrawStep("Withdrawal successful.");
          onWithdraw?.(finalized);
          await invalidateWithdrawData(targetWithdrawId);
          return finalized;
        }

        if (
          ["draft", "not_started", "failed", "finalized_revert", "cancelled", "error"].includes(
            withdrawStatusOf(targetWithdraw)
          )
        ) {
          let nextAmountAtomic =
            targetWithdraw.amount_plaintext ?? amountAtomic ?? "";

          if (!nextAmountAtomic) {
            if (!allocationHandle) {
              throw new Error("Withdrawal amount is not available.");
            }

            setWithdrawStep("Encrypting amount...");
            const amount = await decryptUint64ForView(allocationHandle);
            nextAmountAtomic = String(amount);
          }

          setWithdrawStep("Submitting withdrawal...");

          const encrypted = await encryptUint64(BigInt(nextAmountAtomic)) as EncryptedInput;
          const encryptedForApi = toApiEncryptedInput(encrypted);
          const nonce = await publicClient.getTransactionCount({
            address: account,
            blockTag: "pending"
          });

          const hash = await walletClient.writeContract({
            account,
            address: env.swapRouterAddress,
            abi: SWAP_ROUTER_ABI,
            functionName: "requestWithdraw",
            args: [targetWithdrawKey as `0x${string}`, encrypted],
            nonce
          });

          await api.post(routes.withdraws.submitRequest(targetWithdrawId), {
            tx_hash: hash,
            sender: account,
            nonce,
            amount_atomic: String(nextAmountAtomic),
            encrypted_amount: encryptedForApi
          });

          await invalidateWithdrawData(targetWithdrawId);
        }

        targetWithdraw = await waitForWithdrawState(
          targetWithdrawId,
          (item) =>
            withdrawPendingReady(item) ||
            withdrawStatusOf(item) === "finalize_broadcasted" ||
            withdrawStatusOf(item) === "finalized_success",
          { sync: true, step: "Securing payout..." }
        );

        if (withdrawStatusOf(targetWithdraw) === "finalized_success") {
          setWithdrawStep("Withdrawal successful.");
          onWithdraw?.(targetWithdraw);
          await invalidateWithdrawData(targetWithdrawId);
          return targetWithdraw;
        }

        if (withdrawStatusOf(targetWithdraw) === "finalize_broadcasted") {
          const finalized = await waitForWithdrawState(
            targetWithdrawId,
            (item) => withdrawStatusOf(item) === "finalized_success",
            { step: "Finalizing payout..." }
          );
          setWithdrawStep("Withdrawal successful.");
          onWithdraw?.(finalized);
          await invalidateWithdrawData(targetWithdrawId);
          return finalized;
        }

        const pendingRequestId = withdrawRequestId(targetWithdraw);

        if (
          isZeroBytes32(targetWithdraw.pending_amount_handle) ||
          isZeroBytes32(targetWithdraw.pending_ok_handle) ||
          isZeroBytes32(pendingRequestId)
        ) {
          throw new Error("Pending withdrawal proof is not ready.");
        }

        setWithdrawStep("Finalizing payout...");

        const amountProof = await decryptForTx(targetWithdraw.pending_amount_handle!);
        const okProof = await decryptForTx(targetWithdraw.pending_ok_handle!);
        const okPlain = asBool(okProof.decryptedValue);
        const finalizeNonce = await publicClient.getTransactionCount({
          address: account,
          blockTag: "pending"
        });

        const finalizeHash = await walletClient.writeContract({
          account,
          address: env.swapRouterAddress,
          abi: SWAP_ROUTER_ABI,
          functionName: "finalizeWithdraw",
          args: [
            targetWithdrawKey as `0x${string}`,
            pendingRequestId as `0x${string}`,
            BigInt(amountProof.decryptedValue),
            amountProof.signature,
            okPlain,
            okProof.signature
          ],
          nonce: finalizeNonce
        });

        await postWithFallback(
          [
            routes.withdraws.submitFinalize(targetWithdrawId),
            routes.withdraws.submitFinalizeFallback(targetWithdrawId)
          ],
          {
            tx_hash: finalizeHash,
            sender: account,
            nonce: finalizeNonce,
            request_id: pendingRequestId,
            requestId: pendingRequestId,
            amount_plaintext: String(amountProof.decryptedValue),
            amount_sig: String(amountProof.signature),
            ok_plaintext: okPlain,
            ok_sig: String(okProof.signature)
          }
        );

        const finalized = await waitForWithdrawState(
          targetWithdrawId,
          (item) => withdrawStatusOf(item) === "finalized_success",
          { step: "Finalizing payout..." }
        );

        setWithdrawStep("Withdrawal successful.");
        onWithdraw?.(finalized);
        await invalidateWithdrawData(targetWithdrawId);
        return finalized;
      } catch (flowError) {
        console.error("[ONE CLICK WITHDRAW] failed:", flowError);
        throw userFacingWithdrawError(flowError);
      }
    },
    onError: (flowError) => {
      setError(flowError instanceof Error ? flowError : new Error("Something went wrong."));
      setWithdrawStep("");
    },
  });

  return {
    withdrawToWallet: mutation.mutateAsync,
    isWithdrawing: mutation.isPending,
    withdrawStep,
    error,
  };
}

