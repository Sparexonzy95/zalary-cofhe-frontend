import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Wallet } from "lucide-react";
import { Button, Card, Field, useToast } from "../../components/ui";
import { getSelfPermit } from "../../lib/cofhe";
import { useOnboarding } from "../../lib/onboarding";
import { formatAddress } from "../../lib/utils";

type EmployeeOnboardingStep = 0 | 1 | 2 | 3;

const EMPLOYEE_ONBOARDING_STEPS: {
  number: string;
  title: string;
  caption: string;
  step: EmployeeOnboardingStep;
}[] = [
  { number: "01", title: "Wallet", caption: "Verified", step: 0 },
  { number: "02", title: "Profile", caption: "Claim details", step: 1 },
  { number: "03", title: "Email", caption: "Confirm alerts", step: 2 },
  { number: "04", title: "Private", caption: "Salary access", step: 3 },
];

const EMPLOYEE_ONBOARDING_COPY: Record<
  EmployeeOnboardingStep,
  { label: string; title: string }
> = {
  0: { label: "Step 01", title: "Wallet verified" },
  1: { label: "Step 02", title: "Claim profile" },
  2: { label: "Step 03", title: "Email verification" },
  3: { label: "Step 04", title: "Private salary access" },
};

function employeeProfileComplete(profile: ReturnType<typeof useOnboarding>["profile"]) {
  return Boolean(
    profile?.wallet_address &&
      profile?.email_verified &&
      profile?.employee?.notification_email &&
      profile?.employee?.private_access_enabled
  );
}

export function EmployeeOnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    profile,
    token,
    loading,
    refresh,
    saveEmployeeProfile,
    verifyEmail,
    markEmployeePrivateAccess,
    isOnboarded,
  } = useOnboarding();

  const [displayName, setDisplayName] = React.useState(
    profile?.employee?.display_name ?? ""
  );
  const [email, setEmail] = React.useState(
    profile?.employee?.notification_email || profile?.email || ""
  );
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [profileSubmitted, setProfileSubmitted] = React.useState(false);
  const [completionRedirecting, setCompletionRedirecting] = React.useState(false);
  const [onboardingStep, setOnboardingStep] =
    React.useState<EmployeeOnboardingStep>(1);

  React.useEffect(() => {
    let alive = true;

    async function checkExistingProfile() {
      try {
        await refresh();
      } finally {
        if (alive) setChecking(false);
      }
    }

    void checkExistingProfile();

    return () => {
      alive = false;
    };
  }, [refresh]);

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.employee?.display_name ?? "");
      setEmail(profile.employee?.notification_email || profile.email || "");
    }
  }, [profile]);

  const profileSaved =
    profileSubmitted ||
    Boolean(profile?.employee?.notification_email || profile?.email);

  const emailVerified = Boolean(profile?.email_verified);

  const privateAccessEnabled = Boolean(
    profile?.employee?.private_access_enabled
  );

  const employeeReady = Boolean(
    token &&
      profile &&
      (isOnboarded("employee") || employeeProfileComplete(profile))
  );

  const activeStepCopy = EMPLOYEE_ONBOARDING_COPY[onboardingStep];

  React.useEffect(() => {
    if (!profile) return;

    if (privateAccessEnabled || employeeReady) {
      setOnboardingStep(3);
      return;
    }

    if (emailVerified) {
      setOnboardingStep(3);
      return;
    }

    if (profileSaved) {
      setOnboardingStep(2);
      return;
    }

    setOnboardingStep(1);
  }, [emailVerified, privateAccessEnabled, employeeReady, profile, profileSaved]);

  React.useEffect(() => {
    if (loading || checking) return;

    if (!token || !profile) {
      navigate("/verify/employee", { replace: true });
      return;
    }

    if (employeeReady) {
      setCompletionRedirecting(true);

      const timer = window.setTimeout(() => {
        navigate("/employee/claims", { replace: true });
      }, 500);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [loading, checking, token, profile, employeeReady, navigate]);

  if (loading || checking || completionRedirecting || !token || !profile) {
    return (
      <div className="onboarding-page employer-onboarding-page employee-onboarding-page dashboard-shell">
        <div className="employer-onboarding-head">
          <div>
            <div className="employer-kicker">Employee onboarding</div>
            <h1>Claim setup</h1>
            <p>
              {completionRedirecting
                ? "Opening your salary claim workspace."
                : "Confirming your verified wallet before opening your salary claim workspace."}
            </p>
          </div>
        </div>

        <div className="onboarding-grid employer-onboarding-grid">
          <Card
            className="employer-onboarding-card"
            title={completionRedirecting ? "Setup complete" : "Checking access"}
            subtitle={completionRedirecting ? "Redirecting..." : "Please wait."}
          >
            <div className="success-box employer-onboarding-note">
              {completionRedirecting
                ? "Private salary access is enabled. Redirecting to claims..."
                : "Checking employee profile..."}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      await saveEmployeeProfile({
        display_name: displayName,
        email,
      });

      toast.push({
        kind: "success",
        title: "Notification email saved",
        message: "Check your email for the verification code.",
      });

      setProfileSubmitted(true);
      setOnboardingStep(2);
      await refresh();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not save profile",
        message: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      await verifyEmail({ code, email });

      toast.push({
        kind: "success",
        title: "Email verified",
        message: "Now enable private salary viewing.",
      });

      setOnboardingStep(3);
      await refresh();
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Verification failed",
        message: error instanceof Error ? error.message : "Invalid code.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handlePrivateAccess() {
    setBusy(true);

    try {
      await getSelfPermit(false);
      await markEmployeePrivateAccess();
      await refresh();

      toast.push({
        kind: "success",
        title: "Private salary access enabled",
        message: "Your claim workspace is ready.",
      });

      setCompletionRedirecting(true);

      window.setTimeout(() => {
        navigate("/employee/claims", { replace: true });
      }, 350);
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not enable private access",
        message: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  function canOpenStep(step: EmployeeOnboardingStep) {
    if (step < 2) return true;
    if (step === 2) return profileSaved || emailVerified || privateAccessEnabled;
    return emailVerified || privateAccessEnabled;
  }

  function goToStep(step: EmployeeOnboardingStep) {
    if (!canOpenStep(step)) return;
    setOnboardingStep(step);
  }

  return (
    <div className="onboarding-page employer-onboarding-page employee-onboarding-page dashboard-shell">
      <div className="employer-onboarding-head">
        <div>
          <div className="employer-kicker">Employee onboarding</div>
          <h1>Claim setup</h1>
          <p>Add your claim identity and enable private salary access.</p>
        </div>

        <div className="employer-onboarding-side">
          <div className="employer-onboarding-wallet">
            <span
              className="employer-onboarding-wallet-icon"
              aria-label="Verified wallet"
            >
              <Wallet size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <strong>{formatAddress(profile.wallet_address)}</strong>
          </div>
        </div>
      </div>

      <div className="employer-onboarding-carousel">
        <div className="employer-onboarding-flow-top">
          <div className="employer-onboarding-flow-copy">
            <span>{activeStepCopy.label}</span>
            <h2>{activeStepCopy.title}</h2>
          </div>
          <div className="employer-onboarding-flow-count">
            Step {onboardingStep + 1} of {EMPLOYEE_ONBOARDING_STEPS.length}
          </div>
        </div>

        <div
          className="employer-onboarding-status"
          aria-label="Employee onboarding progress"
        >
          {EMPLOYEE_ONBOARDING_STEPS.map((step) => {
            const active = step.step === onboardingStep;
            const complete =
              step.step === 0 ||
              (step.step === 1 && profileSaved) ||
              (step.step === 2 && emailVerified) ||
              (step.step === 3 && privateAccessEnabled);
            const disabled = !canOpenStep(step.step);

            return (
              <button
                key={step.number}
                type="button"
                className={`employer-onboarding-status-item${
                  active ? " active" : ""
                }${complete ? " complete" : ""}`}
                onClick={() => goToStep(step.step)}
                disabled={disabled}
                aria-current={active ? "step" : undefined}
              >
                <span>
                  {complete ? <Check size={13} strokeWidth={2} /> : step.number}
                </span>
                <strong>{step.title}</strong>
                <small>
                  {step.step === 2 && emailVerified
                    ? "Verified"
                    : step.step === 3 && privateAccessEnabled
                      ? "Enabled"
                      : step.caption}
                </small>
              </button>
            );
          })}
        </div>

        <div className="employer-onboarding-carousel-viewport">
          <div
            className="employer-onboarding-carousel-track"
            style={{ transform: `translateX(-${onboardingStep * 100}%)` }}
          >
            <div className="employer-onboarding-slide">
              <Card
                className="employer-onboarding-card employer-onboarding-wallet-verified-card"
                title="Wallet verified"
                subtitle="This wallet is attached to your salary claims."
                actions={
                  <div className="employer-onboarding-wallet-card">
                    <strong>{formatAddress(profile.wallet_address)}</strong>
                    <span
                      className="employer-onboarding-wallet-icon"
                      aria-label="Verified wallet"
                    >
                      <Wallet size={18} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </div>
                }
              >
                <div className="employer-onboarding-slide-actions">
                  <Button type="button" onClick={() => goToStep(1)}>
                    Continue to Profile
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </Button>
                </div>
              </Card>
            </div>

            <div className="employer-onboarding-slide">
              <Card
                className="employer-onboarding-card"
                title="Claim profile"
                subtitle="Where payroll claim notices should reach you."
              >
                <form className="form-stack" onSubmit={handleProfileSubmit}>
                  <Field label="Display name optional">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="David"
                    />
                  </Field>

                  <Field label="Notification email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </Field>

                  <div className="employer-onboarding-slide-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => goToStep(0)}
                    >
                      <ArrowLeft size={15} strokeWidth={1.8} />
                      Back
                    </Button>
                    <Button disabled={busy} type="submit">
                      {busy ? "Saving..." : "Save Notification Email"}
                      <ArrowRight size={15} strokeWidth={1.8} />
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            <div className="employer-onboarding-slide">
              <Card
                className="employer-onboarding-card"
                title="Verify email"
                subtitle="Confirm salary claim reminders and updates."
              >
                {profile.email_verified ? (
                  <div className="success-box employer-onboarding-note">
                    Email verified: <strong>{profile.email}</strong>
                  </div>
                ) : (
                  <form className="form-stack" onSubmit={handleVerifyEmail}>
                    <Field label="Verification code">
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="6-digit code"
                        required
                      />
                    </Field>

                    <div className="employer-onboarding-slide-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => goToStep(1)}
                      >
                        <ArrowLeft size={15} strokeWidth={1.8} />
                        Back
                      </Button>
                      <Button disabled={busy} type="submit">
                        {busy ? "Verifying..." : "Verify Email"}
                        <ArrowRight size={15} strokeWidth={1.8} />
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>

            <div className="employer-onboarding-slide">
              <Card
                className="employer-onboarding-card"
                title="Private salary access"
                subtitle="Enable browser access for private claim details."
              >
                {profile.employee?.private_access_enabled ? (
                  <div className="form-stack">
                    <div className="success-box employer-onboarding-note">
                      Private salary access enabled.
                    </div>

                    <div className="employer-onboarding-slide-actions">
                      <Button
                        type="button"
                        onClick={() =>
                          navigate("/employee/claims", { replace: true })
                        }
                      >
                        Go to Claims Dashboard
                        <ArrowRight size={15} strokeWidth={1.8} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="form-stack">
                    <div className="success-box employer-onboarding-note">
                      Your browser will request a private viewing permit before
                      opening claim details.
                    </div>

                    <div className="employer-onboarding-slide-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => goToStep(2)}
                      >
                        <ArrowLeft size={15} strokeWidth={1.8} />
                        Back
                      </Button>
                      <Button
                        type="button"
                        disabled={!profile.email_verified || busy}
                        onClick={() => void handlePrivateAccess()}
                      >
                        {busy ? "Enabling..." : "Enable Private Access"}
                        <ArrowRight size={15} strokeWidth={1.8} />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}