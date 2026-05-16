import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Wallet } from "lucide-react";
import { Button, Card, Field, useToast } from "../../components/ui";
import { useOnboarding } from "../../lib/onboarding";
import { formatAddress } from "../../lib/utils";

type EmployerOnboardingStep = 0 | 1 | 2;

const EMPLOYER_ONBOARDING_STEPS: {
  number: string;
  title: string;
  caption: string;
  step: EmployerOnboardingStep;
}[] = [
  { number: "01", title: "Wallet", caption: "Verified", step: 0 },
  { number: "02", title: "Profile", caption: "Company details", step: 1 },
  { number: "03", title: "Email", caption: "Confirm access", step: 2 },
];

const EMPLOYER_ONBOARDING_COPY: Record<
  EmployerOnboardingStep,
  { label: string; title: string }
> = {
  0: { label: "Step 01", title: "Wallet verified" },
  1: { label: "Step 02", title: "Company profile" },
  2: { label: "Step 03", title: "Email verification" },
};

export function EmployerOnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    profile,
    token,
    loading,
    refresh,
    saveEmployerProfile,
    verifyEmail,
    isOnboarded,
  } = useOnboarding();

  const [companyName, setCompanyName] = React.useState(
    profile?.employer?.company_name ?? ""
  );
  const [companySize, setCompanySize] = React.useState(
    profile?.employer?.company_size ?? ""
  );
  const [email, setEmail] = React.useState(
    profile?.employer?.work_email || profile?.email || ""
  );
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [profileSubmitted, setProfileSubmitted] = React.useState(false);
  const [onboardingStep, setOnboardingStep] =
    React.useState<EmployerOnboardingStep>(1);

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
      setCompanyName(profile.employer?.company_name ?? "");
      setCompanySize(profile.employer?.company_size ?? "");
      setEmail(profile.employer?.work_email || profile.email || "");
    }
  }, [profile]);

  const employerReady = Boolean(token && profile && isOnboarded("employer"));
  const profileSaved =
    profileSubmitted ||
    Boolean(
      profile?.employer?.company_name &&
        (profile.employer?.work_email || profile.email)
    );
  const emailVerified = Boolean(profile?.email_verified);
  const activeStepCopy = EMPLOYER_ONBOARDING_COPY[onboardingStep];

  React.useEffect(() => {
    if (!profile) return;
    if (emailVerified || profileSaved) {
      setOnboardingStep(2);
      return;
    }
    setOnboardingStep(1);
  }, [emailVerified, profile, profileSaved]);

  React.useEffect(() => {
    if (loading || checking) return;

    if (!token || !profile) {
      navigate("/verify/employer", { replace: true });
      return;
    }

    if (employerReady) {
      navigate("/employer", { replace: true });
    }
  }, [loading, checking, token, profile, employerReady, navigate]);

  if (loading || checking || employerReady || !token || !profile) {
    return (
      <div className="onboarding-page employer-onboarding-page dashboard-shell">
        <div className="employer-onboarding-head">
          <div>
            <div className="employer-kicker">Employer onboarding</div>
            <h1>Company setup</h1>
            <p>
              Confirming your verified wallet before opening your employer
              workspace.
            </p>
          </div>
        </div>

        <div className="onboarding-grid employer-onboarding-grid">
          <Card
            className="employer-onboarding-card"
            title="Checking access"
            subtitle="Please wait."
          >
            <div className="success-box employer-onboarding-note">
              Checking employer profile...
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
      const result = await saveEmployerProfile({
        company_name: companyName,
        company_size: companySize,
        email,
      });

      toast.push({
        kind: "success",
        title: "Company profile saved",
        message: "Check your email for the verification code.",
      });

      setProfileSubmitted(true);

      if (
        result.profile?.email_verified &&
        result.profile?.employer?.onboarding_completed
      ) {
        navigate("/employer", { replace: true });
      } else {
        setOnboardingStep(2);
      }
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
      const updatedProfile = await verifyEmail({ code, email });

      toast.push({
        kind: "success",
        title: "Email verified",
        message: "Your employer dashboard is now unlocked.",
      });

      if (
        updatedProfile.employer?.onboarding_completed ||
        isOnboarded("employer")
      ) {
        navigate("/employer", { replace: true });
      } else {
        await refresh();

        if (isOnboarded("employer")) {
          navigate("/employer", { replace: true });
        }
      }
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

  function canOpenStep(step: EmployerOnboardingStep) {
    if (step < 2) return true;
    return profileSaved || emailVerified;
  }

  function goToStep(step: EmployerOnboardingStep) {
    if (!canOpenStep(step)) return;
    setOnboardingStep(step);
  }

  return (
    <div className="onboarding-page employer-onboarding-page dashboard-shell">
      <div className="employer-onboarding-head">
        <div>
          <div className="employer-kicker">Employer onboarding</div>
          <h1>Company setup</h1>
          <p>
            Add the company identity connected to your verified payroll wallet.
          </p>
        </div>

        <div className="employer-onboarding-side">
          <div className="employer-onboarding-wallet">
            <span className="employer-onboarding-wallet-icon" aria-label="Verified wallet">
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
            Step {onboardingStep + 1} of {EMPLOYER_ONBOARDING_STEPS.length}
          </div>
        </div>

        <div className="employer-onboarding-status" aria-label="Employer onboarding progress">
          {EMPLOYER_ONBOARDING_STEPS.map((step) => {
            const active = step.step === onboardingStep;
            const complete =
              step.step === 0 ||
              (step.step === 1 && profileSaved) ||
              (step.step === 2 && emailVerified);
            const disabled = !canOpenStep(step.step);

            return (
              <button
                key={step.number}
                type="button"
                className={`employer-onboarding-status-item${active ? " active" : ""}${complete ? " complete" : ""}`}
                onClick={() => goToStep(step.step)}
                disabled={disabled}
                aria-current={active ? "step" : undefined}
              >
                <span>{complete ? <Check size={13} strokeWidth={2} /> : step.number}</span>
                <strong>{step.title}</strong>
                <small>
                  {step.step === 2 && emailVerified ? "Verified" : step.caption}
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
                subtitle="This wallet is attached to your employer workspace."
                actions={
                  <div className="employer-onboarding-wallet-card">
                    <strong>{formatAddress(profile.wallet_address)}</strong>
                    <span className="employer-onboarding-wallet-icon" aria-label="Verified wallet">
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
                title="Company profile"
                subtitle="Workspace details for payroll operations."
              >
                <form className="form-stack" onSubmit={handleProfileSubmit}>
                  <Field label="Company name">
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Zalary Labs"
                      required
                    />
                  </Field>

                  <Field label="Work email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="payroll@company.com"
                      required
                    />
                  </Field>

                  <Field label="Company size optional">
                    <input
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      placeholder="11-50 employees"
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
                      {busy ? "Saving..." : "Save Company Profile"}
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
                subtitle="Confirm alerts and payroll communication."
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
          </div>
        </div>
      </div>
    </div>
  );
}
