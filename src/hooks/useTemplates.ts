import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toApiError } from "../lib/api";
import { routes } from "../lib/routes";
import type { PayrollRun, PayrollTemplate, TemplateEmployee } from "../lib/types";

const TERMINAL_RUN_STATUSES = new Set([
  "closed",
  "cancelled",
  "failed",
  "finalized_success",
  "completed",
]);

const TERMINAL_TEMPLATE_STATUSES = new Set(["completed", "cancelled"]);

function hasActiveRun(runs: PayrollRun[]) {
  return runs.some(
    (run) => !TERMINAL_RUN_STATUSES.has(String(run.status ?? "").toLowerCase())
  );
}

type CreateTemplatePayload = Partial<PayrollTemplate> & {
  employees?: TemplateEmployee[];
};

function normalizeAddress(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCreateTemplatePayload(payload: CreateTemplatePayload) {
  const employees = Array.isArray(payload.employees) ? payload.employees : [];

  if (employees.length === 0) {
    throw new Error("Add at least one employee.");
  }

  const seenAddresses = new Set<string>();

  const normalizedEmployees = employees.map((employee, index) => {
    const rowNumber = index + 1;
    const employeeAddress = normalizeAddress(employee.employee_address);
    const employeeEmail = normalizeEmail(employee.employee_email);
    const employeeName = String(employee.employee_name || "").trim();
    const amountAtomic = Number(employee.amount_atomic);

    if (!isValidAddress(employeeAddress)) {
      throw new Error(
        `Invalid employee wallet address at row ${rowNumber}: ${
          employee.employee_address || "empty"
        }`
      );
    }

    if (seenAddresses.has(employeeAddress)) {
      throw new Error(`Duplicate employee wallet address: ${employeeAddress}`);
    }

    seenAddresses.add(employeeAddress);

    if (employeeEmail && !isValidEmail(employeeEmail)) {
      throw new Error(`Invalid employee email for ${employeeAddress}: ${employeeEmail}`);
    }

    if (!Number.isFinite(amountAtomic) || amountAtomic <= 0) {
      throw new Error(`Invalid salary amount for ${employeeAddress}.`);
    }

    return {
      ...employee,
      employee_address: employeeAddress,
      employee_name: employeeName,
      employee_email: employeeEmail,
      amount_atomic: amountAtomic,
      is_active: employee.is_active ?? true,
    };
  });

  return {
    ...payload,
    employer_address: payload.employer_address
      ? normalizeAddress(payload.employer_address)
      : payload.employer_address,
    token_address: payload.token_address
      ? normalizeAddress(payload.token_address)
      : payload.token_address,
    employees: normalizedEmployees,
  };
}

export function useTemplatesList(employerAddress?: string) {
  return useQuery({
    queryKey: ["templates", employerAddress ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<PayrollTemplate[]>(
          routes.templates.list(employerAddress)
        );

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(employerAddress),
  });
}

export function useTemplate(id?: string) {
  return useQuery({
    queryKey: ["template", id ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<PayrollTemplate>(routes.templates.detail(id!));

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const template = query.state.data as PayrollTemplate | undefined;
      const status = String(template?.status ?? "").toLowerCase();
      return TERMINAL_TEMPLATE_STATUSES.has(status) ? false : 10_000;
    },
  });
}

export function useTemplateRuns(id?: string) {
  return useQuery({
    queryKey: ["templateRuns", id ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get<PayrollRun[]>(routes.templates.runs(id!));

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const runs = (query.state.data ?? []) as PayrollRun[];
      return hasActiveRun(runs) ? 10_000 : 30_000;
    },
  });
}

export function useTemplatePreviewRuns(id?: string) {
  return useQuery({
    queryKey: ["templatePreview", id ?? ""],
    queryFn: async () => {
      try {
        const res = await api.get(routes.templates.previewRuns(id!));

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      try {
        const normalizedPayload = normalizeCreateTemplatePayload(payload);
        const res = await api.post<PayrollTemplate>(
          routes.templates.list(),
          normalizedPayload
        );

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useActivateTemplate(id?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const res = await api.post(routes.templates.activate(id!), {});

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["templates"] });
      await qc.invalidateQueries({ queryKey: ["template", id ?? ""] });
      await qc.invalidateQueries({ queryKey: ["templatePreview", id ?? ""] });
    },
  });
}

export function useActivateTemplateById() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      try {
        const res = await api.post(routes.templates.activate(id), {});

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async (_data, id) => {
      const templateId = String(id);

      await qc.invalidateQueries({ queryKey: ["templates"] });
      await qc.invalidateQueries({ queryKey: ["template", templateId] });
      await qc.invalidateQueries({ queryKey: ["templatePreview", templateId] });
    },
  });
}

export function useCreateNextRun(id?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const res = await api.post<PayrollRun>(
          routes.templates.createNextRun(id!),
          {}
        );

        return res.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["templateRuns", id ?? ""] });
      await qc.invalidateQueries({ queryKey: ["template", id ?? ""] });
    },
  });
}
