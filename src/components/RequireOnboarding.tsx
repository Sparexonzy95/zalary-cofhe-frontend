import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOnboarding, type OnboardingRole } from "../lib/onboarding";

function verifyPathFor(role: OnboardingRole) {
  return role === "employer" ? "/verify/employer" : "/verify/employee";
}

function onboardingPathFor(role: OnboardingRole) {
  return role === "employer" ? "/onboarding/employer" : "/onboarding/employee";
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
      profile.wallet_address.toLowerCase() === activeWallet.toLowerCase()
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

  if (!isOnboarded(role)) {
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
