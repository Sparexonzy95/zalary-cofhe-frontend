import React from "react";
import { AxiosHeaders } from "axios";
import { api } from "./api";
import { getActiveProvider, getWalletClients, useWallet } from "./wallet";

export type OnboardingRole = "employer" | "employee";

export type OnboardingProfile = {
  id: number;
  wallet_address: string;
  email: string;
  email_verified: boolean;
  last_selected_role: string;
  employer: {
    company_name: string;
    work_email: string;
    company_size: string;
    onboarding_completed: boolean;
    completed_at?: string | null;
  };
  employee: {
    display_name: string;
    notification_email: string;
    private_access_enabled: boolean;
    onboarding_completed: boolean;
    completed_at?: string | null;
  };
};

type OnboardingContextValue = {
  token: string;
  profile: OnboardingProfile | null;
  loading: boolean;
  activeWallet: string;
  refresh: () => Promise<void>;
  loginWithWallet: (role: OnboardingRole) => Promise<OnboardingProfile>;
  saveEmployerProfile: (payload: {
    company_name: string;
    email: string;
    company_size?: string;
  }) => Promise<{ profile: OnboardingProfile; dev_email_code?: string }>;
  saveEmployeeProfile: (payload: {
    display_name: string;
    email: string;
  }) => Promise<{ profile: OnboardingProfile; dev_email_code?: string }>;
  verifyEmail: (payload: {
    code: string;
    email?: string;
  }) => Promise<OnboardingProfile>;
  markEmployeePrivateAccess: () => Promise<OnboardingProfile>;
  isOnboarded: (role: OnboardingRole) => boolean;
  logout: () => void;
};

const TOKEN_KEY = "zalary_onboarding_token";

function normalizeAddress(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setStoredToken(token: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function clearStoredOnboarding() {
  setStoredToken("");
}

async function getCurrentWalletNoPrompt(): Promise<string> {
  const eth = (window as Window & { ethereum?: any }).ethereum;
  const providers: any[] = [];

  try {
    providers.push(getActiveProvider());
  } catch {
    // A wallet may not be connected yet. Fall back to the injected provider.
  }

  if (eth && !providers.includes(eth)) {
    providers.push(eth);
  }

  if (providers.length === 0) return "";

  for (const provider of providers) {
    try {
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];

      const wallet = normalizeAddress(accounts?.[0]);
      if (wallet) return wallet;
    } catch {
      // Try the next available provider.
    }
  }

  return "";
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

const OnboardingContext = React.createContext<OnboardingContextValue | null>(
  null
);

async function requestNonce(wallet_address: string) {
  const res = await api.post("/api/v1/onboarding/auth/nonce/", {
    wallet_address,
  });

  return res.data as {
    wallet_address: string;
    message: string;
    expires_at: string;
  };
}

async function verifySignature(payload: {
  wallet_address: string;
  signature: string;
  role: OnboardingRole;
}) {
  const res = await api.post("/api/v1/onboarding/auth/verify/", payload);

  return res.data as {
    token: string;
    profile: OnboardingProfile;
  };
}

function profileMatchesWallet(
  profile: OnboardingProfile | null,
  wallet: string
) {
  if (!profile || !wallet) return false;

  return normalizeAddress(profile.wallet_address) === normalizeAddress(wallet);
}

function employerCompleted(profile: OnboardingProfile | null) {
  if (!profile) return false;

  return Boolean(
    profile.email_verified === true &&
      profile.employer?.onboarding_completed === true &&
      profile.employer?.company_name &&
      profile.employer?.work_email
  );
}

export function employeeCompleted(profile: OnboardingProfile | null) {
  if (!profile) return false;

  const notificationEmail = normalizeEmail(profile.employee?.notification_email);

  return Boolean(
    profile.wallet_address &&
      profile.email_verified === true &&
      profile.employee?.display_name?.trim() &&
      notificationEmail &&
      notificationEmail === normalizeEmail(profile.email) &&
      profile.employee?.private_access_enabled === true
  );
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { wallet } = useWallet();
  const [token, setToken] = React.useState(getStoredToken());
  const [profile, setProfile] = React.useState<OnboardingProfile | null>(null);
  const [activeWallet, setActiveWallet] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const previousWalletRef = React.useRef("");

  const logout = React.useCallback(() => {
    clearStoredOnboarding();
    setToken("");
    setProfile(null);
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);

    const currentWallet = await getCurrentWalletNoPrompt();
    setActiveWallet(currentWallet);

    const activeToken = getStoredToken();

    if (!activeToken || !currentWallet) {
      clearStoredOnboarding();
      setToken("");
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<OnboardingProfile>("/api/v1/onboarding/profile/");
      const freshProfile = res.data;

      if (!profileMatchesWallet(freshProfile, currentWallet)) {
        clearStoredOnboarding();
        setToken("");
        setProfile(null);
        setLoading(false);
        return;
      }

      setToken(activeToken);
      setProfile(freshProfile);
    } catch {
      clearStoredOnboarding();
      setToken("");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const nextWallet = normalizeAddress(wallet);
    const previousWallet = previousWalletRef.current;
    previousWalletRef.current = nextWallet;

    if (nextWallet) {
      setActiveWallet(nextWallet);

      if (profile && !profileMatchesWallet(profile, nextWallet)) {
        clearStoredOnboarding();
        setToken("");
        setProfile(null);
      }

      return;
    }

    if (previousWallet) {
      clearStoredOnboarding();
      setToken("");
      setProfile(null);
      setActiveWallet("");
    }
  }, [wallet, profile]);

  React.useEffect(() => {
    const eth = (window as Window & { ethereum?: any }).ethereum;
    if (!eth) return;

    const onAccountsChanged = (accounts: string[]) => {
      const nextWallet = normalizeAddress(accounts?.[0]);

      setActiveWallet(nextWallet);
      clearStoredOnboarding();
      setToken("");
      setProfile(null);

      void refresh();
    };

    eth.on?.("accountsChanged", onAccountsChanged);

    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [refresh]);

  async function loginWithWallet(role: OnboardingRole) {
    const { walletClient, account } = await getWalletClients({
      requestAccount: false,
    });

    const wallet = normalizeAddress(account);
    setActiveWallet(wallet);

    const nonce = await requestNonce(account);

    const signature = await walletClient.signMessage({
      account,
      message: nonce.message,
    });

    const result = await verifySignature({
      wallet_address: account,
      signature,
      role,
    });

    if (!profileMatchesWallet(result.profile, wallet)) {
      clearStoredOnboarding();
      setToken("");
      setProfile(null);
      throw new Error("Onboarding profile does not match connected wallet.");
    }

    setStoredToken(result.token);
    setToken(result.token);
    setProfile(result.profile);

    return result.profile;
  }

  async function saveEmployerProfile(payload: {
    company_name: string;
    email: string;
    company_size?: string;
  }) {
    const res = await api.post("/api/v1/onboarding/profile/employer/", payload);
    setProfile(res.data.profile);

    return res.data as {
      profile: OnboardingProfile;
      dev_email_code?: string;
    };
  }

  async function saveEmployeeProfile(payload: {
    display_name: string;
    email: string;
  }) {
    const displayName = payload.display_name.trim();
    const email = payload.email.trim().toLowerCase();

    if (!displayName) {
      throw new Error("Employee name is required.");
    }

    if (!email) {
      throw new Error("Notification email is required.");
    }

    const res = await api.post("/api/v1/onboarding/profile/employee/", {
      display_name: displayName,
      email,
      notification_email: email,
    });

    setProfile(res.data.profile);

    return res.data as {
      profile: OnboardingProfile;
      dev_email_code?: string;
    };
  }

  async function verifyEmail(payload: { code: string; email?: string }) {
    const res = await api.post("/api/v1/onboarding/email/verify/", payload);
    setProfile(res.data.profile);

    return res.data.profile as OnboardingProfile;
  }

  async function markEmployeePrivateAccess() {
    const res = await api.post(
      "/api/v1/onboarding/profile/employee/private-access/",
      {}
    );

    setProfile(res.data.profile);

    return res.data.profile as OnboardingProfile;
  }

  function isOnboarded(role: OnboardingRole) {
    if (!token || !profile || !activeWallet) return false;

    if (!profileMatchesWallet(profile, activeWallet)) return false;

    if (role === "employer") {
      return employerCompleted(profile);
    }

    return employeeCompleted(profile);
  }

  const value: OnboardingContextValue = {
    token,
    profile,
    loading,
    activeWallet,
    refresh,
    loginWithWallet,
    saveEmployerProfile,
    saveEmployeeProfile,
    verifyEmail,
    markEmployeePrivateAccess,
    isOnboarded,
    logout,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = React.useContext(OnboardingContext);

  if (!ctx) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }

  return ctx;
}

