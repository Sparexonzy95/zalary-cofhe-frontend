import type { PayrollRun, PayrollTemplate } from "./types";

const SUCCESSFUL_COMPLETED_RUN_STATUSES = new Set([
  "closed",
  "completed",
  "finalized_success",
]);

const INTERRUPTED_RUN_STATUSES = new Set(["cancelled", "failed"]);

export function payrollStatusOf(status?: string | null) {
  return String(status ?? "").trim().toLowerCase();
}

function runSortValue(run: PayrollRun) {
  const runDate = new Date(run.run_at ?? "").getTime();
  if (Number.isFinite(runDate)) return runDate;

  return Number(run.id ?? 0);
}

function embeddedTemplateRuns(template?: Partial<PayrollTemplate> | null) {
  const data = template as
    | (Partial<PayrollTemplate> & {
        runs?: PayrollRun[];
        payroll_runs?: PayrollRun[];
        recent_runs?: PayrollRun[];
        latest_run?: PayrollRun | null;
      })
    | null
    | undefined;

  const runs =
    data?.runs ??
    data?.payroll_runs ??
    data?.recent_runs ??
    (data?.latest_run ? [data.latest_run] : []);

  return Array.isArray(runs) ? runs : [];
}

export function effectiveTemplateStatus(
  template?: Partial<PayrollTemplate> | null,
  runs?: PayrollRun[] | null
) {
  const rawStatus = payrollStatusOf(template?.status);

  if (rawStatus !== "completed") {
    return rawStatus || "unknown";
  }

  const allRuns = [...(runs ?? []), ...embeddedTemplateRuns(template)].sort(
    (a, b) => runSortValue(b) - runSortValue(a)
  );

  if (allRuns.length === 0) {
    return "active";
  }

  const latestRunStatus = payrollStatusOf(allRuns[0]?.status);

  if (INTERRUPTED_RUN_STATUSES.has(latestRunStatus)) {
    return latestRunStatus;
  }

  const everyRunCompleted = allRuns.every((run) =>
    SUCCESSFUL_COMPLETED_RUN_STATUSES.has(payrollStatusOf(run.status))
  );

  return everyRunCompleted ? "completed" : "active";
}
