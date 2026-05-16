import axios, { AxiosError } from "axios";
import { env } from "./env";

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "x-api-key": env.apiKey,
    "content-type": "application/json",
  },
});

const ONBOARDING_TOKEN_KEY = "zalary_onboarding_token";

export type ApiErrorShape = {
  status: number;
  message: string;
  detail?: string;
  requiresOnboarding?: boolean;
  onboardingRole?: "employer" | "employee";
};

type ApiErrorResponse = {
  detail?: string;
  wallet_address?: string;
  email_verified?: boolean;
};

function getErrorDetail(error: unknown): string {
  if (!axios.isAxiosError(error)) return "";

  const data = error.response?.data as ApiErrorResponse | undefined;
  return String(data?.detail ?? "").toLowerCase();
}

function getOnboardingRoleFromDetail(detail: string): "employer" | "employee" | null {
  if (!detail) return null;

  if (detail.includes("employer onboarding")) {
    return "employer";
  }

  if (detail.includes("employee onboarding")) {
    return "employee";
  }

  if (detail.includes("employer wallet address is required")) {
    return "employer";
  }

  if (detail.includes("employee wallet address is required")) {
    return "employee";
  }

  return null;
}

function isOnboardingRoute(pathname: string) {
  return (
    pathname.startsWith("/verify/") ||
    pathname.startsWith("/onboarding/")
  );
}

function redirectToVerifyIfNeeded(error: unknown) {
  if (!axios.isAxiosError(error)) return;

  const status = error.response?.status ?? 0;
  if (status !== 403) return;

  const detail = getErrorDetail(error);
  const role = getOnboardingRoleFromDetail(detail);

  if (!role) return;

  const currentPath = window.location.pathname;

  // Avoid redirect loops when user is already on verification/onboarding pages.
  if (isOnboardingRoute(currentPath)) return;

  const hasWalletSession = Boolean(localStorage.getItem(ONBOARDING_TOKEN_KEY));
  const verifyPath = role === "employer" ? "/verify/employer" : "/verify/employee";
  const onboardingPath =
    role === "employer" ? "/onboarding/employer" : "/onboarding/employee";

  window.location.assign(hasWalletSession ? onboardingPath : verifyPath);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    redirectToVerifyIfNeeded(error);
    return Promise.reject(error);
  }
);

export function toApiError(error: unknown): ApiErrorShape {
  if (!(error instanceof AxiosError)) {
    return {
      status: 0,
      message: error instanceof Error ? error.message : "Unexpected error",
    };
  }

  const data = error.response?.data as ApiErrorResponse | undefined;
  const detail = data?.detail;
  const detailLower = String(detail ?? "").toLowerCase();
  const onboardingRole = getOnboardingRoleFromDetail(detailLower);
  const requiresOnboarding = Boolean(onboardingRole);

  return {
    status: error.response?.status ?? 0,
    detail,
    message: detail ?? error.message,
    requiresOnboarding,
    onboardingRole: onboardingRole ?? undefined,
  };
}

export async function postWithFallback<T = unknown>(
  paths: string[],
  payload: unknown
): Promise<T> {
  let lastError: unknown;

  for (const path of paths) {
    try {
      const res = await api.post<T>(path, payload);
      return res.data;
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;

      if (status === 404) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("No endpoint matched");
}
