import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, toApiError } from "../lib/api";
import { routes } from "../lib/routes";
import type {
  ClaimRecord,
  EmployeeClaimable,
  PayrollRun,
  PayrollTemplate,
} from "../lib/types";
import { env } from "../lib/env";
import { PAYROLL_VAULT_ABI } from "../lib/abi";
import { getWalletClients } from "../lib/wallet";
import { decryptForTx, decryptUint64ForView } from "../lib/cofhe";
import { asBool } from "../lib/utils";

const CLAIM_PROOF_ATTEMPTS = 60;
const CLAIM_PROOF_POLL_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function claimStatusOf(claim?: ClaimRecord | null) {
  return String(claim?.status ?? "not_started").toLowerCase();
}

function isZeroBytes32(value?: string | null) {
  return !value || /^0x0{64}$/i.test(String(value));
}

function claimRequestId(claim?: ClaimRecord | null) {
  return claim?.pending_request_id || claim?.request_id || "";
}

function hasClaimPendingProof(claim?: ClaimRecord | null) {
  return (
    !isZeroBytes32(claim?.pending_ok_handle) &&
    !isZeroBytes32(claimRequestId(claim))
  );
}

function isClaimTerminalFailure(claim?: ClaimRecord | null) {
  return ["failed", "finalized_revert", "error", "cancelled"].includes(
    claimStatusOf(claim)
  );
}

function uniqueClaimables(items: EmployeeClaimable[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = [
      item.run_id ?? "run",
      item.claim_id ?? "new",
      item.onchain_payroll_id ?? "payroll",
      item.claim_status ?? "status",
    ].join(":");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (text && text !== "null" && text !== "undefined") {
      return text;
    }
  }

  return "";
}

function claimablePayrollName(item: EmployeeClaimable) {
  return firstText(
    item.payroll_name,
    item.payroll_title,
    item.template_title,
    item.template?.title
  );
}

function claimableCompanyName(item: EmployeeClaimable) {
  return firstText(
    item.company_name,
    item.employer_company_name,
    item.employer_name,
    item.employer?.company_name,
    item.employer?.name,
    item.template?.company_name,
    item.template?.employer_company_name,
    item.template?.employer_name,
    item.template?.employer?.company_name,
    item.template?.employer?.name
  );
}

function claimableEmployerAddress(item: EmployeeClaimable) {
  return firstText(
    item.employer_address,
    item.employer?.wallet_address,
    item.employer?.address,
    item.template?.employer_address,
    item.template?.employer?.wallet_address,
    item.template?.employer?.address
  );
}

function normalizeAddress(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function profileCandidates(data: any): any[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.flatMap(profileCandidates);
  }

  const candidates = [data];

  if (data.profile) candidates.push(data.profile);
  if (data.employer) candidates.push(data.employer);
  if (data.profile?.employer) candidates.push(data.profile.employer);
  if (Array.isArray(data.results)) {
    candidates.push(...data.results.flatMap(profileCandidates));
  }

  return candidates;
}

function employerProfileCompanyName(data: any, employerAddress: string) {
  const normalizedEmployer = normalizeAddress(employerAddress);

  for (const candidate of profileCandidates(data)) {
    const walletAddress = normalizeAddress(
      firstText(
        candidate.wallet_address,
        candidate.employer_address,
        candidate.address
      )
    );

    if (walletAddress && walletAddress !== normalizedEmployer) {
      continue;
    }

    const companyName = firstText(
      candidate.company_name,
      candidate.employer_company_name,
      candidate.name,
      candidate.employer?.company_name,
      candidate.profile?.employer?.company_name
    );

    if (companyName) {
      return companyName;
    }
  }

  return "";
}

async function fetchEmployerCompanyName(employerAddress: string) {
  const normalizedEmployer = normalizeAddress(employerAddress);

  if (!normalizedEmployer) return "";

  const encoded = encodeURIComponent(normalizedEmployer);
  const profilePaths = [
    `/onboarding/profile/employer/?wallet_address=${encoded}`,
    `/onboarding/profile/?wallet_address=${encoded}&role=employer`,
    `/onboarding/employers/?wallet_address=${encoded}`,
    `/onboarding/employers/${encoded}/`,
    `/employers/?wallet_address=${encoded}`,
    `/employers/${encoded}/profile/`,
  ];

  for (const path of profilePaths) {
    try {
      const res = await api.get(path);
      const companyName = employerProfileCompanyName(res.data, normalizedEmployer);

      if (companyName) {
        return companyName;
      }
    } catch {
      // Keep trying known profile route shapes. Missing profile routes should not
      // block the employee's claimable payroll list.
    }
  }

  return "";
}

function mergeTemplateContext(
  item: EmployeeClaimable,
  template?: PayrollTemplate | null
): EmployeeClaimable {
  const payrollName = firstText(
    claimablePayrollName(item),
    template?.title,
    template?.payroll_name,
    template?.payroll_title,
    template?.template_title
  );

  const companyName = firstText(
    claimableCompanyName(item),
    template?.company_name,
    template?.employer_company_name,
    template?.employer_name,
    template?.employer?.company_name,
    template?.employer?.name
  );

  const employerAddress = firstText(
    claimableEmployerAddress(item),
    template?.employer_address,
    template?.employer?.wallet_address,
    template?.employer?.address
  );

  return {
    ...item,
    payroll_name: payrollName || item.payroll_name,
    template_title: item.template_title ?? (payrollName || undefined),
    company_name: companyName || item.company_name,
    employer_address: employerAddress || item.employer_address,
    template: item.template ?? template ?? undefined,
  };
}

function mergeCompanyName(
  item: EmployeeClaimable,
  companyName?: string | null
): EmployeeClaimable {
  const resolvedCompanyName = firstText(claimableCompanyName(item), companyName);

  return {
    ...item,
    company_name: resolvedCompanyName || item.company_name,
  };
}

function hasDisplayContext(item: EmployeeClaimable) {
  return Boolean(claimablePayrollName(item) && claimableCompanyName(item));
}

function userFacingClaimError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const message = raw.toLowerCase();

  if (message.includes("wallet") || message.includes("account")) {
    return new Error("Please connect your wallet to continue.");
  }

  if (
    message.includes("private proof is not ready") ||
    message.includes("pending claim proof") ||
    message.includes("claim transaction is still being prepared") ||
    message.includes("not ready") ||
    message.includes("handle") ||
    message.includes("proof")
  ) {
    return new Error(
      "Your private claim is still being prepared. Please wait a few seconds and try again."
    );
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

async function fetchClaimRecord(claimId: string | number) {
  const res = await api.get<ClaimRecord>(routes.claims.detail(claimId));
  return res.data;
}

async function syncPendingClaimRecord(claimId: string | number) {
  const res = await api.post(routes.claims.syncPending(claimId), {});
  return res.data;
}

async function waitForClaimProof(
  targetClaimId: string | number,
  options: {
    setStep?: (step: string) => void;
    step?: string;
    attempts?: number;
  } = {}
) {
  const attempts = options.attempts ?? CLAIM_PROOF_ATTEMPTS;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (options.step && options.setStep) {
      options.setStep(options.step);
    }

    let latest = await fetchClaimRecord(targetClaimId);

    if (hasClaimPendingProof(latest)) {
      return latest;
    }

    if (claimStatusOf(latest) === "finalized_success") {
      return latest;
    }

    if (isClaimTerminalFailure(latest)) {
      throw new Error(latest.last_error || "Claim failed.");
    }

    try {
      await syncPendingClaimRecord(targetClaimId);
      latest = await fetchClaimRecord(targetClaimId);

      if (hasClaimPendingProof(latest)) {
        return latest;
      }

      if (claimStatusOf(latest) === "finalized_success") {
        return latest;
      }

      if (isClaimTerminalFailure(latest)) {
        throw new Error(latest.last_error || "Claim failed.");
      }
    } catch (syncError) {
      console.warn("[CLAIM] sync pending failed:", syncError);
    }

    await sleep(CLAIM_PROOF_POLL_MS);
  }

  throw new Error(
    "The claim transaction is still being prepared. Please wait a few seconds and try again."
  );
}

export function useEmployeeClaimables(wallet?: string) {
  const qc = useQueryClient();
  const normalized = (wallet ?? "").trim().toLowerCase();

  return useQuery({
    queryKey: ["employeeClaimables", normalized],
    queryFn: async () => {
      try {
        const res = await api.get(routes.employees.claimables(normalized));
        const data = res.data as any;

        const rows = Array.isArray(data)
          ? (data as EmployeeClaimable[])
          : ((data.claimables ?? []) as EmployeeClaimable[]);

        const uniqueRows = uniqueClaimables(rows);
        const templateIds = Array.from(
          new Set(
            uniqueRows
              .filter((item) => !hasDisplayContext(item))
              .map((item) => Number(item.template_id))
              .filter((id) => Number.isFinite(id))
          )
        );

        const templateEntries =
          templateIds.length > 0
            ? await Promise.all(
                templateIds.map(async (templateId) => {
                  try {
                    const template = await qc.fetchQuery<PayrollTemplate>({
                      queryKey: ["template", String(templateId)],
                      queryFn: async () => {
                        const templateRes = await api.get<PayrollTemplate>(
                          routes.templates.detail(templateId)
                        );

                        return templateRes.data;
                      },
                      staleTime: 60_000,
                    });

                    return [templateId, template] as const;
                  } catch {
                    return [templateId, null] as const;
                  }
                })
              )
            : [];

        const templatesById = new Map(templateEntries);
        const templateRows =
          templateIds.length > 0
            ? uniqueRows.map((item) =>
                mergeTemplateContext(
                  item,
                  templatesById.get(Number(item.template_id))
                )
              )
            : uniqueRows;

        const employerAddresses = Array.from(
          new Set(
            templateRows
              .filter((item) => !claimableCompanyName(item))
              .map((item) => normalizeAddress(claimableEmployerAddress(item)))
              .filter(Boolean)
          )
        );

        if (employerAddresses.length === 0) {
          return templateRows;
        }

        const profileEntries = await Promise.all(
          employerAddresses.map(async (employerAddress) => {
            const companyName = await qc.fetchQuery<string>({
              queryKey: ["employerCompanyName", employerAddress],
              queryFn: () => fetchEmployerCompanyName(employerAddress),
              staleTime: 5 * 60_000,
              retry: false,
            });

            return [employerAddress, companyName] as const;
          })
        );

        const companyNamesByEmployer = new Map(profileEntries);

        return templateRows.map((item) => {
          const employerAddress = normalizeAddress(claimableEmployerAddress(item));

          return mergeCompanyName(item, companyNamesByEmployer.get(employerAddress));
        });
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(normalized),
    refetchInterval: normalized ? 8000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useClaim(claimId?: string) {
  return useQuery({
    queryKey: ["claim", claimId ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<ClaimRecord>(routes.claims.detail(claimId!));
        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(claimId),
    refetchInterval: (query) => {
      const claim = query.state.data as ClaimRecord | undefined;
      const status = String(claim?.status ?? "").toLowerCase();

      return [
        "request_broadcasted",
        "pending_ready",
        "finalize_broadcasted",
        "cancel_broadcasted",
      ].includes(status)
        ? 2000
        : false;
    },
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { run: number; employee_address: string }) => {
      try {
        const res = await api.post<ClaimRecord>(routes.claims.list, payload);
        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: [
          "employeeClaimables",
          variables.employee_address.toLowerCase(),
        ],
      });

      await qc.invalidateQueries({
        queryKey: ["employeeClaimables"],
      });
    },
  });
}

export function useRequestClaim(claimId?: string, employeeAddress?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      claimId?: string;
      payrollId: string | number;
    }) => {
      const { walletClient, publicClient, account } = await getWalletClients();

      const nonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending",
      });

      const targetClaimId = payload.claimId ?? claimId;

      if (!targetClaimId) {
        throw new Error("Claim ID is missing.");
      }

      let request;

      try {
        const simulated = await publicClient.simulateContract({
          account,
          address: env.payrollVaultAddress,
          abi: PAYROLL_VAULT_ABI,
          functionName: "requestClaim",
          args: [BigInt(payload.payrollId)],
          nonce,
        });

        request = simulated.request;
      } catch (error: any) {
        console.error("[REQUEST CLAIM] simulateContract error:", error);

        throw new Error(
          error?.shortMessage ||
            error?.details ||
            error?.message ||
            "requestClaim simulation failed"
        );
      }

      const hash = await walletClient.writeContract(request);

      await api.post(routes.claims.submitRequestClaim(targetClaimId), {
        tx_hash: hash,
        sender: account,
        nonce,
      });

      return { txHash: hash, claimId: targetClaimId };
    },
    onSuccess: async (_data, variables) => {
      const targetClaimId = variables.claimId ?? claimId;

      if (targetClaimId) {
        await qc.invalidateQueries({ queryKey: ["claim", targetClaimId] });
      }

      await qc.invalidateQueries({
        queryKey: ["employeeClaimables", (employeeAddress ?? "").toLowerCase()],
      });

      await qc.invalidateQueries({
        queryKey: ["employeeClaimables"],
      });
    },
  });
}

export function useSyncPendingClaim(claimId?: string, employeeAddress?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!claimId) {
        throw new Error("Claim ID is missing.");
      }

      try {
        const res = await api.post(routes.claims.syncPending(claimId), {});
        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["claim", claimId ?? ""] });

      await qc.invalidateQueries({
        queryKey: ["employeeClaimables", (employeeAddress ?? "").toLowerCase()],
      });

      await qc.invalidateQueries({
        queryKey: ["employeeClaimables"],
      });
    },
  });
}

/**
 * Important:
 * This no longer decrypts automatically.
 * It only reads the private allocation handle so refresh does not trigger
 * a wallet signature popup.
 */
export function useAllocationView(runId?: string) {
  return useQuery({
    queryKey: ["allocationView", runId ?? ""],
    queryFn: async () => {
      const runRes = await api.get<PayrollRun>(routes.runs.detail(runId!));
      const run = runRes.data;

      if (!run.onchain_payroll_id) return null;

      const { publicClient, account } = await getWalletClients();

      const handle = (await publicClient.readContract({
        account,
        address: env.payrollVaultAddress,
        abi: PAYROLL_VAULT_ABI,
        functionName: "getMyAllocation",
        args: [BigInt(run.onchain_payroll_id)],
      })) as string;

      return {
        handle,
        payrollId: String(run.onchain_payroll_id),
      };
    },
    enabled: Boolean(runId),
  });
}

/**
 * Decrypt only when the user explicitly triggers it.
 */
export function useDecryptAllocationAmount() {
  return useMutation({
    mutationFn: async (payload: { handle: string }) => {
      if (!payload.handle) {
        throw new Error("Allocation handle is missing.");
      }

      const amount = await decryptUint64ForView(payload.handle);

      return { handle: payload.handle, amount };
    },
  });
}

/**
 * Final claim step.
 *
 * This should only be called by the page when the UI has confirmed that:
 * - pending_ok_handle exists
 * - pending_request_id or request_id exists
 *
 * It still has a safety wait, but the UI should not treat `pending_ready`
 * alone as enough to finalize.
 */
export function useFinalizeOrCancelClaim(
  claimId?: string,
  employeeAddress?: string
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      payrollId: string | number;
      claim: ClaimRecord;
    }) => {
      const { walletClient, publicClient, account } = await getWalletClients();

      if (!claimId) {
        throw new Error("Claim ID is missing.");
      }

      let claim = payload.claim;

      if (!hasClaimPendingProof(claim)) {
        claim = await waitForClaimProof(claimId, {
          step: "Waiting for private claim proof...",
        });
      }

      if (claimStatusOf(claim) === "finalized_success") {
        return { txHash: "", okPlaintext: true };
      }

      const pendingRequestId = claimRequestId(claim);

      if (!hasClaimPendingProof(claim)) {
        throw new Error(
          "The claim transaction is still being prepared. Please wait a few seconds and try again."
        );
      }

      const proof = await decryptForTx(claim.pending_ok_handle!);
      const okPlaintext = asBool(proof.decryptedValue);

      const nonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending",
      });

      const functionName = okPlaintext ? "finalizeClaim" : "cancelPendingClaim";

      const hash = await walletClient.writeContract({
        account,
        address: env.payrollVaultAddress,
        abi: PAYROLL_VAULT_ABI,
        functionName,
        args: [
          BigInt(payload.payrollId),
          pendingRequestId as `0x${string}`,
          okPlaintext,
          proof.signature,
        ],
        nonce,
      });

      const body = {
        tx_hash: hash,
        sender: account,
        nonce,
        ok_plaintext: okPlaintext,
        ok_sig: proof.signature,
        request_id: pendingRequestId,
        requestId: pendingRequestId,
      };

      if (okPlaintext) {
        await api.post(routes.claims.submitFinalizeClaim(claimId), body);
      } else {
        await api.post(routes.claims.submitCancelClaim(claimId), body);
      }

      return { txHash: hash, okPlaintext };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["claim", claimId ?? ""] });

      await qc.invalidateQueries({
        queryKey: ["employeeClaimables", (employeeAddress ?? "").toLowerCase()],
      });

      await qc.invalidateQueries({ queryKey: ["employeeClaimables"] });
    },
    onError: (error) => {
      console.warn("[CLAIM FINALIZE] failed:", error);
    },
  });
}

type OneClickClaimOptions = {
  claimId?: string;
  runId?: string;
  payrollId?: string | number;
  employeeAddress?: string;
  onClaimId?: (claimId: string) => void;
};

/**
 * Compatibility wrapper.
 *
 * IMPORTANT:
 * This hook no longer performs a real one-click claim.
 *
 * The old one-click flow was unsafe because claim finalization depends on:
 * 1. requestClaim tx
 * 2. backend sync
 * 3. pending_ok_handle readiness
 * 4. pending_request_id/request_id readiness
 * 5. decryptForTx
 * 6. finalizeClaim tx
 *
 * So this hook now only:
 * - creates the claim if needed
 * - submits requestClaim if needed
 * - syncs pending proof if already requested
 * - returns the latest claim state
 *
 * It does NOT call decryptForTx.
 * It does NOT call finalizeClaim.
 *
 * Finalization must be handled by useFinalizeOrCancelClaim only when the UI
 * sees pending_ok_handle + pending_request_id/request_id are both present.
 */
export function useOneClickClaim({
  claimId,
  runId,
  payrollId,
  employeeAddress,
  onClaimId,
}: OneClickClaimOptions) {
  const qc = useQueryClient();
  const [claimStep, setClaimStep] = useState("");
  const [error, setError] = useState<Error | null>(null);

  async function invalidateClaimData(targetClaimId?: string | number) {
    if (targetClaimId != null) {
      await qc.invalidateQueries({ queryKey: ["claim", String(targetClaimId)] });
    }

    await qc.invalidateQueries({ queryKey: ["claims"] });
    await qc.invalidateQueries({ queryKey: ["employeeClaimables"] });

    if (employeeAddress) {
      await qc.invalidateQueries({
        queryKey: ["employeeClaimables", employeeAddress.toLowerCase()],
      });
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setClaimStep("Preparing claim...");

      const { walletClient, publicClient, account } = await getWalletClients();
      const normalizedEmployee = (employeeAddress || account).toLowerCase();

      let targetClaimId = claimId;
      let claim: ClaimRecord;

      /**
       * 1. Create backend claim record if needed.
       */
      if (!targetClaimId) {
        if (!runId) {
          throw new Error("Claim run is missing.");
        }

        const created = await api.post<ClaimRecord>(routes.claims.list, {
          run: Number(runId),
          employee_address: normalizedEmployee,
        });

        claim = created.data;
        targetClaimId = String(claim.id);
        onClaimId?.(targetClaimId);

        await invalidateClaimData(targetClaimId);
      } else {
        claim = await fetchClaimRecord(targetClaimId);
      }

      const status = claimStatusOf(claim);

      /**
       * 2. Already complete.
       */
      if (status === "finalized_success") {
        setClaimStep("Salary claimed.");
        await invalidateClaimData(targetClaimId);
        return claim;
      }

      /**
       * 3. Proof already ready.
       * Do NOT finalize here. The page should show "Complete Claim"
       * and call useFinalizeOrCancelClaim.
       */
      if (hasClaimPendingProof(claim)) {
        setClaimStep("Private claim proof ready.");
        await invalidateClaimData(targetClaimId);
        return claim;
      }

      /**
       * 4. Claim already requested. Only sync pending proof.
       */
      if (
        [
          "requesting",
          "request_broadcasted",
          "pending_ready",
          "finalize_broadcasted",
        ].includes(status)
      ) {
        setClaimStep("Preparing private claim...");

        try {
          await syncPendingClaimRecord(targetClaimId);
        } catch (syncError) {
          console.warn("[CLAIM FLOW] sync pending failed:", syncError);
        }

        const latest = await fetchClaimRecord(targetClaimId);
        await invalidateClaimData(targetClaimId);

        if (hasClaimPendingProof(latest)) {
          setClaimStep("Private claim proof ready.");
        } else {
          setClaimStep("Preparing private claim...");
        }

        return latest;
      }

      /**
       * 5. First chain action only: requestClaim.
       */
      if (["draft", "not_started", "failed"].includes(status)) {
        const currentPayrollId = claim.run_onchain_payroll_id ?? payrollId;

        if (!currentPayrollId) {
          throw new Error("Payroll ID is missing.");
        }

        setClaimStep("Submitting claim...");

        const nonce = await publicClient.getTransactionCount({
          address: account,
          blockTag: "pending",
        });

        let request;

        try {
          const simulated = await publicClient.simulateContract({
            account,
            address: env.payrollVaultAddress,
            abi: PAYROLL_VAULT_ABI,
            functionName: "requestClaim",
            args: [BigInt(currentPayrollId)],
            nonce,
          });

          request = simulated.request;
        } catch (requestError: any) {
          console.error("[CLAIM FLOW] requestClaim simulation failed:", requestError);

          throw new Error(
            requestError?.shortMessage ||
              requestError?.details ||
              requestError?.message ||
              "requestClaim simulation failed"
          );
        }

        const hash = await walletClient.writeContract(request);

        await api.post(routes.claims.submitRequestClaim(targetClaimId), {
          tx_hash: hash,
          sender: account,
          nonce,
        });

        await invalidateClaimData(targetClaimId);

        setClaimStep("Preparing private claim...");

        const latest = await fetchClaimRecord(targetClaimId);
        return latest;
      }

      await invalidateClaimData(targetClaimId);
      return claim;
    },

    onError: (flowError) => {
      const err =
        flowError instanceof Error
          ? flowError
          : new Error("Something went wrong.");

      setError(userFacingClaimError(err));
      setClaimStep("");
    },
  });

  return {
    /**
     * Kept for old components that still call claimSalary().
     * It now starts/prepares the claim only.
     */
    claimSalary: mutation.mutateAsync,

    /**
     * Kept for old components that still read isClaiming.
     */
    isClaiming: mutation.isPending,

    claimStep,
    error,
  };
}
