import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  PenLine,
  Repeat2,
  Upload,
  X,
} from "lucide-react";
import {
  useActivateTemplateById,
  useCreateTemplate,
} from "../../hooks/useTemplates";
import { useWallet } from "../../lib/wallet";
import { Card, Button, Field, useToast } from "../../components/ui";
import { env } from "../../lib/env";
import { parseDisplayToAtomic } from "../../lib/utils";
import {
  type Frequency,
  type ScheduleFormState,
  defaultFirstRunAt,
  buildSchedulePayload,
  validateSchedule,
  schedulePreview,
  resolveRunCount,
} from "../../features/templates/scheduleMapping";

type EmployeeRow = {
  address: string;
  name: string;
  email: string;
  amount: string;
};

type PayrollWizardPhase = 0 | 1 | 2;
type RecurringFrequency = Exclude<Frequency, "one_time">;
type RecurringEndMode = "specific_date" | "run_count";

type RecurringDraft = {
  startsOn: string;
  sendTime: string;
  frequency: RecurringFrequency;
  endMode: RecurringEndMode;
  endDate: string;
  runCount: number;
};

const RECURRING_FREQ_OPTIONS: {
  value: RecurringFrequency;
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const PHASE_COPY: Record<PayrollWizardPhase, { nextLabel?: string }> = {
  0: {
    nextLabel: "Continue to Schedule",
  },
  1: {
    nextLabel: "Review Draft",
  },
  2: {},
};

function isValidAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function hasEmployeeInput(row: EmployeeRow) {
  return Boolean(
    row.address.trim() ||
      row.name.trim() ||
      row.email.trim() ||
      row.amount.trim()
  );
}

function emptyEmployeeRow(): EmployeeRow {
  return { address: "", name: "", email: "", amount: "" };
}

function toDateInputValue(value: string) {
  return value ? value.slice(0, 10) : "";
}

function toTimeInputValue(value: string) {
  return value && value.includes("T") ? value.slice(11, 16) : "09:00";
}

function mergeDateAndTime(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "09:00"}`;
}

function addMonthsSafe(date: Date, months: number) {
  const next = new Date(date);
  const originalDate = next.getDate();

  next.setMonth(next.getMonth() + months);

  if (next.getDate() !== originalDate) {
    next.setDate(0);
  }

  return next;
}

function estimateRunCountFromEndDate(
  startDateValue: string,
  endDateValue: string,
  frequency: RecurringFrequency
) {
  const start = new Date(`${startDateValue}T00:00`);
  const end = new Date(`${endDateValue}T23:59`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  if (end.getTime() < start.getTime()) return 1;

  let count = 1;
  let cursor = new Date(start);

  while (count < 500) {
    if (frequency === "daily") cursor.setDate(cursor.getDate() + 1);
    if (frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
    if (frequency === "monthly") cursor = addMonthsSafe(cursor, 1);

    if (cursor.getTime() > end.getTime()) break;
    count += 1;
  }

  return Math.max(1, Math.min(count, 500));
}

function addOneYearDateInput(dateValue: string) {
  const date = new Date(`${dateValue}T00:00`);

  if (Number.isNaN(date.getTime())) return dateValue;

  date.setFullYear(date.getFullYear() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatScheduleDateTime(value: string) {
  if (!value) return "Not selected";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not selected";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value: string) {
  if (!value) return "Not selected";

  const date = new Date(`${value}T00:00`);

  if (Number.isNaN(date.getTime())) return "Not selected";

  return date.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function frequencyLabel(value: Frequency | RecurringFrequency) {
  if (value === "one_time") return "One-time";
  if (value === "daily") return "Daily";
  if (value === "weekly") return "Weekly";
  if (value === "monthly") return "Monthly";
  return value;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseEmployeesCsv(content: string): EmployeeRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one employee row.");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  const addressIndex = headers.findIndex((header) =>
    ["address", "wallet", "wallet_address", "employee_address"].includes(header)
  );

  const nameIndex = headers.findIndex((header) =>
    ["name", "employee_name", "fullname", "full_name"].includes(header)
  );

  const emailIndex = headers.findIndex((header) =>
    ["email", "employee_email", "work_email"].includes(header)
  );

  const amountIndex = headers.findIndex((header) =>
    ["amount", "salary", "amount_usdc", "pay", "pay_amount"].includes(header)
  );

  if (addressIndex === -1 || emailIndex === -1 || amountIndex === -1) {
    throw new Error(
      "CSV headers must include address, email, and amount. Optional header: name."
    );
  }

  return lines
    .slice(1)
    .map(parseCsvLine)
    .map((cells) => ({
      address: cells[addressIndex] ?? "",
      name: nameIndex >= 0 ? cells[nameIndex] ?? "" : "",
      email: cells[emailIndex] ?? "",
      amount: cells[amountIndex] ?? "",
    }))
    .filter(hasEmployeeInput);
}

export function CreateTemplatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { wallet, connect } = useWallet();
  const mutation = useCreateTemplate();
  const activateTemplateMutation = useActivateTemplateById();

  const csvInputRef = React.useRef<HTMLInputElement | null>(null);
  const employeeStackRef = React.useRef<HTMLDivElement | null>(null);

  const [title, setTitle] = React.useState("");
  const defaultRunAt = React.useMemo(() => defaultFirstRunAt(), []);
  const initialScheduleDate = toDateInputValue(defaultRunAt);

  const [schedule, setSchedule] = React.useState<ScheduleFormState>({
    frequency: "one_time",
    firstRunAt: defaultRunAt,
    cycles: 1,
  });

  const [recurringSaved, setRecurringSaved] = React.useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = React.useState(false);
  const [recurringDraft, setRecurringDraft] = React.useState<RecurringDraft>({
    startsOn: initialScheduleDate,
    sendTime: toTimeInputValue(defaultRunAt),
    frequency: "monthly",
    endMode: "specific_date",
    endDate: addOneYearDateInput(initialScheduleDate),
    runCount: 12,
  });

  const [employees, setEmployees] = React.useState<EmployeeRow[]>([
    emptyEmployeeRow(),
  ]);

  const [formError, setFormError] = React.useState("");
  const [scheduleErrors, setScheduleErrors] = React.useState<
    Record<string, string>
  >({});
  const [wizardPhase, setWizardPhase] = React.useState<PayrollWizardPhase>(0);

  const activeEmployees = employees.filter(hasEmployeeInput);

  const perRunTotal = employees.reduce((sum, employee) => {
    const value = Number(String(employee.amount).trim());
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

  const runCount = resolveRunCount(schedule);
  const totalBudget = perRunTotal * runCount;
  const previewText = schedulePreview(schedule);
  const phaseCopy = PHASE_COPY[wizardPhase];

  function setSched(patch: Partial<ScheduleFormState>) {
    setSchedule((current) => ({ ...current, ...patch }));
  }

  function handleSendDateChange(dateValue: string) {
    const currentTime = toTimeInputValue(schedule.firstRunAt);
    const nextFirstRunAt = mergeDateAndTime(dateValue, currentTime);

    setSched({ firstRunAt: nextFirstRunAt });

    setRecurringDraft((current) => ({
      ...current,
      startsOn: dateValue,
      endDate:
        current.endDate && current.endDate >= dateValue
          ? current.endDate
          : addOneYearDateInput(dateValue),
    }));
  }

  function handleSendTimeChange(timeValue: string) {
    const currentDate = toDateInputValue(schedule.firstRunAt);
    const nextFirstRunAt = mergeDateAndTime(currentDate, timeValue);

    setSched({ firstRunAt: nextFirstRunAt });

    setRecurringDraft((current) => ({
      ...current,
      sendTime: timeValue,
    }));
  }

  function openRecurringModal() {
    const currentDate = toDateInputValue(schedule.firstRunAt);
    const currentTime = toTimeInputValue(schedule.firstRunAt);

    setRecurringDraft((current) => ({
      ...current,
      startsOn: current.startsOn || currentDate,
      sendTime: current.sendTime || currentTime,
      frequency:
        schedule.frequency === "one_time"
          ? current.frequency
          : (schedule.frequency as RecurringFrequency),
      runCount: Math.max(1, schedule.cycles || current.runCount || 12),
    }));

    setRecurringModalOpen(true);
  }

  function closeRecurringModal() {
    setRecurringModalOpen(false);
  }

  function turnOffRecurringPayroll() {
    setRecurringSaved(false);
    setRecurringModalOpen(false);

    setSched({
      frequency: "one_time",
      cycles: 1,
    });
  }

  function saveRecurringDetails() {
    const startsOn = recurringDraft.startsOn;
    const sendTime = recurringDraft.sendTime || "09:00";

    if (!startsOn) {
      setFormError("Select the recurring payroll start date.");
      return;
    }

    if (!sendTime) {
      setFormError("Select the payroll send time.");
      return;
    }

    let nextCycles = Number(recurringDraft.runCount || 1);

    if (recurringDraft.endMode === "specific_date") {
      if (!recurringDraft.endDate) {
        setFormError("Select when the recurring payroll should end.");
        return;
      }

      nextCycles = estimateRunCountFromEndDate(
        recurringDraft.startsOn,
        recurringDraft.endDate,
        recurringDraft.frequency
      );
    }

    if (!Number.isFinite(nextCycles) || nextCycles < 1) {
      setFormError("Enter a valid number of payroll runs.");
      return;
    }

    setFormError("");
    setRecurringSaved(true);
    setRecurringModalOpen(false);

    setSchedule({
      frequency: recurringDraft.frequency,
      firstRunAt: mergeDateAndTime(startsOn, sendTime),
      cycles: Math.max(1, Math.min(nextCycles, 500)),
    });
  }

  const sendDate = toDateInputValue(schedule.firstRunAt);
  const sendTime = toTimeInputValue(schedule.firstRunAt);
  const isRecurringPayroll = recurringSaved && schedule.frequency !== "one_time";

  function updateEmployee(index: number, patch: Partial<EmployeeRow>) {
    setEmployees((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  }

  function scrollToEmployeeFields() {
    window.setTimeout(() => {
      employeeStackRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function addEmployeeRow() {
    setEmployees((currentRows) => [...currentRows, emptyEmployeeRow()]);
    scrollToEmployeeFields();
  }

  function removeEmployeeRow(index: number) {
    setEmployees((currentRows) =>
      currentRows.length === 1
        ? currentRows
        : currentRows.filter((_, rowIndex) => rowIndex !== index)
    );
  }

  function triggerCsvUpload() {
    csvInputRef.current?.click();
  }

  function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFormError("Please upload a valid .csv file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const content = String(reader.result ?? "");
        const importedRows = parseEmployeesCsv(content);

        if (importedRows.length === 0) {
          throw new Error("No employees found in the CSV file.");
        }

        setEmployees((currentRows) => {
          const existingRows = currentRows.filter(hasEmployeeInput);

          return existingRows.length === 0
            ? importedRows
            : [...existingRows, ...importedRows];
        });

        setFormError("");

        toast.push({
          kind: "success",
          title: "CSV imported",
          message: `${importedRows.length} employee${
            importedRows.length === 1 ? "" : "s"
          } added from CSV.`,
        });

        scrollToEmployeeFields();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not import CSV file.";

        setFormError(message);

        toast.push({
          kind: "error",
          title: "CSV import failed",
          message,
        });
      }
    };

    reader.onerror = () => {
      setFormError("Could not read the CSV file.");
    };

    reader.readAsText(file);
  }

  function validatePayrollSetup() {
    setFormError("");

    if (!title.trim()) {
      setFormError("Add a payroll title before continuing.");
      return false;
    }

    return true;
  }

  function validatePayrollSchedule() {
    setFormError("");

    const errors = validateSchedule(schedule);
    setScheduleErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError(Object.values(errors)[0]);
      return false;
    }

    return true;
  }

  function validateEmployeeRows() {
    setFormError("");

    if (activeEmployees.length === 0) {
      setFormError("Add at least one employee before continuing.");
      return false;
    }

    for (const row of activeEmployees) {
      const address = row.address.trim();
      const email = row.email.trim();
      const amount = row.amount.trim();

      if (!isValidAddress(address)) {
        setFormError(`Invalid employee wallet address: ${address || "empty"}`);
        return false;
      }

      if (!email) {
        setFormError(`Employee email is required for ${address}.`);
        return false;
      }

      if (!isValidEmail(email)) {
        setFormError(`Invalid employee email: ${email}`);
        return false;
      }

      const atomic = Number(parseDisplayToAtomic(amount, 6));

      if (!Number.isFinite(atomic) || atomic <= 0) {
        setFormError(`Invalid amount for ${address}.`);
        return false;
      }
    }

    const seenAddresses = new Set<string>();

    for (const row of activeEmployees) {
      const address = row.address.trim().toLowerCase();

      if (seenAddresses.has(address)) {
        setFormError(`Duplicate employee wallet address: ${address}`);
        return false;
      }

      seenAddresses.add(address);
    }

    return true;
  }

  function goNextPhase() {
    if (
      wizardPhase === 0 &&
      (!validatePayrollSetup() || !validateEmployeeRows())
    ) {
      return;
    }

    if (wizardPhase === 1 && !validatePayrollSchedule()) return;

    setFormError("");
    setWizardPhase((currentPhase) => (currentPhase === 0 ? 1 : 2));
  }

  function goPreviousPhase() {
    setFormError("");
    setWizardPhase((currentPhase) => (currentPhase === 2 ? 1 : 0));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    try {
      if (!wallet) {
        await connect();

        throw new Error(
          "Wallet connection requested. Click Create again after wallet connects."
        );
      }

      if (!title.trim()) {
        throw new Error("Payroll title is required.");
      }

      const errors = validateSchedule(schedule);
      setScheduleErrors(errors);

      if (Object.keys(errors).length > 0) {
        throw new Error(Object.values(errors)[0]);
      }

      if (activeEmployees.length === 0) {
        throw new Error("Add at least one employee.");
      }

      for (const row of activeEmployees) {
        const address = row.address.trim();
        const email = row.email.trim();
        const amount = row.amount.trim();

        if (!isValidAddress(address)) {
          throw new Error(
            `Invalid employee wallet address: ${address || "empty"}`
          );
        }

        if (!email) {
          throw new Error(`Employee email is required for ${address}.`);
        }

        if (!isValidEmail(email)) {
          throw new Error(`Invalid employee email: ${email}`);
        }

        const atomic = Number(parseDisplayToAtomic(amount, 6));

        if (!Number.isFinite(atomic) || atomic <= 0) {
          throw new Error(`Invalid amount for ${address}.`);
        }
      }

      const seenAddresses = new Set<string>();

      for (const row of activeEmployees) {
        const address = row.address.trim().toLowerCase();

        if (seenAddresses.has(address)) {
          throw new Error(`Duplicate employee wallet address: ${address}`);
        }

        seenAddresses.add(address);
      }

      const payload = {
        chain: env.chainDbId,
        token_address: env.confidentialTokenAddress,
        employer_address: wallet.toLowerCase(),
        title: title.trim(),
        description: "",
        schedule: buildSchedulePayload(schedule),
        employees: activeEmployees.map((employee) => ({
          employee_address: employee.address.trim().toLowerCase(),
          employee_name: employee.name.trim(),
          employee_email: employee.email.trim().toLowerCase(),
          amount_atomic: Number(parseDisplayToAtomic(employee.amount, 6)),
          is_active: true,
        })),
      };

      const created = await mutation.mutateAsync(payload as any);
      const templatePath = `/employer/templates/${created.id}`;

      try {
        await activateTemplateMutation.mutateAsync(created.id);
      } catch (activationError) {
        const message =
          activationError instanceof Error
            ? activationError.message
            : "Unknown error";

        toast.push({
          kind: "error",
          title: "Draft created, activation failed",
          message,
        });

        navigate(templatePath);
        return;
      }

      toast.push({
        kind: "success",
        title: "Payroll activated",
        message: "Your draft was created and activated.",
      });

      navigate(templatePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      setFormError(message);

      toast.push({
        kind: "error",
        title: "Draft creation failed",
        message,
      });
    }
  }

  return (
    <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign create-payroll-page">
      <Link className="template-detail-back-link" to="/employer">
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Back</span>
      </Link>

      <form
        className={`create-payroll-form create-payroll-form-redesigned${
          recurringModalOpen ? " create-payroll-form-modal-open" : ""
        }`}
        data-phase={wizardPhase}
        onSubmit={submit}
      >
        <Card className="create-payroll-card create-payroll-main-card">
          <div className="create-payroll-card-body">
            <div className="create-payroll-step-content">
              <section className="create-payroll-phase create-payroll-details-card">
                <section className="create-payroll-hero">
                  <div className="create-payroll-hero-copy">
                    <span className="create-payroll-hero-eyebrow">Step 1 of 3</span>
                    <h1>
                      Create <span>Payroll</span>
                    </h1>
                  </div>
                </section>

                <div className="create-payroll-basics-grid">
                  <Field label="Payroll title">
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. April core team payroll"
                    />
                  </Field>
                </div>

                <div className="create-payroll-merged-section-head">
                  <div>
                    <h3>Employees Added</h3>
                    <p>
                      {activeEmployees.length} employee
                      {activeEmployees.length === 1 ? "" : "s"} added •{" "}
                      {perRunTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}{" "}
                      USDC per run
                    </p>
                  </div>

                  <div className="create-payroll-employee-actions">
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="create-payroll-csv-input"
                      onChange={handleCsvUpload}
                    />

                    <Button
                      type="button"
                      variant="secondary"
                      className="create-payroll-upload-csv-btn"
                      onClick={triggerCsvUpload}
                    >
                      <Upload size={15} strokeWidth={1.8} />
                      Upload CSV
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      className="create-payroll-add-manual-btn"
                      onClick={addEmployeeRow}
                    >
                      + Add Manually
                    </Button>
                  </div>
                </div>

                <div className="create-payroll-csv-hint">
                  CSV format: <strong>address,name,email,amount</strong>
                </div>

                <div
                  ref={employeeStackRef}
                  className="stack create-payroll-employee-stack"
                >
                  {employees.map((employee, index) => (
                    <div
                      key={index}
                      className="employee-row create-payroll-employee-row"
                    >
                      <div className="create-payroll-employee-row-head">
                        <div className="employee-row-num">
                          Employee {index + 1}
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="create-payroll-remove-employee"
                          onClick={() => removeEmployeeRow(index)}
                          disabled={employees.length === 1}
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="create-payroll-employee-grid">
                        <Field label="Wallet address">
                          <input
                            value={employee.address}
                            onChange={(event) =>
                              updateEmployee(index, {
                                address: event.target.value,
                              })
                            }
                            placeholder="0x742d...f44e"
                          />
                        </Field>

                        <Field label="Name (optional)">
                          <input
                            value={employee.name}
                            onChange={(event) =>
                              updateEmployee(index, {
                                name: event.target.value,
                              })
                            }
                            placeholder="Amara Okafor"
                          />
                        </Field>

                        <Field label="Email">
                          <input
                            type="email"
                            value={employee.email}
                            onChange={(event) =>
                              updateEmployee(index, {
                                email: event.target.value,
                              })
                            }
                            placeholder="amara@company.com"
                          />
                        </Field>

                        <Field label="Amount per run">
                          <input
                            value={employee.amount}
                            onChange={(event) =>
                              updateEmployee(index, {
                                amount: event.target.value,
                              })
                            }
                            placeholder="2500.00"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="create-payroll-phase create-payroll-schedule-card">
                <section className="create-payroll-hero">
                  <div className="create-payroll-hero-copy">
                    <span className="create-payroll-hero-eyebrow">Step 2 of 3</span>
                    <h1>Schedule</h1>
                  </div>
                </section>

                <div className="create-payroll-schedule-redesign">
                  <div className="payroll-type-card">
                    <span className="schedule-card-eyebrow">Payroll type</span>

                    <div className="payroll-type-options">
                      <button
                        type="button"
                        className={`payroll-type-option${!isRecurringPayroll ? " active" : ""}`}
                        onClick={turnOffRecurringPayroll}
                      >
                        <div className="payroll-type-option-icon">
                          <CalendarDays size={15} strokeWidth={1.7} />
                        </div>
                        <span>One-time payroll</span>
                        <span className="payroll-type-radio" />
                      </button>

                      <button
                        type="button"
                        className={`payroll-type-option${isRecurringPayroll ? " active" : ""}`}
                        onClick={openRecurringModal}
                      >
                        <div className="payroll-type-option-icon">
                          <Repeat2 size={15} strokeWidth={1.7} />
                        </div>
                        <span>Recurring payroll</span>
                        <span className="payroll-type-radio" />
                      </button>
                    </div>
                  </div>

                  <div className="payroll-send-card">
                    <span className="schedule-card-eyebrow">
                      {isRecurringPayroll ? "First payroll delivery" : "Payroll delivery"}
                    </span>

                    <div className="payroll-send-grid">
                      <Field label={isRecurringPayroll ? "First send date" : "Send date"}>
                        <input
                          type="date"
                          value={sendDate}
                          onChange={(event) => handleSendDateChange(event.target.value)}
                        />
                      </Field>

                      <Field label="Send time">
                        <input
                          type="time"
                          value={sendTime}
                          onChange={(event) => handleSendTimeChange(event.target.value)}
                        />
                      </Field>
                    </div>

                    {scheduleErrors.firstRunAt && (
                      <p className="text-danger create-payroll-schedule-error">
                        {scheduleErrors.firstRunAt}
                      </p>
                    )}
                  </div>

                  {isRecurringPayroll && (
                    <div className="recurring-payroll-summary">
                      <div className="recurring-payroll-summary-head">
                        <div>
                          <span className="recurring-payroll-badge">Recurring</span>
                          <h5>{frequencyLabel(schedule.frequency)}</h5>
                        </div>

                        <button
                          type="button"
                          className="recurring-payroll-edit-btn"
                          onClick={openRecurringModal}
                        >
                          <PenLine size={14} strokeWidth={1.8} />
                          Edit
                        </button>
                      </div>

                      <div className="recurring-payroll-summary-grid">
                        <div>
                          <span>Starts</span>
                          <strong>{formatDateOnly(recurringDraft.startsOn)}</strong>
                        </div>

                        <div>
                          <span>Time</span>
                          <strong>{recurringDraft.sendTime}</strong>
                        </div>

                        <div>
                          <span>Frequency</span>
                          <strong>{frequencyLabel(recurringDraft.frequency)}</strong>
                        </div>

                        <div>
                          <span>Ends</span>
                          <strong>
                            {recurringDraft.endMode === "specific_date"
                              ? formatDateOnly(recurringDraft.endDate)
                              : `${recurringDraft.runCount} runs`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="create-payroll-schedule-preview">
                    <div>
                      <span>Preview</span>
                      <strong>{previewText}</strong>
                    </div>

                    <div>
                      <span>Runs</span>
                      <strong>{runCount}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {recurringModalOpen && (
                <div
                  className="recurring-modal-overlay"
                  role="presentation"
                  onClick={closeRecurringModal}
                >
                  <div
                    className="recurring-modal-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="recurring-payroll-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="recurring-modal-grabber" />

                    <div className="recurring-modal-header">
                      <div>
                        <span>Recurring payroll</span>
                        <h3 id="recurring-payroll-title">Set schedule</h3>
                      </div>

                      <button
                        type="button"
                        className="recurring-modal-close"
                        onClick={closeRecurringModal}
                        aria-label="Close recurring payroll modal"
                      >
                        <X size={17} strokeWidth={2} />
                      </button>
                    </div>

                    <div className="recurring-modal-form">
                      <div className="recurring-modal-toggle-row">
                        <div>
                          <strong>Recurring payroll</strong>
                          <span>Enabled</span>
                        </div>

                        <button
                          type="button"
                          className="zalary-switch active"
                          aria-pressed="true"
                          aria-label="Turn off recurring payroll"
                          onClick={turnOffRecurringPayroll}
                        >
                          <span />
                        </button>
                      </div>

                      <div className="recurring-modal-row">
                        <label>Starts</label>

                        <div className="recurring-modal-control recurring-modal-date-control">
                          <input
                            type="date"
                            value={recurringDraft.startsOn}
                            onChange={(event) =>
                              setRecurringDraft((current) => ({
                                ...current,
                                startsOn: event.target.value,
                                endDate:
                                  current.endDate && current.endDate >= event.target.value
                                    ? current.endDate
                                    : addOneYearDateInput(event.target.value),
                              }))
                            }
                          />

                          <CalendarDays size={16} strokeWidth={1.7} />
                        </div>
                      </div>

                      <div className="recurring-modal-row">
                        <label>Time</label>

                        <div className="recurring-modal-control recurring-modal-date-control">
                          <input
                            type="time"
                            value={recurringDraft.sendTime}
                            onChange={(event) =>
                              setRecurringDraft((current) => ({
                                ...current,
                                sendTime: event.target.value,
                              }))
                            }
                          />

                          <Clock3 size={16} strokeWidth={1.7} />
                        </div>
                      </div>

                      <div className="recurring-modal-row recurring-modal-row-split">
                        <label>Frequency</label>

                        <div className="recurring-modal-split-controls">
                          <select
                            value={recurringDraft.frequency}
                            onChange={(event) =>
                              setRecurringDraft((current) => ({
                                ...current,
                                frequency: event.target.value as RecurringFrequency,
                              }))
                            }
                          >
                            {RECURRING_FREQ_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={recurringDraft.runCount}
                            onChange={(event) =>
                              setRecurringDraft((current) => ({
                                ...current,
                                runCount: Number(event.target.value),
                                endMode: "run_count",
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="recurring-modal-row">
                        <label>Ends</label>

                        <select
                          value={recurringDraft.endMode}
                          onChange={(event) =>
                            setRecurringDraft((current) => ({
                              ...current,
                              endMode: event.target.value as RecurringEndMode,
                            }))
                          }
                        >
                          <option value="specific_date">Specific date</option>
                          <option value="run_count">After number of runs</option>
                        </select>
                      </div>

                      {recurringDraft.endMode === "specific_date" && (
                        <div className="recurring-modal-sub-row">
                          <span>End date</span>

                          <div className="recurring-modal-control recurring-modal-date-control">
                            <input
                              type="date"
                              value={recurringDraft.endDate}
                              onChange={(event) =>
                                setRecurringDraft((current) => ({
                                  ...current,
                                  endDate: event.target.value,
                                }))
                              }
                            />

                            <CalendarDays size={16} strokeWidth={1.7} />
                          </div>
                        </div>
                      )}

                      {recurringDraft.endMode === "run_count" && (
                        <div className="recurring-modal-sub-row recurring-modal-run-count-row">
                          <span>Runs</span>

                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={recurringDraft.runCount}
                            onChange={(event) =>
                              setRecurringDraft((current) => ({
                                ...current,
                                runCount: Number(event.target.value),
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="recurring-modal-actions">
                      <Button type="button" variant="secondary" onClick={closeRecurringModal}>
                        Cancel
                      </Button>

                      <Button type="button" onClick={saveRecurringDetails}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <section className="create-payroll-phase create-payroll-review-card">
                <section className="create-payroll-hero">
                  <div className="create-payroll-hero-copy">
                    <span className="create-payroll-hero-eyebrow">Step 3 of 3</span>
                    <h1>Review</h1>
                  </div>
                </section>

                <div className="create-payroll-review-list">
                  <div className="review-row">
                    <span>Connected employer</span>
                    <strong className="create-payroll-review-wallet">
                      {wallet || "Not connected"}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Employees</span>
                    <strong>{activeEmployees.length}</strong>
                  </div>

                  <div className="review-row">
                    <span>Per-run total</span>
                    <strong>
                      {perRunTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}{" "}
                      USDC
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Total runs</span>
                    <strong>{runCount}</strong>
                  </div>

                  <div className="review-row">
                    <span>Total payroll budget</span>
                    <strong style={{ color: "var(--z-accent)" }}>
                      {totalBudget.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}{" "}
                      USDC
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Email-ready employees</span>
                    <strong>
                      {
                        activeEmployees.filter((employee) =>
                          isValidEmail(employee.email.trim())
                        ).length
                      }{" "}
                      ready
                    </strong>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="create-payroll-action-footer">
            <div className="create-payroll-footer-progress">
              <span>{wizardPhase + 1}/3</span>
            </div>

            <div className="create-payroll-footer-buttons">
              <Button
                type="button"
                variant="secondary"
                className="create-payroll-footer-back"
                onClick={goPreviousPhase}
                disabled={wizardPhase === 0}
              >
                <ArrowLeft size={15} strokeWidth={1.8} />
                Back
              </Button>

              {wizardPhase < 2 && (
                <Button
                  type="button"
                  className="create-payroll-footer-next"
                  onClick={goNextPhase}
                >
                  <span>{phaseCopy.nextLabel}</span>
                  <ArrowRight size={15} strokeWidth={1.8} />
                </Button>
              )}

              {wizardPhase === 2 && (
                <Button
                  disabled={
                    mutation.isPending || activateTemplateMutation.isPending
                  }
                  type="submit"
                  className="create-payroll-footer-next"
                >
                  <span>
                    {mutation.isPending
                      ? "Creating..."
                      : activateTemplateMutation.isPending
                        ? "Activating..."
                        : "Create & Activate"}
                  </span>
                  <Check size={15} strokeWidth={2} />
                </Button>
              )}
            </div>
          </div>

          {formError && (
            <p className="text-danger create-payroll-footer-error-message">
              {formError}
            </p>
          )}
        </Card>
      </form>
    </div>
  );
}
