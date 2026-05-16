import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOnboarding, type OnboardingRole } from "../lib/onboarding";

function verifyPathFor(role: OnboardingRole) {
  return role === "employer" ? "/verify/employer" : "/verify/employee";
}

function onboardingPathFor(role: OnboardingRole) {
  return role === "employer" ? "/onboarding/employer" : "/onboarding/employee";
}

function getEmployer(profile: any) {
  return profile?.employer ?? profile?.employer_profile ?? null;
}

function getEmployee(profile: any) {
  return profile?.employee ?? profile?.employee_profile ?? null;
}

function employerReady(profile: any) {
  const employer = getEmployer(profile);

  return Boolean(
    profile?.wallet_address &&
      employer &&
      (
        employer.onboarding_completed === true ||
        String(employer.company_name ?? "").trim() ||
        String(employer.work_email ?? employer.email ?? profile?.email ?? "").trim()
      )
  );
}

function employeeReady(profile: any) {
  const employee = getEmployee(profile);

  return Boolean(
    profile?.wallet_address &&
      employee &&
      (
        employee.private_access_enabled === true ||
        employee.onboarding_completed === true
      )
  );
}

function fallbackIsOnboarded(profile: any, role: OnboardingRole) {
  return role === "employer" ? employerReady(profile) : employeeReady(profile);
}

export function RequireOnboarding({
  role,
  children,
}: {
  role: OnboardingRole;
  children: React.ReactNode;
}) {
  const location = useLocation();

  const { loading, token, profile, isOnboarded } = useOnboarding();

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

  if (!token || !profile) {
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