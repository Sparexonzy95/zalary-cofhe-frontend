import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wallet } from "lucide-react";
import { Button, Card, useToast } from "../../components/ui";
import { WalletConnectButton } from "../../components/WalletConnectButton";
import {
  employeeCompleted,
  useOnboarding,
  type OnboardingProfile,
  type OnboardingRole,
} from "../../lib/onboarding";
import { formatAddress } from "../../lib/utils";
import { useWallet } from "../../lib/wallet";

function dashboardFor(role: OnboardingRole) {
  return role === "employer" ? "/employer" : "/employee/claims";
}

function onboardingFor(role: OnboardingRole) {
  return role === "employer" ? "/onboarding/employer" : "/onboarding/employee";
}

function roleTitle(role: OnboardingRole) {
  return role === "employer" ? "Employer" : "Employee";
}

function verifyTitle(role: OnboardingRole) {
  return role === "employer"
    ? "Verify your employer wallet"
    : "Verify your claim wallet";
}

function signButtonText(role: OnboardingRole) {
  return role === "employer" ? "Verify Employer Wallet" : "Verify Claim Wallet";
}

function verifyKicker(role: OnboardingRole) {
  return role === "employer" ? "Employer verification" : "Claim verification";
}

function profileIsCompleted(profile: OnboardingProfile, role: OnboardingRole) {
  if (!profile.email_verified) return false;

  if (role === "employer") {
    return Boolean(
      profile.employer?.onboarding_completed &&
        profile.employer?.company_name &&
        profile.employer?.work_email
    );
  }

  return employeeCompleted(profile);
}

export function VerifyWalletPage({ role }: { role: OnboardingRole }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { wallet } = useWallet();

  const {
    loading,
    token,
    profile,
    refresh,
    loginWithWallet,
    isOnboarded,
  } = useOnboarding();

  const [busy, setBusy] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    async function check() {
      try {
        await refresh();
      } finally {
        if (alive) setChecking(false);
      }
    }

    void check();

    return () => {
      alive = false;
    };
  }, [refresh]);

  React.useEffect(() => {
    if (loading || checking) return;

    if (token && profile && isOnboarded(role)) {
      navigate(dashboardFor(role), { replace: true });
      return;
    }

    if (token && profile && !isOnboarded(role)) {
      navigate(onboardingFor(role), { replace: true });
    }
  }, [loading, checking, token, profile, role, isOnboarded, navigate]);

  async function handleVerifyWallet() {
    if (!wallet) {
      toast.push({
        kind: "error",
        title: "Wallet not connected",
        message: "Connect your wallet first, then sign to verify your identity.",
      });
      return;
    }

    setBusy(true);

    try {
      const verifiedProfile = await loginWithWallet(role);

      toast.push({
        kind: "success",
        title: "Wallet verified",
        message:
          role === "employer"
            ? "Your employer identity has been verified."
            : "Your claim identity has been verified.",
      });

      if (profileIsCompleted(verifiedProfile, role)) {
        navigate(dashboardFor(role), { replace: true });
      } else {
        navigate(onboardingFor(role), { replace: true });
      }
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Wallet verification failed",
        message: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading || checking) {
    return (
      <div className="onboarding-page employer-onboarding-page verify-wallet-page dashboard-shell">
        <div className="employer-onboarding-head">
          <div>
            <div className="employer-kicker">{verifyKicker(role)}</div>
            <h1>Checking access</h1>
            <p>Confirming this wallet before opening your workspace.</p>
          </div>
        </div>

        <div className="onboarding-grid employer-onboarding-grid verify-wallet-grid">
          <Card
            className="employer-onboarding-card"
            title="Wallet status"
            subtitle="Please wait."
          >
            <div className="success-box employer-onboarding-note">
              Checking verification status...
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page employer-onboarding-page verify-wallet-page dashboard-shell">
      <div className="employer-onboarding-carousel verify-wallet-shell">
        <div className="employer-onboarding-head verify-wallet-hero">
          <div>
            <div className="employer-kicker">{verifyKicker(role)}</div>
            <h1>{verifyTitle(role)}</h1>
          </div>
        </div>

        <Card className="employer-onboarding-card verify-wallet-card">
          <div className="form-stack verify-wallet-stack">
            <div className="verify-wallet-field">
              <span className="verify-wallet-field-label">Wallet address</span>

              {wallet ? (
                <div className="employer-onboarding-wallet-card">
                  <span className="verify-wallet-field-icon" aria-hidden="true">
                    <Wallet size={24} strokeWidth={1.8} />
                  </span>
                  <strong>{formatAddress(wallet)}</strong>
                </div>
              ) : (
                <div className="verify-wallet-connect">
                  <span className="verify-wallet-field-icon" aria-hidden="true">
                    <Wallet size={24} strokeWidth={1.8} />
                  </span>
                  <p className="muted">No wallet connected</p>
                  <WalletConnectButton />
                </div>
              )}
            </div>

            <div className="employer-onboarding-slide-actions">
              <Button
                disabled={!wallet || busy}
                onClick={() => void handleVerifyWallet()}
              >
                {busy ? "Verifying..." : signButtonText(role)}
                <ArrowRight size={15} strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
