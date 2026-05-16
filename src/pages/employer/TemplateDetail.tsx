import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  DollarSign,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useActivateTemplate,
  useCreateNextRun,
  useTemplate,
  useTemplatePreviewRuns,
  useTemplateRuns,
} from "../../hooks/useTemplates";
import { Button, Card, StatusBadge, useToast } from "../../components/ui";
import { effectiveTemplateStatus } from "../../lib/payrollStatus";
import { formatAtomicToDisplay } from "../../lib/utils";
import type { PayrollRun, PayrollTemplate } from "../../lib/types";

const TERMINAL_RUN_STATUSES = new Set([
  "closed",
  "cancelled",
  "failed",
  "finalized_success",
  "completed",
]);

function statusOf(status?: string | null) {
  return String(status ?? "").trim().toLowerCase();
}

function isDraft(status?: string | null) {
  return statusOf(status) === "draft";
}

function isActive(status?: string | null) {
  return statusOf(status) === "active";
}

function isCompleted(status?: string | null) {
  return statusOf(status) === "completed";
}

function isPaused(status?: string | null) {
  return statusOf(status) === "paused";
}

function isTerminalRun(status?: string | null) {
  return TERMINAL_RUN_STATUSES.has(statusOf(status));
}

function scheduleTypeLabel(schedule?: PayrollTemplate["schedule"] | null) {
  const type = statusOf(schedule?.type);

  if (!type) return "Not set";
  if (type === "instant") return "Instant";
  if (type === "daily") return "Daily";
  if (type === "weekly") return "Weekly";
  if (type === "monthly") return "Monthly";
  if (type === "yearly") return "Yearly";

  return type.replace(/_/g, " ");
}

function displayStatus(status?: string | null) {
  const value = String(status ?? "").trim();
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function runStatusBadgeValue(status?: string | null) {
  const value = statusOf(status);

  if (value === "closed" || value === "finalized_success") {
    return "completed";
  }

  return value || "unknown";
}

function safeDateTime(value?: string | null, fallback = "Not set") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function safeDate(value?: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function toBigIntSafe(value: unknown) {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(Math.max(0, Math.floor(value)));
    if (typeof value === "string" && value.trim()) return BigInt(value);
  } catch {
    return 0n;
  }

  return 0n;
}

function runSortValue(run: PayrollRun) {
  const runDate = new Date(run.run_at ?? "").getTime();
  if (Number.isFinite(runDate)) return runDate;

  return Number(run.id ?? 0);
}

function getRunId(value: unknown) {
  const run = value as { id?: unknown; run_id?: unknown };
  const id = run?.id ?? run?.run_id;

  return id == null || id === "" ? "" : String(id);
}

function firstPresentDate(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const possible = error as { message?: unknown; detail?: unknown };
    return String(possible.message ?? possible.detail ?? "Unknown error");
  }

  return "Unknown error";
}

type NextAction =
  | {
      title: string;
      description: string;
      buttonLabel?: string;
      kind?: "activate" | "create" | "view";
      runId?: string;
      disabled?: boolean;
    }
  | null;

export function TemplateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const templateQuery = useTemplate(id);
  const previewQuery = useTemplatePreviewRuns(id);
  const runsQuery = useTemplateRuns(id);
  const activateMutation = useActivateTemplate(id);
  const createRunMutation = useCreateNextRun(id);

  const template = templateQuery.data as PayrollTemplate | undefined;
  const preview = previewQuery.data as { next_run_at?: string | null; times?: string[] } | undefined;
  const runs = useMemo(() => {
    const data = (runsQuery.data ?? []) as PayrollRun[];

    return [...data].sort((a, b) => runSortValue(b) - runSortValue(a));
  }, [runsQuery.data]);

  const employees = Array.isArray(template?.employees) ? template.employees : [];
  const employeeCount =
    employees.length ||
    Number(runs[0]?.employee_count_u32 ?? 0) ||
    Number((template as any)?.employee_count_u32 ?? 0);

  const employeeTotalAtomic = employees.reduce((sum, employee) => {
    return sum + toBigIntSafe(employee.amount_atomic);
  }, 0n);
  const totalPayrollAtomic =
    employeeTotalAtomic > 0n
      ? employeeTotalAtomic
      : toBigIntSafe(
          runs[0]?.required_total_atomic ??
            (template as { required_total_atomic?: unknown })?.required_total_atomic
        );

  const schedule = template?.schedule;
  const latestRun = runs[0] ?? null;
  const latestActionableRun = runs.find((run) => !isTerminalRun(run.status)) ?? null;
  const nextRunAt = firstPresentDate(
    template?.next_run_at,
    preview?.next_run_at,
    latestActionableRun?.run_at,
    schedule?.start_at
  );
  const templateStatus = effectiveTemplateStatus(template, runs);
  const templateTitle =
    template?.title ||
    template?.payroll_title ||
    template?.payroll_name ||
    template?.template_title ||
    template?.company_name ||
    template?.employer_company_name ||
    template?.employer?.company_name ||
    `Payroll #${template?.id ?? ""}`;
  const totalPayrollDisplay = `${formatAtomicToDisplay(totalPayrollAtomic, 6)} USDC`;
  const nextRunDisplay = safeDateTime(nextRunAt);
  const templateHeroMetrics = [
    {
      label: "Payroll Volume",
      value: totalPayrollDisplay,
    },
    {
      label: "Next Run",
      value: nextRunDisplay,
    },
  ];

  const summaryTiles = [
    {
      label: "Employees",
      value: String(employeeCount),
      icon: <Users size={16} strokeWidth={1.7} />,
    },
    {
      label: "Total payroll",
      value: totalPayrollDisplay,
      icon: <DollarSign size={16} strokeWidth={1.7} />,
    },
    {
      label: "Schedule",
      value: scheduleTypeLabel(schedule),
      icon: <CalendarDays size={16} strokeWidth={1.7} />,
    },
  ];

  const nextAction: NextAction = (() => {
    if (!template) return null;

    if (isDraft(templateStatus)) {
      return {
        title: "Activate payroll",
        description: "Activate this payroll setup so it can create payroll runs.",
        buttonLabel: "Activate Payroll",
        kind: "activate",
        disabled: activateMutation.isPending,
      };
    }

    if (latestActionableRun) {
      return {
        title: "Continue payroll run",
        description: "A payroll run is already in progress.",
        kind: "view",
        runId: String(latestActionableRun.id),
      };
    }

    if (isCompleted(templateStatus)) {
      return {
        title: "Payroll completed",
        description: "This payroll setup has completed its payroll runs.",
        kind: latestRun ? "view" : undefined,
        runId: latestRun ? String(latestRun.id) : undefined,
      };
    }

    if (isPaused(templateStatus)) {
      return {
        title: "Payroll paused",
        description: "This payroll setup is paused.",
      };
    }

    if (isActive(templateStatus)) {
      return {
        title: "Create payroll run",
        description: "Create the next payroll run from this setup.",
        buttonLabel: "Create Payroll Run",
        kind: "create",
        disabled: createRunMutation.isPending,
      };
    }

    return {
      title: "Payroll setup",
      description: "This payroll setup is not ready for a new action yet.",
      kind: latestRun ? "view" : undefined,
      runId: latestRun ? String(latestRun.id) : undefined,
    };
  })();
  const panelAction =
    nextAction?.kind && nextAction.buttonLabel && nextAction.kind !== "view"
      ? nextAction
      : null;

  async function refetchPage() {
    await Promise.all([
      templateQuery.refetch(),
      previewQuery.refetch(),
      runsQuery.refetch(),
    ]);
  }

  async function activate() {
    try {
      await activateMutation.mutateAsync();
      toast.push({ kind: "success", title: "Payroll activated" });
      await refetchPage();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not activate payroll",
        message: getErrorMessage(error),
      });
    }
  }

  async function createRun() {
    try {
      const run = await createRunMutation.mutateAsync();
      toast.push({ kind: "success", title: "Run created" });

      await refetchPage();

      const runId = getRunId(run);
      if (runId) {
        navigate(`/employer/runs/${runId}`);
      }
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Run creation failed",
        message: getErrorMessage(error),
      });
    }
  }

  function handleNextAction() {
    if (!nextAction?.kind) return;

    if (nextAction.kind === "activate") {
      void activate();
      return;
    }

    if (nextAction.kind === "create") {
      void createRun();
      return;
    }

    if (nextAction.kind === "view" && nextAction.runId) {
      navigate(`/employer/runs/${nextAction.runId}`);
    }
  }

  if (templateQuery.isLoading) {
    return (
      <div className="stack template-detail-page dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign">
        <Card>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p className="muted">Loading payroll...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (templateQuery.isError || !template) {
    return (
      <div className="stack template-detail-page dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign">
        <Card title="Payroll not found">
          <p className="muted">Failed to load this payroll.</p>
          <div className="row" style={{ marginTop: "1rem" }}>
            <Link className="employee-claim-history-link" to="/employer">
              <span>Back</span>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack template-detail-page dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign">
      <div className="template-detail-topbar">
        <Link className="template-detail-back-link" to="/employer">
          <ArrowLeft size={14} strokeWidth={2} />
          <span>Back</span>
        </Link>
      </div>

      <section className="template-detail-hero employer-task-hero" data-tour="template-hero">
        <div className="employer-task-hero-copy template-detail-hero-copy">
          <h1>{templateTitle}</h1>
          <p className="employer-task-hero-subtitle">
            Review payroll details, schedule, and recent runs.
          </p>
        </div>

        <div
          className="employer-task-hero-metrics template-detail-hero-metrics"
          aria-label="Payroll summary"
        >
          {templateHeroMetrics.map((metric) => (
            <div key={metric.label} className="employer-task-hero-metric">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="template-detail-layout">

        {/* ── Main content ── */}
        <main className="template-detail-main">
          <section className="template-detail-command-panel" data-tour="template-setup-card">
            {panelAction && (
              <div className="template-detail-action-strip" data-tour="template-next-action-card">
                <div>
                  <strong>{panelAction.title}</strong>
                  <span>{panelAction.description}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextAction}
                  disabled={Boolean(panelAction.disabled)}
                >
                  {panelAction.disabled ? "Working..." : panelAction.buttonLabel}
                </Button>
              </div>
            )}

            <div className="template-detail-runs-section" data-tour="template-runs-card">
              <div className="template-detail-runs-head">
                <h2>Recent runs</h2>
                <span>
                  {runsQuery.isLoading
                    ? "Loading"
                    : `${runs.length} run${runs.length === 1 ? "" : "s"}`}
                </span>
              </div>

              {runsQuery.isLoading && (
                <p className="muted template-detail-runs-empty">Loading runs...</p>
              )}

              {!runsQuery.isLoading && runs.length === 0 && (
                <p className="muted template-detail-runs-empty">No payroll runs yet.</p>
              )}

              {runs.length > 0 && (
                <div className="template-detail-runs-table-wrap">
                  <table className="template-detail-runs-table">
                    <thead>
                      <tr>
                        <th>Run</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.slice(0, 6).map((run) => (
                        <tr key={run.id}>
                          <td><strong>Run #{run.id}</strong></td>
                          <td>{safeDate(run.run_at)}</td>
                          <td><StatusBadge value={runStatusBadgeValue(run.status)} /></td>
                          <td>
                            <Link
                              className="template-detail-run-link"
                              to={`/employer/runs/${run.id}`}
                            >
                              <span>View</span>
                              <ArrowRight size={14} strokeWidth={2} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ── Sidebar ── */}
        <aside className="template-detail-sidebar">
          <div className="template-detail-sidebar-card">
            <span className="template-detail-sidebar-card-label">Payroll Info</span>
            {summaryTiles.map((tile) => (
              <div key={tile.label} className="template-detail-sidebar-row">
                <span className="template-detail-sidebar-row-icon">{tile.icon}</span>
                <div>
                  <span>{tile.label}</span>
                  <strong>{tile.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>
    </div>
  );
}
