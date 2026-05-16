// src/features/templates/scheduleMapping.ts
//
// Minimal schedule model: frequency + first run + cycles.
// Backend contract (ScheduleConfig) unchanged — we just send:
//   type, start_at, end_at, hour, minute
//   weekday / day_of_month / month_of_year -> null (backend ignores)
//
// The backend's expand_schedule() advances +1 day/week/month from start_at
// and stops at end_at. We compute end_at from cycles so exactly N runs fire.

export type ScheduleType = "instant" | "daily" | "weekly" | "monthly";
export type Frequency = "one_time" | "daily" | "weekly" | "monthly";

export type ScheduleFormState = {
  frequency: Frequency;
  /** Local datetime string from <input type="datetime-local"> — yyyy-mm-ddThh:mm */
  firstRunAt: string;
  /** Number of runs. One-time is always 1. */
  cycles: number;
};

export type FieldErrors = Record<string, string>;

/* ──────────────────────────────────────────────────────────
   DATE HELPERS
   ────────────────────────────────────────────────────────── */

export function defaultFirstRunAt(): string {
  // next round hour in local time, formatted for datetime-local
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function parseLocalDatetime(value: string): Date {
  // "2026-11-18T09:00" → interpreted as LOCAL time by Date constructor
  return new Date(value);
}

/* ──────────────────────────────────────────────────────────
   FREQUENCY MAPPING
   ────────────────────────────────────────────────────────── */

export function mapFrequencyToScheduleType(f: Frequency): ScheduleType {
  if (f === "one_time") return "instant";
  return f;
}

/* ──────────────────────────────────────────────────────────
   CYCLE → end_at
   Backend expand_schedule() steps +1 unit from start, includes cursor if
   cursor <= end. To get exactly N runs we set end = start + (N-1) * step.
   ────────────────────────────────────────────────────────── */

export function computeEndAtFromCycles(
  firstRunAt: string,
  frequency: Frequency,
  cycles: number
): string | null {
  if (!cycles || cycles <= 0) return null;
  if (frequency === "one_time") return parseLocalDatetime(firstRunAt).toISOString();

  const start = parseLocalDatetime(firstRunAt);
  const end = new Date(start);
  const step = cycles - 1;

  if      (frequency === "daily")   end.setDate (end.getDate()  + step);
  else if (frequency === "weekly")  end.setDate (end.getDate()  + 7 * step);
  else if (frequency === "monthly") end.setMonth(end.getMonth() + step);

  return end.toISOString();
}

/* ──────────────────────────────────────────────────────────
   TOTAL RUN COUNT
   ────────────────────────────────────────────────────────── */

export function resolveRunCount(s: ScheduleFormState): number {
  if (s.frequency === "one_time") return 1;
  const c = Number(s.cycles ?? 0);
  return Number.isFinite(c) && c > 0 ? c : 0;
}

/* ──────────────────────────────────────────────────────────
   PAYLOAD BUILDER — POST /api/v1/templates/
   ────────────────────────────────────────────────────────── */

export function buildSchedulePayload(s: ScheduleFormState) {
  const dt = parseLocalDatetime(s.firstRunAt);
  const type = mapFrequencyToScheduleType(s.frequency);

  const payload: Record<string, any> = {
    type,
    start_at: dt.toISOString(),
    hour: dt.getHours(),
    minute: dt.getMinutes(),
    weekday: null,
    day_of_month: null,
    month_of_year: null,
  };

  if (s.frequency !== "one_time") {
    const endAt = computeEndAtFromCycles(s.firstRunAt, s.frequency, Number(s.cycles));
    if (endAt) payload.end_at = endAt;
  } else {
    // one-time: end_at equals start_at so backend emits exactly 1 run
    payload.end_at = dt.toISOString();
  }

  return payload;
}

/* ──────────────────────────────────────────────────────────
   VALIDATION
   ────────────────────────────────────────────────────────── */

export function validateSchedule(s: ScheduleFormState): FieldErrors {
  const e: FieldErrors = {};

  if (!s.firstRunAt) {
    e.firstRunAt = "First run date & time is required.";
  } else {
    const dt = parseLocalDatetime(s.firstRunAt);
    if (Number.isNaN(dt.getTime())) {
      e.firstRunAt = "Invalid date / time.";
    } else if (dt.getTime() < Date.now() - 60_000) {
      e.firstRunAt = "First run must not be in the past.";
    }
  }

  if (s.frequency !== "one_time") {
    const c = Number(s.cycles ?? 0);
    if (!Number.isFinite(c) || c < 1) e.cycles = "Enter at least 1 run.";
    else if (c > 500) e.cycles = "Maximum 500 runs.";
  }

  return e;
}

/* ──────────────────────────────────────────────────────────
   HUMAN-READABLE PREVIEW
   ────────────────────────────────────────────────────────── */

export function schedulePreview(s: ScheduleFormState): string {
  if (!s.firstRunAt) return "Pick a first run date and time.";

  const dt = parseLocalDatetime(s.firstRunAt);
  if (Number.isNaN(dt.getTime())) return "Invalid date / time.";

  const when = dt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (s.frequency === "one_time") {
    return `One-time run on ${when}.`;
  }

  const runs = resolveRunCount(s);
  const cadence =
    s.frequency === "daily"   ? "every day"   :
    s.frequency === "weekly"  ? "every week"  :
    s.frequency === "monthly" ? "every month" : "";

  return `Runs ${cadence} starting ${when}. Total ${runs} run${runs === 1 ? "" : "s"}.`;
}