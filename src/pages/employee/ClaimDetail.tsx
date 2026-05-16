import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleCheck,
  Clock3,
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AddressPill,
  Button,
  Card,
  StatusBadge,
  useToast,
} from "../../components/ui";
import {
  useAllocationView,
  useClaim,
  useCreateClaim,
  useEmployeeClaimables,
  useFinalizeOrCancelClaim,
  useRequestClaim,
  useSyncPendingClaim,
} from "../../hooks/useClaims";
import { useOneClickWithdraw, useWithdraw } from "../../hooks/useWithdraws";
import { formatAtomicToDisplay } from "../../lib/utils";
import { useWallet } from "../../lib/wallet";
import type { ClaimRecord } from "../../lib/types";

type ClaimDetailTab = "overview" | "transactions" | "details";
type WizardStepStatus = "Completed" | "In progress" | "Waiting" | "Locked";

function claimDetailTabFromSearch(value?: string | null): ClaimDetailTab | null {
  if (value === "overview" || value === "transactions" || value === "details") {
    return value;
  }

  return null;
}

function txUrl(txHash?: string | null) {
  if (!txHash) return "";
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

function normalizedStatus(value?: string | null) {
  return String(value ?? "not_started").toLowerCase();
}

function isZeroBytes32(value?: string | null) {
  return !value || /^0x0{64}$/i.test(String(value));
}

function getClaimRequestId(claim?: {
  pending_request_id?: string | null;
  request_id?: string | null;
} | null) {
  return claim?.pending_request_id || claim?.request_id || "";
}

function claimProofReady(claim?: {
  pending_ok_handle?: string | null;
  pending_request_id?: string | null;
  request_id?: string | null;
} | null) {
  return (
    !isZeroBytes32(claim?.pending_ok_handle) &&
    !isZeroBytes32(getClaimRequestId(claim))
  );
}

function isClaimFinalized(status: string) {
  return ["completed", "claimed", "finalized", "finalized_success"].includes(
    status
  );
}

function isWithdrawFinalized(status: string) {
  return status === "finalized_success";
}

function isClaimRequested(status: string) {
  return [
    "requesting",
    "request_broadcasted",
    "pending_ready",
    "finalize_broadcasted",
    "finalized_success",
    "finalized_revert",
    "cancel_broadcasted",
    "cancelled",
    "failed",
  ].includes(status);
}

function isClaimWaitingForProof(status: string, claim?: ClaimRecord | null) {
  return (
    ["requesting", "request_broadcasted", "pending_ready"].includes(status) &&
    !claimProofReady(claim)
  );
}

function isWithdrawMoving(status: string) {
  return [
    "request_broadcasted",
    "pending_ready",
    "finalize_broadcasted",
    "loading",
  ].includes(status);
}

function formatWithdrawAmount(value?: string | number | bigint | null) {
  if (value == null || value === "") return "Private";
  try {
    return `${formatAtomicToDisplay(value, 6)} USDC`;
  } catch {
    return String(value);
  }
}

function shortHash(value?: string | null) {
  if (!value) return "—";
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Please try again.";
}

function claimUserStatus(status: string, proofReady: boolean) {
  if (isClaimFinalized(status)) return "Claim completed";
  if (status === "finalize_broadcasted") return "Confirming claim";
  if (proofReady) return "Ready to complete";
  if (["requesting", "request_broadcasted", "pending_ready"].includes(status)) {
    return "Preparing claim";
  }
  if (["failed", "finalized_revert", "error", "cancelled"].includes(status)) {
    return "Needs attention";
  }
  return "Ready to claim";
}

function withdrawUserStatus(status: string, claimFinalized: boolean) {
  if (!claimFinalized) return "Locked";
  if (status === "request_broadcasted") return "Withdrawing";
  if (["pending_ready", "finalize_broadcasted"].includes(status)) {
    return "Finalizing payout";
  }
  if (isWithdrawFinalized(status)) return "Withdrawn";
  if (["failed", "finalized_revert", "error"].includes(status)) {
    return "Needs attention";
  }
  return "Ready to withdraw";
}

function stepTone(status: WizardStepStatus) {
  if (status === "Completed") return "complete";
  if (status === "In progress") return "active";
  if (status === "Waiting") return "pending";
  return "locked";
}

function StepStatusBadge({ status }: { status: WizardStepStatus }) {
  return <StatusBadge value={stepTone(status)} />;
}

function resolveWizardSteps(args: {
  claimStatus: string;
  proofReady: boolean;
  waitingForProof: boolean;
  claimFinalized: boolean;
  withdrawFinalized: boolean;
  requestPending: boolean;
  finalizePending: boolean;
  withdrawPending: boolean;
}) {
  const {
    claimStatus,
    proofReady,
    waitingForProof,
    claimFinalized,
    withdrawFinalized,
    requestPending,
    finalizePending,
    withdrawPending,
  } = args;

  let claimStepStatus: WizardStepStatus = "In progress";

  if (claimFinalized) {
    claimStepStatus = "Completed";
  } else if (waitingForProof) {
    claimStepStatus = "Waiting";
  } else if (
    requestPending ||
    finalizePending ||
    proofReady ||
    claimStatus === "finalize_broadcasted"
  ) {
    claimStepStatus = "In progress";
  }

  let withdrawStepStatus: WizardStepStatus = "Locked";

  if (withdrawFinalized) {
    withdrawStepStatus = "Completed";
  } else if (withdrawPending) {
    withdrawStepStatus = "Waiting";
  } else if (claimFinalized) {
    withdrawStepStatus = "In progress";
  }

  return [
    {
      number: "01",
      title: "Claim",
      body: claimFinalized
        ? "Your salary has been claimed into your private Zalary balance."
        : waitingForProof
          ? "Your claim is being prepared securely. No action is needed right now."
          : proofReady
            ? "Your claim is ready. Complete the final wallet confirmation."
            : "Start your secure salary claim.",
      status: claimStepStatus,
    },
    {
      number: "02",
      title: "Withdrawal",
      body: withdrawFinalized
        ? "Your salary has been withdrawn to your wallet."
        : claimFinalized
          ? "Your claimed salary is ready to withdraw to your wallet."
          : "Withdrawal unlocks after your claim is completed.",
      status: withdrawStepStatus,
    },
  ];
}

function statusIcon(status: WizardStepStatus) {
  if (status === "Completed") return "✓";
  if (status === "In progress") return "→";
  if (status === "Waiting") return "…";
  return "•";
}

function stepBadgeText(status: WizardStepStatus) {
  if (status === "In progress") return "Ready";
  return status;
}

function ProgressCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: WizardStepStatus;
}) {
  return (
    <div
      className={`claim-progress-card claim-progress-card-${stepTone(status)}`}
      style={{
        padding: "1rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        minHeight: "124px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "0.875rem",
      }}
    >
      <div
        style={{
          width: "2rem",
          height: "2rem",
          borderRadius: "999px",
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--border)",
          fontFamily: "var(--z-mono)",
        }}
        aria-hidden="true"
      >
        {statusIcon(status)}
      </div>

      <div>
        <strong>{title}</strong>
        <p
          className="muted"
          style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}
        >
          {description}
        </p>
      </div>

      <StepStatusBadge status={status} />
    </div>
  );
}

function ActivityItem({
  title,
  description,
  status,
  txHash,
}: {
  title: string;
  description: string;
  status: WizardStepStatus;
  txHash?: string | null;
}) {
  return (
    <div
      className={`claim-activity-item claim-activity-item-${stepTone(status)}`}
      style={{
        display: "grid",
        gridTemplateColumns: "2.25rem 1fr auto",
        gap: "0.875rem",
        alignItems: "start",
        padding: "1rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--card)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "999px",
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--border)",
          fontFamily: "var(--z-mono)",
        }}
      >
        {statusIcon(status)}
      </div>

      <div>
        <strong>{title}</strong>
        <p
          className="muted"
          style={{ margin: "0.35rem 0 0", fontSize: "0.84rem" }}
        >
          {description}
        </p>

        {txHash && (
          <a
            href={txUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              marginTop: "0.65rem",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            <span className="claim-detail-action-label-desktop">
              View transaction
            </span>
            <span className="claim-detail-action-label-mobile">View</span>
          </a>
        )}
      </div>

      <StepStatusBadge status={status} />
    </div>
  );
}

export function ClaimDetailPage() {
  const { claimId } = useParams();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { wallet, connect } = useWallet();

  const routeClaimId = claimId;
  const searchRunId = searchParams.get("runId") ?? "";
  const searchPayrollId = searchParams.get("payrollId") ?? "";
  const searchWithdrawId = searchParams.get("withdrawId") ?? "";
  const searchTab = searchParams.get("tab");

  const routeIsActuallyRunId =
    Boolean(routeClaimId) &&
    !searchRunId &&
    !searchPayrollId &&
    normalizedStatus(routeClaimId) !== "new" &&
    /^\d+$/.test(routeClaimId ?? "");

  const runId = searchRunId || (routeIsActuallyRunId ? routeClaimId ?? "" : "");
  const payrollIdFromUrl = searchPayrollId;

  const claimablesQuery = useEmployeeClaimables(wallet || undefined);
  const claimables = claimablesQuery.data ?? [];

  const linkedClaimable = React.useMemo(() => {
    if (!runId) return null;

    return (
      claimables.find((item) => String(item.run_id) === String(runId)) ?? null
    );
  }, [claimables, runId]);

  const linkedClaimId =
    linkedClaimable?.claim_id != null
      ? String(linkedClaimable.claim_id)
      : undefined;

  const initialClaimId = routeIsActuallyRunId
    ? linkedClaimId
    : linkedClaimId ?? routeClaimId;

  const [currentClaimId, setCurrentClaimId] = React.useState<
    string | undefined
  >(initialClaimId);

  const [localWithdrawId, setLocalWithdrawId] = React.useState<number | null>(
    searchWithdrawId && /^\d+$/.test(searchWithdrawId)
      ? Number(searchWithdrawId)
      : null
  );

  const [localWithdrawKey, setLocalWithdrawKey] = React.useState<string | null>(
    null
  );

  const [dismissedCompletionNotice, setDismissedCompletionNotice] =
    React.useState<"claim" | "withdrawal" | null>(null);

  const [activeTab, setActiveTab] = React.useState<ClaimDetailTab>(
    () => claimDetailTabFromSearch(searchTab) ?? "overview"
  );

  React.useEffect(() => {
    const nextTab = claimDetailTabFromSearch(searchTab);

    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [searchTab]);

  React.useEffect(() => {
    setDismissedCompletionNotice(null);
  }, [currentClaimId]);

  function replaceUrl(nextClaimId?: string, nextWithdrawId?: number | null) {
    const params = new URLSearchParams();

    if (runId) params.set("runId", runId);
    if (payrollIdFromUrl) params.set("payrollId", payrollIdFromUrl);
    if (nextWithdrawId) params.set("withdrawId", String(nextWithdrawId));

    const finalClaimId = nextClaimId ?? currentClaimId ?? claimId ?? "";
    if (!finalClaimId) return;

    const suffix = params.toString() ? `?${params.toString()}` : "";
    nav(`/employee/claims/${finalClaimId}${suffix}`, { replace: true });
  }

  React.useEffect(() => {
    const nextClaimId = routeIsActuallyRunId
      ? undefined
      : linkedClaimId ?? routeClaimId;

    if (nextClaimId !== currentClaimId) {
      setCurrentClaimId(nextClaimId);
    }
  }, [routeIsActuallyRunId, linkedClaimId, routeClaimId, currentClaimId]);

  React.useEffect(() => {
    setLocalWithdrawId(
      searchWithdrawId && /^\d+$/.test(searchWithdrawId)
        ? Number(searchWithdrawId)
        : null
    );
  }, [searchWithdrawId]);

  const claimQuery = useClaim(currentClaimId);
  const allocationQuery = useAllocationView(runId);

  const currentClaim = claimQuery.data;

  const payrollId =
    payrollIdFromUrl ||
    String(currentClaim?.run_onchain_payroll_id ?? "") ||
    String(linkedClaimable?.onchain_payroll_id ?? "") ||
    String(allocationQuery.data?.payrollId ?? "");

  const currentWithdrawId =
    currentClaim?.withdraw_id != null
      ? Number(currentClaim.withdraw_id)
      : localWithdrawId;

  const withdrawQuery = useWithdraw(
    currentWithdrawId ? String(currentWithdrawId) : undefined
  );

  const currentWithdrawKey =
    withdrawQuery.data?.withdraw_key ??
    currentClaim?.withdraw_key ??
    localWithdrawKey;

  React.useEffect(() => {
    if (currentClaim?.withdraw_id != null) {
      setLocalWithdrawId(Number(currentClaim.withdraw_id));
    }

    if (currentClaim?.withdraw_key) {
      setLocalWithdrawKey(String(currentClaim.withdraw_key));
    }
  }, [currentClaim?.withdraw_id, currentClaim?.withdraw_key]);

  const createClaim = useCreateClaim();
  const requestClaim = useRequestClaim(currentClaimId, wallet || undefined);
  const syncPendingClaim = useSyncPendingClaim(
    currentClaimId,
    wallet || undefined
  );
  const finalizeClaim = useFinalizeOrCancelClaim(
    currentClaimId,
    wallet || undefined
  );

  const oneClickWithdraw = useOneClickWithdraw({
    claimId: currentClaimId,
    claim: currentClaim,
    withdrawId: currentWithdrawId,
    withdrawKey: currentWithdrawKey,
    allocationHandle: allocationQuery.data?.handle,
    employeeAddress: wallet || undefined,
    onWithdraw: (withdraw) => {
      const nextWithdrawId = Number(withdraw.id);
      setLocalWithdrawId(nextWithdrawId);
      setLocalWithdrawKey(withdraw.withdraw_key ?? null);
      replaceUrl(undefined, nextWithdrawId);
    },
  });

  const rawClaimStatus =
    currentClaim?.status ??
    linkedClaimable?.claim_status ??
    (claimQuery.isError ? "error" : null);

  const claimStatus = normalizedStatus(rawClaimStatus);

  const withdrawStatus = normalizedStatus(
    withdrawQuery.data?.status ??
      currentClaim?.withdraw_status ??
      (currentWithdrawId
        ? withdrawQuery.isError
          ? "error"
          : "loading"
        : "not_started")
  );

  const proofReady = claimProofReady(currentClaim);
  const waitingForProof = isClaimWaitingForProof(claimStatus, currentClaim);
  const claimFinalized = isClaimFinalized(claimStatus);
  const withdrawFinalized = isWithdrawFinalized(withdrawStatus);

  const requestPending = requestClaim.isPending || createClaim.isPending;
  const finalizePending = finalizeClaim.isPending;
  const withdrawPending = oneClickWithdraw.isWithdrawing;

  const claimStateLoading = Boolean(currentClaimId && claimQuery.isLoading);
  const withdrawStateLoading = Boolean(
    currentWithdrawId && withdrawQuery.isLoading
  );

  const currentError =
    createClaim.error ??
    requestClaim.error ??
    syncPendingClaim.error ??
    finalizeClaim.error ??
    oneClickWithdraw.error;

  // Stable refs so polling effects don't restart when query objects change reference
  const syncMutateRef = React.useRef(syncPendingClaim.mutateAsync);
  const refetchClaimRef = React.useRef(claimQuery.refetch);
  const refetchClaimablesRef = React.useRef(claimablesQuery.refetch);
  const refetchWithdrawRef = React.useRef(withdrawQuery.refetch);
  syncMutateRef.current = syncPendingClaim.mutateAsync;
  refetchClaimRef.current = claimQuery.refetch;
  refetchClaimablesRef.current = claimablesQuery.refetch;
  refetchWithdrawRef.current = withdrawQuery.refetch;

  React.useEffect(() => {
    if (!waitingForProof || !currentClaimId) return;

    let alive = true;
    let busy = false;

    const syncNow = async () => {
      if (!alive || busy) return;

      busy = true;

      try {
        await syncMutateRef.current();
        if (!alive) return;
        await refetchClaimRef.current();
        if (!alive) return;
        await refetchClaimablesRef.current();
      } catch (error) {
        console.warn("[CLAIM WIZARD] auto-sync pending claim failed:", error);
      } finally {
        busy = false;
      }
    };

    void syncNow();

    const intervalId = window.setInterval(() => {
      void syncNow();
    }, 4000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, [waitingForProof, currentClaimId]);

  React.useEffect(() => {
    const claimMoving = [
      "requesting",
      "request_broadcasted",
      "pending_ready",
      "finalize_broadcasted",
    ].includes(claimStatus);

    const withdrawMoving = isWithdrawMoving(withdrawStatus);

    const shouldPoll =
      claimMoving ||
      withdrawMoving ||
      requestPending ||
      finalizePending ||
      withdrawPending ||
      (claimFinalized && !withdrawFinalized);

    if (!shouldPoll) return;

    let alive = true;
    let busy = false;

    const poll = async () => {
      if (!alive || busy) return;

      busy = true;

      try {
        await Promise.allSettled([
          refetchClaimRef.current(),
          refetchClaimablesRef.current(),
          refetchWithdrawRef.current(),
        ]);
      } catch (error) {
        console.warn("[CLAIM DETAIL] auto-refresh failed:", error);
      } finally {
        busy = false;
      }
    };

    void poll();

    const intervalId = window.setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, [
    claimStatus,
    withdrawStatus,
    requestPending,
    finalizePending,
    withdrawPending,
    claimFinalized,
    withdrawFinalized,
  ]);

  const claimRequestTx = currentClaim?.request_tx_hash;
  const claimFinalizeTx = currentClaim?.finalize_tx_hash;
  const claimCancelTx = currentClaim?.cancel_tx_hash;

  const withdrawRequestTx =
    withdrawQuery.data?.request_tx_hash ?? currentClaim?.withdraw_request_tx_hash;

  const withdrawFinalizeTx =
    withdrawQuery.data?.finalize_tx_hash ??
    currentClaim?.withdraw_finalize_tx_hash;

  const withdrawCancelTx =
    withdrawQuery.data?.cancel_tx_hash ?? currentClaim?.withdraw_cancel_tx_hash;

  const hasTxLinks =
    claimRequestTx ||
    claimFinalizeTx ||
    claimCancelTx ||
    withdrawRequestTx ||
    withdrawFinalizeTx ||
    withdrawCancelTx;

  const salaryDisplay = formatWithdrawAmount(
    withdrawQuery.data?.amount_plaintext
  );

  const userClaimStatus = claimUserStatus(claimStatus, proofReady);
  const userWithdrawStatus = withdrawUserStatus(withdrawStatus, claimFinalized);

  const canShowRequestButton =
    !claimFinalized &&
    !isClaimRequested(claimStatus) &&
    !proofReady &&
    !waitingForProof;

  const canShowCompleteButton =
    !claimFinalized &&
    proofReady &&
    !waitingForProof &&
    claimStatus !== "finalize_broadcasted";

  const canShowWithdrawButton = claimFinalized && !withdrawFinalized;

  const finalStatusText = withdrawFinalized
    ? "Withdrawn to wallet"
    : claimFinalized
      ? "Added to private balance"
      : userClaimStatus;

  const nextStepText = canShowRequestButton
    ? "Request claim"
    : canShowCompleteButton
      ? "Complete claim"
      : canShowWithdrawButton
        ? "Withdraw to wallet"
        : withdrawFinalized
          ? "Completed"
          : waitingForProof
            ? "Preparing claim"
            : "Confirming";

  const flowCopy = (() => {
    if (requestPending) {
      return {
        eyebrow: "Claim",
        title: "Requesting claim",
        description:
          "Your wallet is submitting the first transaction for this salary claim.",
      };
    }

    if (waitingForProof) {
      return {
        eyebrow: "Claim",
        title: "Preparing your claim securely",
        description:
          "This can take a few moments. Zalary will update this page automatically.",
      };
    }

    if (finalizePending || claimStatus === "finalize_broadcasted") {
      return {
        eyebrow: "Claim",
        title: "Completing claim",
        description:
          "Your final claim transaction has been submitted. Zalary is confirming the result.",
      };
    }

    if (claimFinalized && !withdrawFinalized) {
      return {
        eyebrow: "Withdrawal",
        title: "Ready to withdraw",
        description:
          "Your salary has been claimed into your private balance and is ready to withdraw.",
      };
    }

    if (withdrawPending || isWithdrawMoving(withdrawStatus)) {
      return {
        eyebrow: "Withdrawal",
        title: "Withdrawing",
        description:
          "Zalary is finalizing your payout to your connected wallet. This page will update automatically.",
      };
    }

    if (withdrawFinalized) {
      return {
        eyebrow: "Complete",
        title: "Withdrawal completed",
        description: "Your salary has been sent to your wallet.",
      };
    }

    if (proofReady) {
      return {
        eyebrow: "Claim",
        title: "Complete claim",
        description:
          "Your claim is ready. Complete the final wallet confirmation to receive your salary.",
      };
    }

    return {
      eyebrow: "Claim",
      title: "Request private claim",
      description: "Start your secure salary claim.",
    };
  })();

  const wizardSteps = resolveWizardSteps({
    claimStatus,
    proofReady,
    waitingForProof,
    claimFinalized,
    withdrawFinalized,
    requestPending,
    finalizePending,
    withdrawPending,
  });

  const claimTabs: {
    id: ClaimDetailTab;
    label: string;
    caption: string;
    status: string;
  }[] = [
    {
      id: "overview",
      label: "Progress",
      caption: userClaimStatus,
      status: "01",
    },
    {
      id: "transactions",
      label: "Activity",
      caption: hasTxLinks ? "Transaction history" : "No activity yet",
      status: "02",
    },
    {
      id: "details",
      label: "Receipt",
      caption: claimFinalized ? "Claimed / Withdrawn" : userWithdrawStatus,
      status: "03",
    },
  ];

  async function handleRequestClaim() {
    try {
      if (!wallet) {
        connect();
        throw new Error("Connect your wallet before requesting this claim.");
      }

      if (!payrollId) {
        throw new Error("Payroll ID is missing.");
      }

      let targetClaimId = currentClaimId;

      if (!targetClaimId) {
        if (!runId) {
          throw new Error("Run ID is missing.");
        }

        const created = await createClaim.mutateAsync({
          run: Number(runId),
          employee_address: wallet,
        });

        targetClaimId = String(created.id);
        setCurrentClaimId(targetClaimId);
        replaceUrl(targetClaimId, currentWithdrawId);
      }

      await requestClaim.mutateAsync({
        claimId: targetClaimId,
        payrollId,
      });

      await claimQuery.refetch();
      await claimablesQuery.refetch();

      toast.push({
        kind: "success",
        title: "Claim request submitted",
        message:
          "Your claim has been submitted. Zalary will update the page automatically.",
      });
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Request failed",
        message: getErrorMessage(error),
      });
    }
  }

  async function handleCompleteClaim() {
    try {
      if (!wallet) {
        connect();
        throw new Error("Connect your wallet before completing this claim.");
      }

      if (!payrollId) {
        throw new Error("Payroll ID is missing.");
      }

      if (!currentClaim) {
        throw new Error("Claim record is missing.");
      }

      if (!claimProofReady(currentClaim)) {
        throw new Error("Your claim is not ready yet.");
      }

      const normalizedClaim: ClaimRecord = {
        ...currentClaim,
        pending_request_id: getClaimRequestId(currentClaim),
      };

      await finalizeClaim.mutateAsync({
        payrollId,
        claim: normalizedClaim,
      });

      await claimQuery.refetch();
      await claimablesQuery.refetch();

      toast.push({
        kind: "success",
        title: "Claim finalizing",
        message:
          "Your final claim transaction has been submitted. Zalary will update the page automatically.",
      });
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Completion failed",
        message: getErrorMessage(error),
      });
    }
  }

  async function handleWithdrawToWallet() {
    try {
      const result = await oneClickWithdraw.withdrawToWallet();
      const nextWithdrawId = Number(result.id);

      setLocalWithdrawId(nextWithdrawId);
      setLocalWithdrawKey(result.withdraw_key ?? null);
      replaceUrl(undefined, nextWithdrawId);

      await claimQuery.refetch();
      await withdrawQuery.refetch();
      await claimablesQuery.refetch();

      toast.push({
        kind: "success",
        title: "Withdrawal submitted",
        message:
          "Your withdrawal has been submitted. Zalary will update the page automatically.",
      });
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Withdrawal failed",
        message: getErrorMessage(error),
      });
    }
  }

  const claimIsCompleting =
    finalizePending || claimStatus === "finalize_broadcasted";
  const claimIsPreparing =
    waitingForProof || Boolean(claimRequestTx) || requestPending;
  const withdrawalBusy =
    withdrawPending || withdrawStateLoading || isWithdrawMoving(withdrawStatus);

  const claimHistoryStatus = claimFinalized
    ? "Claimed"
    : claimIsCompleting || claimFinalizeTx
      ? "Finalizing"
      : claimIsPreparing
        ? "Preparing"
        : "Not started";

  const withdrawHistoryStatus = withdrawFinalized
    ? "Withdrawn"
    : withdrawalBusy || withdrawFinalizeTx || withdrawRequestTx
      ? "Withdrawing"
      : claimFinalized
        ? "Ready"
        : "Locked";

  const claimDotStatus = claimFinalized
    ? "complete"
    : claimHistoryStatus === "Not started"
      ? "idle"
      : "active";

  const withdrawDotStatus = withdrawFinalized
    ? "complete"
    : withdrawHistoryStatus === "Locked"
      ? "idle"
      : withdrawHistoryStatus === "Ready"
        ? "pending"
        : "active";

  const completionNotice = withdrawFinalized && dismissedCompletionNotice !== "withdrawal"
    ? {
        kind: "withdrawal" as const,
        title: "Withdrawal complete",
        message: "Your salary is now in your wallet.",
      }
    : claimFinalized &&
        !withdrawFinalized &&
        dismissedCompletionNotice !== "claim"
      ? {
          kind: "claim" as const,
          title: "Claim complete",
          message: "You can now withdraw your salary.",
      }
    : null;

  const completionDialog = completionNotice ? (
    <div
      className="claim-completion-overlay claim-detail-completion-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-completion-title"
      aria-describedby="claim-completion-message"
    >
      <div className="claim-completion-popover">
        <div className="claim-completion-icon" aria-hidden="true">
          <CircleCheck size={34} strokeWidth={1.8} />
        </div>

        <div className="claim-completion-copy">
          <h2 id="claim-completion-title">{completionNotice.title}</h2>
          <p id="claim-completion-message">{completionNotice.message}</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="claim-completion-action"
          onClick={() => setDismissedCompletionNotice(completionNotice.kind)}
        >
          Close
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="claim-detail-page claim-detail-premium-page dashboard-shell dashboard-shell-employee employer-dashboard-redesign">
      {completionDialog && createPortal(completionDialog, document.body)}

      <div className="template-detail-topbar claim-detail-topbar">
        <button
          type="button"
          className="template-detail-back-link claim-detail-topbar-back"
          onClick={() => nav("/employee/claims")}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          <span>Back</span>
        </button>
      </div>

      <section className="employer-task-hero claim-detail-hero">
        <div className="employer-task-hero-copy claim-detail-hero-copy">
          <h1>Claim Detail</h1>
          <p className="employer-task-hero-subtitle">
            Claim your salary privately, then withdraw it to your connected wallet.
          </p>
        </div>

        <div className="employer-task-hero-metrics claim-detail-hero-metrics" aria-label="Claim summary">
          <div className="employer-task-hero-metric">
            <span>Amount</span>
            <strong>{salaryDisplay}</strong>
          </div>
          <div className="employer-task-hero-metric">
            <span>Status</span>
            <strong>{finalStatusText}</strong>
          </div>
        </div>
      </section>

      <section className="employer-task-card claim-detail-command-panel">
        <div className="claim-detail-command-head">
          <div>
            <h2>Salary Claim</h2>
            <p>Claim and withdraw salary.</p>
          </div>
        </div>

        <div className="claim-detail-premium-meta">
          <div>
            <span>Amount</span>
            <strong>{salaryDisplay}</strong>
          </div>
          <div>
            <span>Reference</span>
            <strong>{currentClaimId ? `CLAIM-${currentClaimId}` : "—"}</strong>
          </div>
          <div>
            <span>Wallet</span>
            <strong>
              {wallet
                ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
                : "Not connected"}
            </strong>
          </div>
        </div>

        {currentError && (
          <p className="text-danger claim-detail-simple-error">
            {getErrorMessage(currentError)}
          </p>
        )}

        {waitingForProof && (
          <div className="claim-detail-simple-note">
            Your claim is being prepared. This page updates automatically.
          </div>
        )}

        <div className="claim-detail-premium-steps">
          <section
            className={`claim-detail-premium-step claim-detail-premium-step-${stepTone(
              wizardSteps[0].status
            )}`}
          >
            <div className="claim-detail-premium-step-copy">
              <span>Step 1</span>
              <h3>Claim salary</h3>
              <span className="claim-detail-premium-pill">
                {wizardSteps[0].status === "Completed" ? (
                  <CheckCircle2 size={13} strokeWidth={2} />
                ) : requestPending || claimIsCompleting || waitingForProof ? (
                  <Loader2
                    className="claim-detail-premium-spinner"
                    size={13}
                    strokeWidth={2}
                  />
                ) : null}
                {stepBadgeText(wizardSteps[0].status)}
              </span>
            </div>

            <div className="claim-detail-premium-action">
              {!wallet && (
                <Button type="button" onClick={connect}>
                  Connect Wallet
                </Button>
              )}

              {wallet && claimFinalized && (
                <Button type="button" variant="secondary" disabled>
                  <CheckCircle2 size={14} strokeWidth={2} />
                  Claim Completed
                </Button>
              )}

              {wallet && canShowRequestButton && (
                <Button
                  type="button"
                  onClick={() => void handleRequestClaim()}
                  disabled={!payrollId || requestPending || claimStateLoading}
                >
                  {requestPending ? "Requesting Claim..." : "Request Claim"}
                </Button>
              )}

              {wallet && canShowCompleteButton && (
                <Button
                  type="button"
                  onClick={() => void handleCompleteClaim()}
                  disabled={!payrollId || finalizePending || claimStateLoading}
                >
                  {finalizePending ? "Completing Claim..." : "Complete Claim"}
                </Button>
              )}

              {wallet &&
                !claimFinalized &&
                !canShowRequestButton &&
                !canShowCompleteButton && (
                  <Button type="button" variant="secondary" disabled>
                    {claimIsCompleting
                      ? "Completing Claim"
                      : claimIsPreparing
                        ? "Preparing Claim"
                        : "Claim Unavailable"}
                  </Button>
                )}
            </div>
          </section>

          <div aria-hidden="true" className="claim-detail-steps-connector">
            <ArrowRight size={18} strokeWidth={1.5} />
          </div>

          <section
            className={`claim-detail-premium-step claim-detail-premium-step-${stepTone(
              wizardSteps[1].status
            )}`}
          >
            <div className="claim-detail-premium-step-copy">
              <span>Step 2</span>
              <h3>Withdraw to wallet</h3>
              <span className="claim-detail-premium-pill">
                {wizardSteps[1].status === "Completed" ? (
                  <CheckCircle2 size={13} strokeWidth={2} />
                ) : withdrawalBusy ? (
                  <Loader2
                    className="claim-detail-premium-spinner"
                    size={13}
                    strokeWidth={2}
                  />
                ) : null}
                {stepBadgeText(wizardSteps[1].status)}
              </span>
            </div>

            <div className="claim-detail-premium-action">
              {withdrawFinalized && (
                <Button type="button" variant="secondary" disabled>
                  <CheckCircle2 size={14} strokeWidth={2} />
                  Withdrawal Complete
                </Button>
              )}

              {!withdrawFinalized && !claimFinalized && (
                <Button type="button" variant="secondary" disabled>
                  Complete Claim First
                </Button>
              )}

              {!withdrawFinalized && claimFinalized && (
                <Button
                  type="button"
                  onClick={() => void handleWithdrawToWallet()}
                  disabled={!wallet || !currentClaimId || withdrawalBusy}
                >
                  {withdrawalBusy ? "Withdrawing..." : "Withdraw"}
                </Button>
              )}
            </div>
          </section>
        </div>

        <div className="claim-detail-premium-activity">
          <div className="claim-detail-premium-activity-list">
            <div className="claim-detail-premium-activity-table-head" aria-hidden="true">
              <span>Activity</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            <div className="claim-detail-premium-activity-row">
              <span className={`claim-detail-premium-activity-dot claim-detail-premium-activity-dot-${claimDotStatus}`} />
              <span className="claim-detail-premium-activity-name">Claim</span>
              <strong className="claim-detail-premium-activity-status">{claimHistoryStatus}</strong>
              {claimFinalizeTx || claimRequestTx ? (
                <a
                  href={txUrl(claimFinalizeTx || claimRequestTx)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="claim-detail-action-label-desktop">
                    View transaction
                  </span>
                  <span className="claim-detail-action-label-mobile">View</span>
                  <ArrowRight size={15} strokeWidth={2} />
                </a>
              ) : (
                <small>No transaction yet</small>
              )}
            </div>

            <div className="claim-detail-premium-activity-row">
              <span className={`claim-detail-premium-activity-dot claim-detail-premium-activity-dot-${withdrawDotStatus}`} />
              <span className="claim-detail-premium-activity-name">Withdrawal</span>
              <strong className="claim-detail-premium-activity-status">{withdrawHistoryStatus}</strong>
              {withdrawFinalizeTx || withdrawRequestTx ? (
                <a
                  href={txUrl(withdrawFinalizeTx || withdrawRequestTx)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="claim-detail-action-label-desktop">
                    View transaction
                  </span>
                  <span className="claim-detail-action-label-mobile">View</span>
                  <ArrowRight size={15} strokeWidth={2} />
                </a>
              ) : (
                <small>No transaction yet</small>
              )}
            </div>

            {claimCancelTx && (
              <div className="claim-detail-premium-activity-row">
                <span className="claim-detail-premium-activity-dot claim-detail-premium-activity-dot-complete" />
                <span className="claim-detail-premium-activity-name">Claim cancellation</span>
                <strong className="claim-detail-premium-activity-status">Submitted</strong>
                <a href={txUrl(claimCancelTx)} target="_blank" rel="noreferrer">
                  <span className="claim-detail-action-label-desktop">
                    View transaction
                  </span>
                  <span className="claim-detail-action-label-mobile">View</span>
                  <ArrowRight size={15} strokeWidth={2} />
                </a>
              </div>
            )}

            {withdrawCancelTx && (
              <div className="claim-detail-premium-activity-row">
                <span className="claim-detail-premium-activity-dot claim-detail-premium-activity-dot-complete" />
                <span className="claim-detail-premium-activity-name">Withdrawal cancellation</span>
                <strong className="claim-detail-premium-activity-status">Submitted</strong>
                <a href={txUrl(withdrawCancelTx)} target="_blank" rel="noreferrer">
                  <span className="claim-detail-action-label-desktop">
                    View transaction
                  </span>
                  <span className="claim-detail-action-label-mobile">View</span>
                  <ArrowRight size={15} strokeWidth={2} />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="claim-detail-page dashboard-shell dashboard-shell-employee">
      <div className="page-header claim-detail-header">
        <div>
          <p className="page-header-eyebrow">Employee claim</p>
          <h1>Private salary claim</h1>
          <p>
            Claim your confidential payroll payout, then withdraw it to your
            connected wallet.
          </p>
        </div>

        <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <Button type="button" onClick={() => nav("/employee/claims")}>
            Back to Claims
          </Button>
        </div>
      </div>

      <Card
        className="claim-detail-card claim-detail-product-card"
        title={flowCopy.title}
        subtitle={flowCopy.description}
        actions={<span className="page-header-eyebrow">{flowCopy.eyebrow}</span>}
      >
        <div className="grid2" style={{ gap: 0 }}>
          <div className="review-row">
            <span>Payment status</span>
            <strong>{finalStatusText}</strong>
          </div>

          <div className="review-row">
            <span>Amount</span>
            <strong>{salaryDisplay}</strong>
          </div>

          <div className="review-row">
            <span>Wallet</span>
            <strong>
              {wallet ? (
                <AddressPill value={wallet} />
              ) : (
                <span className="muted">Not connected</span>
              )}
            </strong>
          </div>

          <div className="review-row">
            <span>Next step</span>
            <strong>{nextStepText}</strong>
          </div>
        </div>

        {currentError && (
          <p
            className="text-danger"
            style={{ marginTop: "0.875rem", fontSize: "0.82rem" }}
          >
            {getErrorMessage(currentError)}
          </p>
        )}

        <div
          className="claim-wizard-list"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.875rem",
            marginTop: "1.25rem",
          }}
        >
          {wizardSteps.map((step) => (
            <ProgressCard
              key={step.number}
              title={`${step.number} ${step.title}`}
              description={step.body}
              status={step.status}
            />
          ))}
        </div>

        {waitingForProof && (
          <div className="success-box" style={{ marginTop: "1.25rem" }}>
            <strong>Preparing your claim securely.</strong>
            <p style={{ margin: "0.35rem 0 0" }}>
              This can take a few moments. Zalary will update this page
              automatically.
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginTop: "1.25rem",
          }}
        >
          {!wallet && (
            <Button type="button" onClick={connect}>
              Connect Wallet
            </Button>
          )}

          {canShowRequestButton && (
            <Button
              type="button"
              onClick={() => void handleRequestClaim()}
              disabled={!wallet || !payrollId || requestPending || claimStateLoading}
            >
              {requestPending ? "Requesting claim..." : "Request Claim"}
            </Button>
          )}

          {canShowCompleteButton && (
            <Button
              type="button"
              onClick={() => void handleCompleteClaim()}
              disabled={!wallet || !payrollId || finalizePending || claimStateLoading}
            >
              {finalizePending ? "Completing claim..." : "Complete Claim"}
            </Button>
          )}

          {canShowWithdrawButton && (
            <Button
              type="button"
              onClick={() => void handleWithdrawToWallet()}
              disabled={
                !wallet ||
                !currentClaimId ||
                withdrawPending ||
                withdrawStateLoading
              }
            >
              {withdrawPending || withdrawStateLoading
                ? "Withdrawing..."
                : "Withdraw"}
            </Button>
          )}
        </div>
      </Card>

      <div className="account-tabs-shell claim-detail-tabs-shell">
        <div
          className="account-tabs-menu claim-detail-tabs-menu"
          role="tablist"
          aria-label="Claim detail sections"
        >
          {claimTabs.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`account-tab-button claim-detail-tab-button${
                  active ? " active" : ""
                }`}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.status}</span>
                <strong>{tab.label}</strong>
                <small>{tab.caption.replace(/_/g, " ")}</small>
              </button>
            );
          })}
        </div>

        <div className="account-tab-panel claim-detail-tab-panel" role="tabpanel">
          {activeTab === "overview" && (
            <Card
              className="account-tab-card claim-detail-card claim-detail-overview-card"
              title="Claim progress"
              subtitle="A clear view of your claim and withdrawal status."
            >
              <div
                style={{
                  padding: "1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background: "var(--card)",
                  marginBottom: "1rem",
                }}
              >
                <p
                  className="page-header-eyebrow"
                  style={{ marginBottom: "0.35rem" }}
                >
                  Current status
                </p>
                <h3 style={{ margin: 0 }}>{finalStatusText}</h3>
                <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                  {withdrawFinalized
                    ? "Your salary has been withdrawn to your connected wallet."
                    : claimFinalized
                      ? "Your salary has been claimed and is ready for withdrawal."
                      : waitingForProof
                        ? "Your claim is being prepared securely. This page will update automatically."
                        : canShowCompleteButton
                          ? "Your claim is ready. Complete the final wallet confirmation."
                          : "Start the secure claim process to receive your salary."}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "0.875rem",
                }}
              >
                {wizardSteps.map((step) => (
                  <ProgressCard
                    key={step.number}
                    title={`${step.number} ${step.title}`}
                    description={step.body}
                    status={step.status}
                  />
                ))}
              </div>

              <div
                className="success-box"
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>Next step</strong>
                  <p style={{ margin: "0.35rem 0 0" }}>{nextStepText}</p>
                </div>

                <div>
                  <strong>Support reference</strong>
                  <p
                    style={{
                      margin: "0.35rem 0 0",
                      fontFamily: "var(--z-mono)",
                    }}
                  >
                    {currentClaimId ? `CLAIM-${currentClaimId}` : "—"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "transactions" && (
            <Card
              className="account-tab-card claim-detail-card"
              title="Claim activity"
              subtitle="A simple timeline of your claim and withdrawal actions."
            >
              <div style={{ display: "grid", gap: "0.875rem" }}>
                <ActivityItem
                  title="Claim"
                  description={
                    claimFinalized
                      ? "Your salary has been claimed into your private Zalary balance."
                      : claimFinalizeTx
                        ? "Your final claim confirmation has been submitted."
                        : claimRequestTx
                          ? "Your claim request has been submitted and is being prepared."
                          : "Start the secure claim process."
                  }
                  status={
                    claimFinalized
                      ? "Completed"
                      : finalizePending || claimStatus === "finalize_broadcasted"
                        ? "Waiting"
                        : proofReady
                          ? "In progress"
                          : waitingForProof || claimRequestTx
                            ? "Waiting"
                            : canShowRequestButton
                              ? "In progress"
                              : "Locked"
                  }
                  txHash={claimFinalizeTx || claimRequestTx}
                />

                <ActivityItem
                  title="Withdrawal"
                  description={
                    withdrawFinalized
                      ? "Your payout has been withdrawn to your wallet."
                      : withdrawFinalizeTx || withdrawRequestTx
                        ? "Your withdrawal transaction has been submitted."
                        : claimFinalized
                          ? "Your claimed salary is ready to withdraw."
                          : "Withdrawal becomes available after claim completion."
                  }
                  status={
                    withdrawFinalized
                      ? "Completed"
                      : withdrawPending || isWithdrawMoving(withdrawStatus)
                        ? "Waiting"
                        : claimFinalized
                          ? "In progress"
                          : "Locked"
                  }
                  txHash={withdrawFinalizeTx || withdrawRequestTx}
                />

                {claimCancelTx && (
                  <ActivityItem
                    title="Claim cancellation"
                    description="A claim cancellation transaction was submitted."
                    status="Completed"
                    txHash={claimCancelTx}
                  />
                )}

                {withdrawCancelTx && (
                  <ActivityItem
                    title="Withdrawal cancellation"
                    description="A withdrawal cancellation transaction was submitted."
                    status="Completed"
                    txHash={withdrawCancelTx}
                  />
                )}
              </div>
            </Card>
          )}

          {activeTab === "details" && (
            <Card
              className="account-tab-card claim-detail-card"
              title="Payment receipt"
              subtitle="A clean summary of your private salary claim."
            >
              <div
                style={{
                  padding: "1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background: "var(--card)",
                  marginBottom: "1rem",
                }}
              >
                <p
                  className="page-header-eyebrow"
                  style={{ marginBottom: "0.35rem" }}
                >
                  Receipt status
                </p>
                <h3 style={{ margin: 0 }}>{finalStatusText}</h3>
                <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                  {withdrawFinalized
                    ? "Your payout has been sent to your wallet."
                    : claimFinalized
                      ? "Your salary is now in your private Zalary balance."
                      : "Your receipt will complete as the claim flow progresses."}
                </p>
              </div>

              <div className="grid2" style={{ gap: 0 }}>
                <div className="review-row">
                  <span>Status</span>
                  <strong>{finalStatusText}</strong>
                </div>

                <div className="review-row">
                  <span>Amount</span>
                  <strong>{salaryDisplay}</strong>
                </div>

                <div className="review-row">
                  <span>Paid to</span>
                  <strong>
                    {wallet ? <AddressPill value={wallet} /> : "Not connected"}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Reference</span>
                  <strong
                    style={{
                      fontFamily: "var(--z-mono)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {currentClaimId ? `CLAIM-${currentClaimId}` : "—"}
                  </strong>
                </div>
              </div>

              <details style={{ marginTop: "1.25rem" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    fontSize: "0.85rem",
                  }}
                >
                  Advanced support details
                </summary>

                <div className="grid2" style={{ gap: 0, marginTop: "0.875rem" }}>
                  <div className="review-row">
                    <span>Payroll reference</span>
                    <strong
                      style={{
                        fontFamily: "var(--z-mono)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {payrollId || "—"}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Claim reference</span>
                    <strong
                      style={{
                        fontFamily: "var(--z-mono)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {currentClaimId || "—"}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Withdrawal reference</span>
                    <strong
                      style={{
                        fontFamily: "var(--z-mono)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {currentWithdrawId || "—"}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Private payout reference</span>
                    <strong
                      style={{
                        fontFamily: "var(--z-mono)",
                        fontSize: "0.74rem",
                        wordBreak: "break-all",
                      }}
                    >
                      {currentWithdrawKey || "—"}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Claim request</span>
                    <strong
                      style={{
                        fontFamily: "var(--z-mono)",
                        fontSize: "0.74rem",
                        wordBreak: "break-all",
                      }}
                    >
                      {getClaimRequestId(currentClaim) || "—"}
                    </strong>
                  </div>
                </div>
              </details>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
