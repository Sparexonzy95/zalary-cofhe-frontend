import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  ListChecks,
  Lock,
  Loader2,
  PlayCircle,
  Plus,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, useToast } from "../../components/ui";
import {
  useActivatePayroll,
  useCreateOnchainPayroll,
  useFinalizeAllocations,
  useFundPayroll,
  useRun,
  useRunAllocations,
  useRunFundingQuote,
  useUploadAllocations,
} from "../../hooks/useRuns";
import { useTemplate } from "../../hooks/useTemplates";
import { formatAtomicToDisplay } from "../../lib/utils";

const WAITING_STATUSES = new Set([
  "create_broadcasted",
  "alloc_uploading",
  "alloc_finalizing",
  "funding",
  "activating",
]);
const CONFIRMATION_REFRESH_MS = 2500;
const ACTIVATION_STALE_MS = 90_000;

const CREATE_DONE_STATUSES = new Set([
  "created",
  "alloc_uploading",
  "alloc_uploaded",
  "alloc_finalizing",
  "alloc_finalized",
  "funding",
  "funded",
  "activating",
  "active",
  "closed",
  "completed",
  "finalized_success",
]);

const UPLOAD_DONE_STATUSES = new Set([
  "alloc_uploaded",
  "alloc_finalizing",
  "alloc_finalized",
  "funding",
  "funded",
  "activating",
  "active",
  "closed",
  "completed",
  "finalized_success",
]);

const FINALIZE_DONE_STATUSES = new Set([
  "alloc_finalized",
  "funding",
  "funded",
  "activating",
  "active",
  "closed",
  "completed",
  "finalized_success",
]);

const FUND_DONE_STATUSES = new Set([
  "funded",
  "activating",
  "active",
  "closed",
  "completed",
  "finalized_success",
]);

const ACTIVATE_DONE_STATUSES = new Set([
  "active",
  "closed",
  "completed",
  "finalized_success",
]);

function normalizedStatus(value?: string | null) {
  return String(value ?? "").toLowerCase();
}

function safeDate(value?: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function formatUsdc(value?: string | number | bigint | null) {
  if (value == null || value === "") return "Not set";

  try {
    return `${formatAtomicToDisplay(value, 6)} USDC`;
  } catch {
    return `${String(value)} USDC`;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null) {
    const possible = error as {
      message?: unknown;
      shortMessage?: unknown;
      details?: unknown;
      detail?: unknown;
      response?: {
        data?: {
          detail?: unknown;
          error?: unknown;
          message?: unknown;
        };
      };
    };

    return String(
      possible.response?.data?.detail ??
        possible.response?.data?.error ??
        possible.response?.data?.message ??
        possible.shortMessage ??
        possible.details ??
        possible.detail ??
        possible.message ??
        "Please try again."
    );
  }

  return "Please try again.";
}

function isValidAddress(value?: string | null) {
  const address = String(value ?? "").trim();
  return address.startsWith("0x") && address.length === 42;
}

function isPositiveInteger(value?: string | number | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isFutureDeadline(value?: string | number | null) {
  try {
    const deadline = BigInt(String(value ?? "0"));
    const now = BigInt(Math.floor(Date.now() / 1000));
    return deadline > now;
  } catch {
    return false;
  }
}

function templateTitle(template?: {
  title?: string | null;
  payroll_name?: string | null;
  payroll_title?: string | null;
  template_title?: string | null;
} | null) {
  return (
    template?.payroll_name ||
    template?.payroll_title ||
    template?.template_title ||
    template?.title ||
    "Payroll run"
  );
}

function runStatusLabel(status: string) {
  if (status === "scheduled") return "Scheduled";
  if (status === "create_broadcasted") return "Creating payroll";
  if (status === "created") return "Ready to upload";
  if (status === "alloc_uploading") return "Uploading salaries";
  if (status === "alloc_uploaded") return "Ready to lock";
  if (status === "alloc_finalizing") return "Locking salaries";
  if (status === "alloc_finalized") return "Ready to fund";
  if (status === "funding") return "Funding payroll";
  if (status === "funded") return "Ready to activate";
  if (status === "activating") return "Activating payroll";
  if (status === "active") return "Active";
  if (status === "closed" || status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "failed") return "Needs attention";
  return status ? status.replace(/_/g, " ") : "Loading";
}

function stageState(done: boolean, pending: boolean, available: boolean) {
  if (done) return "Complete";
  if (pending) return "Confirming";
  if (available) return "Ready";
  return "Waiting";
}

function stageTone(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function pendingFeedback(step: string, stale = false) {
  if (step === "create") {
    return {
      title: "Confirming payroll creation",
      description:
        "The transaction has been sent. Waiting for the payroll contract to confirm it.",
      label: "Create payroll",
    };
  }

  if (step === "upload") {
    return {
      title: "Confirming salary upload",
      description:
        "Encrypted salary allocations are being confirmed on-chain.",
      label: "Upload salaries",
    };
  }

  if (step === "finalize") {
    return {
      title: "Confirming salary lock",
      description:
        "The salary list is being locked before funding can begin.",
      label: "Lock salaries",
    };
  }

  if (step === "fund") {
    return {
      title: "Confirming payroll funding",
      description:
        "The funding transaction is being confirmed for this payroll run.",
      label: "Fund payroll",
    };
  }

  if (stale) {
    return {
      title: "Activation is taking longer than expected",
      description:
        "The chain or backend may still be catching up. Keep this page open, or refresh the status below.",
      label: "Activation check",
    };
  }

  return {
    title: "Confirming payroll activation",
    description:
      "The payroll is being opened for employee claims.",
    label: "Activate payroll",
  };
}

function stageDescription(value: string, readyText: string) {
  if (value === "Complete") return "Confirmed";
  if (value === "Confirming") return "Confirming on-chain";
  if (value === "Ready") return readyText;
  return "Awaiting previous step";
}

export function RunDetailPage() {
  const { runId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [activationPendingSince, setActivationPendingSince] =
    useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dismissedActivationNotice, setDismissedActivationNotice] =
    useState(false);

  const runQuery = useRun(runId);
  const run = runQuery.data;

  const templateQuery = useTemplate(run ? String(run.template) : undefined);
  const template = templateQuery.data;

  const quoteQuery = useRunFundingQuote(runId);
  const allocationsQuery = useRunAllocations(runId);

  const createOnchainMutation = useCreateOnchainPayroll(runId);
  const uploadMutation = useUploadAllocations(runId);
  const finalizeMutation = useFinalizeAllocations(runId);
  const fundMutation = useFundPayroll(runId);
  const activateMutation = useActivatePayroll(runId);

  const refetchRunRef = useRef(runQuery.refetch);
  const refetchQuoteRef = useRef(quoteQuery.refetch);
  const refetchAllocRef = useRef(allocationsQuery.refetch);
  const refetchTemplateRef = useRef(templateQuery.refetch);
  const refetchDataRef = useRef<() => Promise<void>>(async () => {});

  refetchRunRef.current = runQuery.refetch;
  refetchQuoteRef.current = quoteQuery.refetch;
  refetchAllocRef.current = allocationsQuery.refetch;
  refetchTemplateRef.current = templateQuery.refetch;

  const employees = useMemo(() => template?.employees ?? [], [template?.employees]);
  const status = normalizedStatus(run?.status);
  const onchainReady = Boolean(run?.onchain_payroll_id);
  const waitingForConfirmation = WAITING_STATUSES.has(status);

  const createDone = CREATE_DONE_STATUSES.has(status);
  const uploadDone = UPLOAD_DONE_STATUSES.has(status);
  const finalizeDone = FINALIZE_DONE_STATUSES.has(status);
  const fundDone = FUND_DONE_STATUSES.has(status);
  const activateDone = ACTIVATE_DONE_STATUSES.has(status);

  const canCreateStatus = status === "scheduled" || status === "failed";

  const createBlockedReason = (() => {
    if (!canCreateStatus) return "";

    if (!template) {
      return "Template is still loading.";
    }

    if (!isValidAddress(template.token_address)) {
      return "Payroll token address is missing or invalid.";
    }

    if (!isPositiveInteger(run?.employee_count_u32)) {
      return "This payroll run has no active employees.";
    }

    if (!isFutureDeadline(run?.deadline_u64)) {
      return "Payroll deadline is missing or already in the past. Create a fresh run with a future deadline.";
    }

    return "";
  })();

  const canCreate = canCreateStatus && !createBlockedReason;
  const canUpload = status === "created";
  const canFinalize = status === "alloc_uploaded";
  const canFund = status === "alloc_finalized";
  const canActivate = status === "funded";

  const createPending =
    createOnchainMutation.isPending || status === "create_broadcasted";
  const uploadPending =
    uploadMutation.isPending || status === "alloc_uploading";
  const finalizePending =
    finalizeMutation.isPending || status === "alloc_finalizing";
  const fundPending =
    fundMutation.isPending || status === "funding";
  const activatePending =
    activateMutation.isPending || status === "activating";
  const activationElapsedMs = activationPendingSince
    ? nowMs - activationPendingSince
    : 0;
  const activationTakingLong =
    activatePending && activationElapsedMs >= ACTIVATION_STALE_MS;
  const anyPending =
    createPending ||
    uploadPending ||
    finalizePending ||
    fundPending ||
    activatePending;
  const pendingStep =
    createPending
      ? "create"
      : uploadPending
        ? "upload"
        : finalizePending
          ? "finalize"
          : fundPending
            ? "fund"
            : activatePending
              ? "activate"
              : "";
  const pendingState = pendingStep
    ? pendingFeedback(pendingStep, activationTakingLong)
    : null;

  const totalPayroll = formatUsdc(
    quoteQuery.data?.required_total_atomic ?? run?.required_total_atomic
  );

  const employeeCount =
    quoteQuery.data?.employee_count ??
    run?.employee_count_u32 ??
    employees.length ??
    allocationsQuery.data?.length ??
    0;

  const runStatusText = runStatusLabel(status);
  const runTitle = templateTitle(template);

  const summaryTiles = [
    {
      label: "Employees",
      value: String(employeeCount),
      icon: <Users size={16} strokeWidth={1.7} />,
    },
    {
      label: "Total payroll",
      value: totalPayroll,
      icon: <DollarSign size={16} strokeWidth={1.7} />,
    },
    {
      label: "Run date",
      value: safeDate(run?.run_at),
      icon: <CalendarDays size={16} strokeWidth={1.7} />,
    },
    {
      label: "Status",
      value: runStatusText,
      icon: <Clock3 size={16} strokeWidth={1.7} />,
      tone:
        waitingForConfirmation || canUpload || canFinalize || canFund || canActivate
          ? "accent"
          : status,
    },
  ];

  const runHeroMetrics = [
    {
      label: "Payroll total",
      value: totalPayroll,
    },
    {
      label: "Status",
      value: runStatusText,
    },
  ];

  async function refetchRunData() {
    await Promise.allSettled([
      refetchRunRef.current(),
      refetchQuoteRef.current(),
      refetchAllocRef.current(),
      refetchTemplateRef.current(),
    ]);
  }
  refetchDataRef.current = refetchRunData;

  useEffect(() => {
    if (!runId || !waitingForConfirmation) return;

    const intervalId = window.setInterval(() => {
      void refetchDataRef.current();
    }, CONFIRMATION_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [runId, waitingForConfirmation]);

  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden && waitingForConfirmation) {
        void refetchDataRef.current();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [waitingForConfirmation]);

  useEffect(() => {
    if (!activatePending) {
      setActivationPendingSince(null);
      return;
    }

    setActivationPendingSince((current) => current ?? Date.now());
  }, [activatePending]);

  useEffect(() => {
    if (!activatePending) return;

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activatePending]);

  useEffect(() => {
    setDismissedActivationNotice(false);
  }, [runId]);

  async function stepCreateOnchain() {
    if (!run || !template) return;

    if (createBlockedReason) {
      toast.push({
        kind: "error",
        title: "Payroll cannot be created yet",
        message: createBlockedReason,
      });
      return;
    }

    try {
      await createOnchainMutation.mutateAsync({
        tokenAddress: template.token_address as `0x${string}`,
        deadlineU64: run.deadline_u64,
        employeeCount: Number(run.employee_count_u32),
      });

      toast.push({
        kind: "success",
        title: "Payroll creation started",
        message: "This page will update when it is confirmed.",
      });

      await refetchRunData();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not create payroll",
        message: getErrorMessage(error),
      });
    }
  }

  async function stepUploadAllocations() {
    if (!run?.onchain_payroll_id || employees.length === 0) return;

    try {
      await uploadMutation.mutateAsync({
        onchainPayrollId: run.onchain_payroll_id,
        employees,
      });

      toast.push({
        kind: "success",
        title: "Salary upload started",
        message: "This page will update when it is confirmed.",
      });

      await refetchRunData();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not upload salaries",
        message: getErrorMessage(error),
      });
    }
  }

  async function stepFinalize() {
    if (!run?.onchain_payroll_id) return;

    try {
      await finalizeMutation.mutateAsync({
        onchainPayrollId: run.onchain_payroll_id,
      });

      toast.push({
        kind: "success",
        title: "Salary lock started",
        message: "This page will update when it is confirmed.",
      });

      await refetchRunData();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not lock salaries",
        message: getErrorMessage(error),
      });
    }
  }

  async function stepFund() {
    try {
      await fundMutation.mutateAsync();

      toast.push({
        kind: "success",
        title: "Funding started",
        message: "This page will update when it is confirmed.",
      });

      await refetchRunData();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not fund payroll",
        message: getErrorMessage(error),
      });
    }
  }

  async function stepActivate() {
    try {
      await activateMutation.mutateAsync();

      toast.push({
        kind: "success",
        title: "Activation started",
        message: "Employees can claim after activation is confirmed.",
      });

      await refetchRunData();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not activate payroll",
        message: getErrorMessage(error),
      });
    }
  }

  const nextAction = (() => {
    if (!run) {
      return {
        title: runQuery.isError ? "Run unavailable" : "Loading payroll run",
        description: runQuery.isError
          ? "We could not load this payroll run."
          : "Getting the latest payroll run state.",
      };
    }

    if (canCreateStatus) {
      return {
        title: status === "failed" ? "Retry payroll run" : "Create payroll",
        description:
          createBlockedReason ||
          "Start this payroll run so employee salaries can be prepared.",
        button: "Create Payroll",
        busy: "Creating...",
        disabled: Boolean(createBlockedReason) || createPending,
        onClick: stepCreateOnchain,
      };
    }

    if (canUpload) {
      return {
        title: "Upload salaries",
        description: "Prepare the salary list for this payroll run.",
        button: "Upload Salaries",
        busy: "Uploading...",
        disabled: !onchainReady || employees.length === 0 || uploadPending,
        onClick: stepUploadAllocations,
      };
    }

    if (canFinalize) {
      return {
        title: "Lock salaries",
        description: "Confirm the salary list before funding the payroll.",
        button: "Lock Salaries",
        busy: "Locking...",
        disabled: !onchainReady || finalizePending,
        onClick: stepFinalize,
      };
    }

    if (canFund) {
      return {
        title: "Fund payroll",
        description: "Add the required USDC for this payroll run.",
        button: "Fund Payroll",
        busy: "Funding...",
        disabled: !onchainReady || fundPending,
        onClick: stepFund,
      };
    }

    if (canActivate) {
      return {
        title: "Activate payroll",
        description: "Open this payroll run for employee claims.",
        button: "Activate Payroll",
        busy: "Activating...",
        disabled: !onchainReady || activatePending,
        onClick: stepActivate,
      };
    }

    if (waitingForConfirmation) {
      return {
        title: "Confirmation in progress",
        description: "No action is needed right now. This page updates automatically.",
      };
    }

    if (status === "active") {
      return {
        title: "Payroll is active",
        description: "Employees can now claim their salary.",
      };
    }

    if (status === "closed" || status === "completed" || status === "finalized_success") {
      return {
        title: "Payroll completed",
        description: "This payroll run has finished.",
      };
    }

    if (status === "cancelled") {
      return {
        title: "Payroll cancelled",
        description: "This payroll run is no longer active.",
      };
    }

    return {
      title: runStatusLabel(status),
      description: "The latest payroll status is shown below.",
    };
  })();

  const stageRows = [
    {
      step: 1,
      label: "Create payroll",
      value: stageState(createDone, createPending, canCreate),
      icon: <FileText size={18} strokeWidth={1.7} />,
      readyText: "Ready to create",
    },
    {
      step: 2,
      label: "Upload salaries",
      value: stageState(uploadDone, uploadPending, canUpload),
      icon: <Upload size={18} strokeWidth={1.7} />,
      readyText: "Ready to upload",
    },
    {
      step: 3,
      label: "Lock salaries",
      value: stageState(finalizeDone, finalizePending, canFinalize),
      icon: <Lock size={18} strokeWidth={1.7} />,
      readyText: "Ready to lock",
    },
    {
      step: 4,
      label: "Fund payroll",
      value: stageState(fundDone, fundPending, canFund),
      icon: <Wallet size={18} strokeWidth={1.7} />,
      readyText: "Ready to fund",
    },
    {
      step: 5,
      label: "Activate payroll",
      value: stageState(activateDone, activatePending, canActivate),
      icon: <PlayCircle size={18} strokeWidth={1.7} />,
      readyText: "Ready to activate",
    },
  ];
  const completedStageCount = stageRows.filter(
    (stage) => stage.value === "Complete"
  ).length;
  const activeStage =
    stageRows.find((stage) => stage.value === "Confirming") ??
    stageRows.find((stage) => stage.value === "Ready") ??
    stageRows.find((stage) => stage.value !== "Complete") ??
    stageRows[stageRows.length - 1];
  const progressPercent =
    stageRows.length > 1
      ? Math.round(
          (completedStageCount / stageRows.length) * 100
        )
      : 0;

  const backTarget = run?.template
    ? `/employer/templates/${run.template}`
    : "/employer";

  const currentError =
    createOnchainMutation.error ??
    uploadMutation.error ??
    finalizeMutation.error ??
    fundMutation.error ??
    activateMutation.error;

  const activationNotice =
    status === "active" && !dismissedActivationNotice
      ? {
          title: "Payroll is active",
          message: "Employees can now claim their salary.",
        }
      : null;

  const activationDialog = activationNotice ? (
    <div
      className="claim-completion-overlay run-activation-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-activation-title"
      aria-describedby="run-activation-message"
    >
      <div className="claim-completion-popover run-activation-popover">
        <div className="claim-completion-icon" aria-hidden="true">
          <CheckCircle2 size={34} strokeWidth={1.8} />
        </div>

        <div className="claim-completion-copy">
          <h2 id="run-activation-title">{activationNotice.title}</h2>
          <p id="run-activation-message">{activationNotice.message}</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="claim-completion-action"
          onClick={() => setDismissedActivationNotice(true)}
        >
          Close
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="stack run-detail-page dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign">
      {activationDialog && createPortal(activationDialog, document.body)}

      <button
        type="button"
        className="template-detail-back-link run-detail-back-link"
        onClick={() => nav(backTarget)}
      >
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Back</span>
      </button>

      <section className="employer-task-hero run-detail-hero">
        <div className="employer-task-hero-copy run-detail-hero-copy">
          <span className="employer-task-kicker run-detail-hero-kicker">
            Payroll run
          </span>
          <h1>{runTitle}</h1>
          <p className="employer-task-hero-subtitle">
            Track confirmations, funding, and activation for this payroll run.
          </p>
        </div>

        <div className="employer-task-hero-metrics run-detail-hero-metrics">
          {runHeroMetrics.map((metric) => (
            <div key={metric.label} className="employer-task-hero-metric">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="employer-task-card template-detail-command-panel run-detail-command-panel">
        <div className="template-detail-summary-grid run-detail-summary-grid">
          {summaryTiles.map((tile) => (
            <div
              key={tile.label}
              className={`template-detail-summary-item${
                tile.tone ? ` template-detail-summary-item-${tile.tone}` : ""
              }`}
            >
              <span className="template-detail-summary-icon">{tile.icon}</span>
              <div>
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
              </div>
            </div>
          ))}
        </div>

        {runQuery.isLoading && (
          <p className="run-detail-panel-message">Loading payroll run...</p>
        )}

        {runQuery.isError && (
          <p className="text-danger run-detail-panel-error">
            Failed to load payroll run.
          </p>
        )}

        {run?.last_error && (
          <p className="text-danger run-detail-panel-error">
            {run.last_error}
          </p>
        )}

        {currentError && (
          <p className="text-danger run-detail-panel-error">
            {getErrorMessage(currentError)}
          </p>
        )}

        {pendingState && (
          <div
            className={`run-detail-confirmation-card${
              activationTakingLong ? " run-detail-confirmation-card-stale" : ""
            }`}
            aria-live="polite"
          >
            <div className="run-detail-confirmation-loader" aria-hidden="true">
              <span />
              <Loader2 size={22} strokeWidth={2} />
            </div>
            <div className="run-detail-confirmation-copy">
              <span>{pendingState.label}</span>
              <strong>{pendingState.title}</strong>
              <p>{pendingState.description}</p>
            </div>
            <div className="run-detail-confirmation-meta">
              <span>{activationTakingLong ? "Elapsed" : "Auto-refreshing"}</span>
              <strong>
                {activationTakingLong
                  ? formatElapsed(activationElapsedMs)
                  : `${CONFIRMATION_REFRESH_MS / 1000}s`}
              </strong>
              {activationTakingLong && (
                <button type="button" onClick={() => void refetchRunData()}>
                  Refresh status
                </button>
              )}
            </div>
          </div>
        )}

        <div className="template-detail-action-strip run-detail-action-strip">
          <div>
            <strong>{nextAction.title}</strong>
            <span>{nextAction.description}</span>
          </div>

          {"button" in nextAction && nextAction.button && (
            <Button
              type="button"
              className="run-detail-primary-action"
              onClick={() => void nextAction.onClick?.()}
              disabled={nextAction.disabled}
            >
              {anyPending && nextAction.disabled ? (
                <Loader2
                  className="run-detail-button-spinner"
                  size={15}
                  strokeWidth={2}
                />
              ) : (
                <Plus size={15} strokeWidth={2} />
              )}
              <span>
                {nextAction.disabled &&
                anyPending
                  ? nextAction.busy
                  : nextAction.button}
              </span>
            </Button>
          )}
        </div>

        {run && (
          <div className="run-detail-progress-section">
            <div className="template-detail-runs-head run-detail-progress-head">
              <h2>
                <ListChecks size={16} strokeWidth={1.8} />
                Progress
              </h2>
              <span>
                Step {activeStage.step} of {stageRows.length}
              </span>
            </div>

            <div
              className={`run-detail-progress-meter${
                anyPending ? " run-detail-progress-meter-active" : ""
              }`}
              aria-hidden="true"
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="run-detail-stage-table">
              <div className="run-detail-stage-table-head" aria-hidden="true">
                <span>Step</span>
                <span>Task</span>
                <span>Details</span>
                <span>Status</span>
              </div>

              <div className="run-detail-stage-grid">
                {stageRows.map((stage) => {
                  const tone = stageTone(stage.value);
                  const isCurrent = stage.step === activeStage.step;
                  const isLocked = stage.value === "Waiting";

                  return (
                    <div
                      key={stage.label}
                      className={`run-detail-stage-card run-detail-stage-card-${tone}${
                        isCurrent ? " run-detail-stage-card-current" : ""
                      }${isLocked ? " run-detail-stage-card-locked" : ""}`}
                    >
                      <div className="run-detail-stage-index">
                        <span className="run-detail-stage-icon">
                          {stage.value === "Confirming" ? (
                            <Loader2
                              className="run-detail-stage-spinner"
                              size={16}
                              strokeWidth={1.9}
                            />
                          ) : (
                            stage.icon
                          )}
                        </span>
                        <span className="run-detail-stage-step">
                          Step {stage.step}
                        </span>
                      </div>

                      <div className="run-detail-stage-body">
                        <strong>{stage.label}</strong>
                      </div>

                      <small className="run-detail-stage-detail">
                        {stageDescription(stage.value, stage.readyText)}
                      </small>

                      <span
                        className={`run-detail-stage-pill run-detail-stage-pill-${tone}`}
                      >
                        {stage.value === "Complete" && (
                          <CheckCircle2 size={11} strokeWidth={2} />
                        )}
                        {stage.value === "Confirming" && (
                          <Loader2
                            className="run-detail-stage-pill-spinner"
                            size={10}
                            strokeWidth={2}
                          />
                        )}
                        {stage.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
