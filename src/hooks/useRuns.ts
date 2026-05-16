import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toApiError } from "../lib/api";
import { routes } from "../lib/routes";
import type {
  EncryptedInput,
  FundingQuote,
  PayrollRun,
  RunAllocation,
  TemplateEmployee,
} from "../lib/types";
import { env } from "../lib/env";
import { ERC20_ABI, PAYROLL_VAULT_ABI, SWAP_ROUTER_ABI } from "../lib/abi";
import { getWalletClients } from "../lib/wallet";
import { getCofheClient, decryptForTx } from "../lib/cofhe";

type JsonSafeEncryptedInput = {
  ctHash: string;
  securityZone: number;
  utype: number;
  signature: string;
};

const ACTIVATION_PROOF_TIMEOUT_MS = 60_000;
const ACTIVATION_NETWORK_TIMEOUT_MS = 45_000;
const ACTIVATION_WALLET_TIMEOUT_MS = 120_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

function bigintToHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function toJsonSafeEncryptedInput(input: EncryptedInput | any): JsonSafeEncryptedInput {
  return {
    ctHash:
      typeof input?.ctHash === "bigint"
        ? bigintToHex(input.ctHash)
        : String(input?.ctHash ?? ""),
    securityZone: Number(input?.securityZone ?? 0),
    utype: Number(input?.utype ?? 0),
    signature: String(input?.signature ?? ""),
  };
}

function normalizeEncryptedInput(input: EncryptedInput | any): EncryptedInput {
  return {
    ctHash:
      typeof input?.ctHash === "bigint"
        ? input.ctHash
        : BigInt(input?.ctHash ?? 0),
    securityZone: Number(input?.securityZone ?? 0),
    utype: Number(input?.utype ?? 0),
    signature: String(input?.signature ?? "") as `0x${string}`,
  };
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const anyErr = error as any;

    return (
      anyErr?.response?.data?.detail ||
      anyErr?.response?.data?.error ||
      anyErr?.response?.data?.message ||
      anyErr?.shortMessage ||
      anyErr?.details ||
      anyErr?.cause?.shortMessage ||
      anyErr?.cause?.message ||
      anyErr?.message ||
      "Unknown error"
    );
  }

  if (typeof error === "string") return error;

  return "Unknown error";
}

function isValidEvmAddress(value: unknown): value is `0x${string}` {
  const address = String(value ?? "").trim();

  return address.startsWith("0x") && address.length === 42;
}

function parsePositiveBigInt(value: unknown, fieldName: string): bigint {
  try {
    const parsed = BigInt(String(value ?? ""));

    if (parsed <= 0n) {
      throw new Error(`${fieldName} must be greater than zero.`);
    }

    return parsed;
  } catch {
    throw new Error(`${fieldName} is missing or invalid.`);
  }
}

function assertFutureDeadline(deadlineU64: bigint) {
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));

  if (deadlineU64 <= nowSeconds) {
    throw new Error(
      "Payroll deadline is already in the past. Create a fresh run with a future deadline."
    );
  }
}

function assertEmployeeCount(value: unknown): number {
  const employeeCount = Number(value);

  if (!Number.isInteger(employeeCount) || employeeCount <= 0) {
    throw new Error("This payroll run has no active employees.");
  }

  if (employeeCount > 65535) {
    throw new Error(
      "Employee count is too large for the PayrollVault createPayroll function."
    );
  }

  return employeeCount;
}

function debugEncryptedAllocationPayload(
  encryptedAmounts: EncryptedInput[],
  employeeAddresses: `0x${string}`[]
) {
  const uploadAbi = PAYROLL_VAULT_ABI.find(
    (item: any) => item?.type === "function" && item?.name === "uploadAllocations"
  );

  console.debug("[ALLOC UPLOAD DEBUG] uploadAllocations ABI inputs:", (uploadAbi as any)?.inputs);
  console.debug(
    "[ALLOC UPLOAD DEBUG] encrypted amount object keys:",
    encryptedAmounts.map((item) => Object.keys(item))
  );
  console.debug(
    "[ALLOC UPLOAD DEBUG] encrypted amount field summary:",
    encryptedAmounts.map((item, index) => ({
      index,
      employee: employeeAddresses[index],
      ctHashType: typeof item.ctHash,
      securityZone: item.securityZone,
      utype: item.utype,
      signatureStartsWith0x: String(item.signature).startsWith("0x"),
    }))
  );
  console.debug(
    "[ALLOC UPLOAD DEBUG] final amountCiphertexts payload shape:",
    encryptedAmounts.map((item) => ({
      ctHash: typeof item.ctHash,
      securityZone: typeof item.securityZone,
      utype: typeof item.utype,
      signature: String(item.signature).startsWith("0x") ? "0x..." : typeof item.signature,
    }))
  );
}

async function buildEncryptedUint64ForEmployer(
  amount: bigint,
  account: `0x${string}`
): Promise<EncryptedInput> {
  const client = await getCofheClient();
  const sdk: any = await import("@cofhe/sdk");

  const [encrypted] = await client
    .encryptInputs([sdk.Encryptable.uint64(amount)])
    .setAccount(account)
    .setChainId(env.evmChainId ?? 84532)
    .setUseWorker(false)
    .execute();

  if (typeof sdk.assertCorrectEncryptedItemInput === "function") {
    sdk.assertCorrectEncryptedItemInput(encrypted);
  }

  return normalizeEncryptedInput(encrypted);
}

async function buildEncryptedUint64ListForEmployer(
  amounts: bigint[],
  account: `0x${string}`
): Promise<EncryptedInput[]> {
  const client = await getCofheClient();
  const sdk: any = await import("@cofhe/sdk");

  const encryptableAmounts = amounts.map((amount) => sdk.Encryptable.uint64(amount));

  const encryptedList = await client
    .encryptInputs(encryptableAmounts)
    .setAccount(account)
    .setChainId(env.evmChainId ?? 84532)
    .setUseWorker(false)
    .execute();

  for (const encrypted of encryptedList) {
    if (typeof sdk.assertCorrectEncryptedItemInput === "function") {
      sdk.assertCorrectEncryptedItemInput(encrypted);
    }
  }

  return encryptedList.map(normalizeEncryptedInput);
}

export function useRun(runId?: string) {
  return useQuery({
    queryKey: ["run", runId ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<PayrollRun>(routes.runs.detail(runId!));

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const run = query.state.data as PayrollRun | undefined;
      const status = String(run?.status ?? "").toLowerCase();

      return [
        "create_broadcasted",
        "alloc_uploading",
        "alloc_finalizing",
        "funding",
        "activating",
      ].includes(status)
        ? 2000
        : false;
    },
  });
}

export function useRunFundingQuote(runId?: string) {
  return useQuery({
    queryKey: ["runFundingQuote", runId ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<FundingQuote>(routes.runs.fundingQuote(runId!));

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(runId),
  });
}

export function useRunAllocations(runId?: string) {
  return useQuery({
    queryKey: ["runAllocations", runId ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<RunAllocation[]>(`/api/v1/runs/${runId}/allocations/`);

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(runId),
  });
}

/**
 * FIXED:
 * This now validates the create payroll payload and simulates createPayroll()
 * before asking the wallet to send a transaction.
 *
 * This prevents the run-details page from broadcasting a tx that later reverts,
 * which was causing the page to fall back to the creation step after backend polling.
 */
export function useCreateOnchainPayroll(runId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      tokenAddress: `0x${string}`;
      deadlineU64: string | number;
      employeeCount: number;
    }) => {
      if (!runId) {
        throw new Error("Run ID is missing.");
      }

      if (!isValidEvmAddress(payload.tokenAddress)) {
        throw new Error("Payroll token address is missing or invalid.");
      }

      const deadlineU64 = parsePositiveBigInt(payload.deadlineU64, "Payroll deadline");
      assertFutureDeadline(deadlineU64);

      const employeeCount = assertEmployeeCount(payload.employeeCount);

      const { walletClient, publicClient, account } = await getWalletClients();

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
          functionName: "createPayroll",
          args: [payload.tokenAddress, deadlineU64, employeeCount],
          nonce,
        });

        request = simulated.request;
      } catch (error) {
        console.error("[CREATE PAYROLL DEBUG] simulation failed:", error);

        throw new Error(
          `Create payroll simulation failed: ${getErrorMessage(error)}`
        );
      }

      const hash = await walletClient.writeContract(request);

      await api.post(routes.runs.submitCreateOnchain(runId), {
        tx_hash: hash,
        sender: account,
        nonce: Number(nonce),
      });

      return { txHash: hash };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runFundingQuote", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runAllocations", runId ?? ""] });
    },
  });
}

export function useUploadAllocations(runId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      onchainPayrollId: string | number;
      employees: TemplateEmployee[];
    }) => {
      if (!runId) {
        throw new Error("Run ID is missing.");
      }

      const onchainPayrollId = parsePositiveBigInt(
        payload.onchainPayrollId,
        "On-chain payroll ID"
      );

      if (!Array.isArray(payload.employees) || payload.employees.length === 0) {
        throw new Error("There are no employees to upload.");
      }

      const { walletClient, publicClient, account } = await getWalletClients();

      const employeeAddresses = payload.employees.map((employee) => {
        const address = String(employee.employee_address).trim().toLowerCase();

        if (!isValidEvmAddress(address)) {
          throw new Error(`Invalid employee address: ${address}`);
        }

        return address as `0x${string}`;
      });

      const salaryAmounts = payload.employees.map((employee) =>
        parsePositiveBigInt(employee.amount_atomic, "Employee salary amount")
      );

      const rawEncryptedAmounts = await buildEncryptedUint64ListForEmployer(
        salaryAmounts,
        account
      );

      const jsonEncryptedAmounts = rawEncryptedAmounts.map(toJsonSafeEncryptedInput);

      debugEncryptedAllocationPayload(rawEncryptedAmounts, employeeAddresses);

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
          functionName: "uploadAllocations",
          args: [onchainPayrollId, employeeAddresses, rawEncryptedAmounts],
          nonce,
        });

        request = simulated.request;
      } catch (error) {
        throw new Error(`Upload simulation failed: ${getErrorMessage(error)}`);
      }

      const hash = await walletClient.writeContract(request);

      await api.post(routes.runs.submitUploadAllocationsChunk(runId), {
        tx_hash: hash,
        sender: account,
        nonce: Number(nonce),
        idempotency_key: `wallet-upload-${runId}-${Date.now()}`,
        employee_addresses: employeeAddresses,
        encrypted_amounts: jsonEncryptedAmounts,
      });

      return {
        txHash: hash,
        encryptedCount: rawEncryptedAmounts.length,
      };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runFundingQuote", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runAllocations", runId ?? ""] });
    },
  });
}

/**
 * Improved:
 * finalizeAllocations now simulates before writing too.
 */
export function useFinalizeAllocations(runId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { onchainPayrollId: string | number }) => {
      if (!runId) {
        throw new Error("Run ID is missing.");
      }

      const onchainPayrollId = parsePositiveBigInt(
        payload.onchainPayrollId,
        "On-chain payroll ID"
      );

      const { walletClient, publicClient, account } = await getWalletClients();

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
          functionName: "finalizeAllocations",
          args: [onchainPayrollId],
          nonce,
        });

        request = simulated.request;
      } catch (error) {
        throw new Error(`Finalize simulation failed: ${getErrorMessage(error)}`);
      }

      const hash = await walletClient.writeContract(request);

      await api.post(routes.runs.submitFinalizeAllocations(runId), {
        tx_hash: hash,
        sender: account,
        nonce: Number(nonce),
      });

      return { txHash: hash };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runFundingQuote", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runAllocations", runId ?? ""] });
    },
  });
}

export function useFundPayroll(runId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!runId) {
        throw new Error("Run ID is missing.");
      }

      const fundingCtxRes = await api.get(routes.runs.fundingContext(runId));

      const fundingCtx = fundingCtxRes.data as {
        onchain_payroll_id: number;
        required_total_atomic: string;
      };

      const onchainPayrollId = parsePositiveBigInt(
        fundingCtx.onchain_payroll_id,
        "On-chain payroll ID"
      );

      const amount = parsePositiveBigInt(
        fundingCtx.required_total_atomic,
        "Required funding amount"
      );

      const { walletClient, publicClient, account } = await getWalletClients();

      const allowance = (await publicClient.readContract({
        address: env.usdcAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [account, env.swapRouterAddress],
      })) as bigint;

      if (allowance < amount) {
        const approveNonce = await publicClient.getTransactionCount({
          address: account,
          blockTag: "pending",
        });

        let approveRequest;

        try {
          const simulatedApprove = await publicClient.simulateContract({
            account,
            address: env.usdcAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [env.swapRouterAddress, amount],
            nonce: approveNonce,
          });

          approveRequest = simulatedApprove.request;
        } catch (error) {
          throw new Error(`USDC approval simulation failed: ${getErrorMessage(error)}`);
        }

        const approveHash = await walletClient.writeContract(approveRequest);

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const depositNonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending",
      });

      let depositRequest;

      try {
        const simulatedDeposit = await publicClient.simulateContract({
          account,
          address: env.swapRouterAddress,
          abi: SWAP_ROUTER_ABI,
          functionName: "deposit",
          args: [amount],
          nonce: depositNonce,
        });

        depositRequest = simulatedDeposit.request;
      } catch (error) {
        throw new Error(`SwapRouter deposit simulation failed: ${getErrorMessage(error)}`);
      }

      const depositHash = await walletClient.writeContract(depositRequest);

      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      const rawEncrypted = await buildEncryptedUint64ForEmployer(amount, account);
      const jsonEncrypted = toJsonSafeEncryptedInput(rawEncrypted);

      const fundNonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending",
      });

      let fundRequest;

      try {
        const simulatedFund = await publicClient.simulateContract({
          account,
          address: env.payrollVaultAddress,
          abi: PAYROLL_VAULT_ABI,
          functionName: "fundPayroll",
          args: [onchainPayrollId, rawEncrypted],
          nonce: fundNonce,
        });

        fundRequest = simulatedFund.request;
      } catch (error) {
        throw new Error(`Funding simulation failed: ${getErrorMessage(error)}`);
      }

      const fundHash = await walletClient.writeContract(fundRequest);

      await api.post(routes.runs.submitFund(runId), {
        tx_hash: fundHash,
        sender: account,
        nonce: Number(fundNonce),
        amount_atomic: amount.toString(),
        encrypted_amount: jsonEncrypted,
      });

      return {
        depositTxHash: depositHash,
        fundTxHash: fundHash,
      };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runFundingQuote", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runAllocations", runId ?? ""] });
    },
  });
}

export function useActivatePayroll(runId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!runId) {
        throw new Error("Run ID is missing.");
      }

      const { walletClient, publicClient, account } = await getWalletClients();

      const runRes = await api.get<PayrollRun>(routes.runs.detail(runId), {
        timeout: ACTIVATION_NETWORK_TIMEOUT_MS,
      });
      const run = runRes.data;

      if (!run.onchain_payroll_id) {
        throw new Error("On-chain payroll ID is missing.");
      }

      const onchainPayrollId = parsePositiveBigInt(
        run.onchain_payroll_id,
        "On-chain payroll ID"
      );

      const handleRes = await api.get(routes.runs.fundedOnceHandle(runId, account), {
        timeout: ACTIVATION_NETWORK_TIMEOUT_MS,
      });

      const fundedOnceHandle = (
        handleRes.data?.funded_once_handle ??
        handleRes.data?.handle ??
        handleRes.data
      ) as string;

      if (!fundedOnceHandle || !String(fundedOnceHandle).startsWith("0x")) {
        throw new Error("Funded-once handle is missing or invalid.");
      }

      const proof = await withTimeout(
        decryptForTx(fundedOnceHandle),
        ACTIVATION_PROOF_TIMEOUT_MS,
        "Activation proof timed out. Check your wallet for a permit signature request, then try again."
      );
      const fundedPlaintext = Boolean(proof.decryptedValue);

      console.log("[ACTIVATE DEBUG] fundedOnceHandle:", fundedOnceHandle);
      console.log("[ACTIVATE DEBUG] proof:", proof);
      console.log("[ACTIVATE DEBUG] fundedPlaintext:", fundedPlaintext);

      if (!fundedPlaintext) {
        throw new Error(
          "Activation proof says fundedOnce is false. The fundPayroll tx may have mined successfully, but no real confidential transfer was confirmed on-chain."
        );
      }

      const nonce = await publicClient.getTransactionCount({
        address: account,
        blockTag: "pending",
      });

      let request;

      try {
        const simulated = await withTimeout(
          publicClient.simulateContract({
            account,
            address: env.payrollVaultAddress,
            abi: PAYROLL_VAULT_ABI,
            functionName: "activatePayroll",
            args: [onchainPayrollId, fundedPlaintext, proof.signature],
            nonce,
          }),
          ACTIVATION_NETWORK_TIMEOUT_MS,
          "Activation simulation timed out. Please check your network connection and try again."
        );

        request = (simulated as any).request;
      } catch (error) {
        console.error("[ACTIVATE DEBUG] simulateContract error:", error);

        throw new Error(
          `Activate payroll simulation failed: ${getErrorMessage(error)}`
        );
      }

      const hash = await withTimeout(
        walletClient.writeContract(request),
        ACTIVATION_WALLET_TIMEOUT_MS,
        "Wallet confirmation timed out. If you later approve the transaction, refresh this page before trying again."
      );

      await api.post(
        routes.runs.submitActivate(runId),
        {
          tx_hash: hash,
          sender: account,
          nonce: Number(nonce),
          funded_plaintext: fundedPlaintext,
          funded_sig: proof.signature,
        },
        { timeout: ACTIVATION_NETWORK_TIMEOUT_MS }
      );

      return { txHash: hash };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runFundingQuote", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["runAllocations", runId ?? ""] });
      await qc.invalidateQueries({ queryKey: ["employeeClaimables"] });
    },
  });
}

