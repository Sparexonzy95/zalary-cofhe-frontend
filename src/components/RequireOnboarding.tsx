import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOnboarding, type OnboardingRole } from "../lib/onboarding";

function verifyPathFor(role: OnboardingRole) {
  return role === "employer" ? "/verify/employer" : "/verify/employee";
}

function onboardingPathFor(role: OnboardingRole) {
  return role === "employer" ? "/onboarding/employer" : "/onboarding/employee";
}

function normalizeAddress(value?: string | null) {
  return String(value ?? "").toLowerCase();
}

function employerProfileComplete(profile: any) {
  const employer = profile?.employer ?? profile?.employer_profile;

  return Boolean(
    profile?.wallet_address &&
      profile?.email_verified &&
      employer &&
      employer.onboarding_completed
  );
}

function employeeProfileComplete(profile: any) {
  const employee = profile?.employee ?? profile?.employee_profile;

  return Boolean(
    profile?.wallet_address &&
      profile?.email_verified &&
      employee &&
      String(employee.notification_email ?? profile?.email ?? "").trim() &&
      employee.private_access_enabled
  );
}

function fallbackIsOnboarded(profile: any, role: OnboardingRole) {
  if (role === "employer") {
    return employerProfileComplete(profile);
  }

  return employeeProfileComplete(profile);
}

export function RequireOnboarding({
  role,
  children,
}: {
  role: OnboardingRole;
  children: React.ReactNode;
}) {
  const location = useLocation();

  const { loading, token, profile, activeWallet, isOnboarded } =
    useOnboarding();

  const profileMatchesActiveWallet = Boolean(
    profile &&
      activeWallet &&
      normalizeAddress(profile.wallet_address) === normalizeAddress(activeWallet)
  );

  const ready = Boolean(
    profile && (isOnboarded(role) || fallbackIsOnboarded(profile, role))
  );

  if (loading) {
    return (
      <div className="card">
        <h2>Checking payroll identity...</h2>
        <p className="muted">Confirming your Zalary onboarding status.</p>
      </div>
    );
  }

  if (!token || !profile || !profileMatchesActiveWallet) {
    return (
      <Navigate
        to={verifyPathFor(role)}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!ready) {
    return (
      <Navigate
        to={onboardingPathFor(role)}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}