import axios, { AxiosError } from "axios";
import { env } from "./env";

const API_PREFIX = "/api/v1";

function normalizeApiPath(url?: string) {
  if (!url) return url;

  // Leave full external URLs untouched.
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Already correct.
  if (url.startsWith(`${API_PREFIX}/`)) {
    return url;
  }

  // Old backend API paths that must be mounted under /api/v1.
  const oldBackendPrefixes = [
    "/templates/",
    "/runs/",
    "/claims/",
    "/employees/",
    "/swaprouter/",
    "/onboarding/",
  ];

  if (oldBackendPrefixes.some((prefix) => url.startsWith(prefix))) {
    return `${API_PREFIX}${url}`;
  }

  return url;
}

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

function verifyPathFor(role: "employer" | "employee") {
  return role === "employer" ? "/verify/employer" : "/verify/employee";
}

function onboardingPathFor(role: "employer" | "employee") {
  return role === "employer" ? "/onboarding/employer" : "/onboarding/employee";
}

function getRoleFromPath(pathname: string): "employer" | "employee" | null {
  if (
    pathname.startsWith("/employee") ||
    pathname === "/verify/employee" ||
    pathname === "/onboarding/employee"
  ) {
    return "employee";
  }

  if (
    pathname.startsWith("/employer") ||
    pathname === "/verify/employer" ||
    pathname === "/onboarding/employer"
  ) {
    return "employer";
  }

  return null;
}

function clearStoredOnboarding() {
  localStorage.removeItem(ONBOARDING_TOKEN_KEY);
}

function isVerifyRoute(pathname: string) {
  return pathname.startsWith("/verify/");
}

function walletIsMissing(detail: string) {
  return (
    detail.includes("wallet address is required") ||
    detail.includes("wallet is required") ||
    detail.includes("no wallet connected")
  );
}

function redirectToVerify(role: "employer" | "employee") {
  const currentPath = window.location.pathname;
  const verifyPath = verifyPathFor(role);

  if (currentPath === verifyPath) return;

  window.location.assign(verifyPath);
}

function redirectExpiredSessionIfNeeded(error: unknown) {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status ?? 0;
  if (status !== 401) return false;

  clearStoredOnboarding();

  const detail = getErrorDetail(error);
  const role =
    getOnboardingRoleFromDetail(detail) ??
    getRoleFromPath(window.location.pathname) ??
    "employer";

  if (!isVerifyRoute(window.location.pathname)) {
    redirectToVerify(role);
  }

  return true;
}

function redirectToVerifyIfNeeded(error: unknown) {
  if (!axios.isAxiosError(error)) return;

  const status = error.response?.status ?? 0;
  if (status !== 403) return;

  const detail = getErrorDetail(error);
  const role = getOnboardingRoleFromDetail(detail);

  if (!role) return;

  const currentPath = window.location.pathname;

  if (walletIsMissing(detail)) {
    clearStoredOnboarding();
    redirectToVerify(role);
    return;
  }

  // Avoid redirect loops when user is already on verification/onboarding pages.
  if (isVerifyRoute(currentPath) || currentPath.startsWith("/onboarding/")) return;

  const hasWalletSession = Boolean(localStorage.getItem(ONBOARDING_TOKEN_KEY));
  const verifyPath = verifyPathFor(role);
  const onboardingPath = onboardingPathFor(role);

  window.location.assign(hasWalletSession ? onboardingPath : verifyPath);
}

api.interceptors.request.use((config) => {
  config.url = normalizeApiPath(config.url);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!redirectExpiredSessionIfNeeded(error)) {
      redirectToVerifyIfNeeded(error);
    }
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
