import { useNavigate } from "react-router-dom";
import "../styles/roleselect.css";

export function RoleSelectPage() {
  const nav = useNavigate();

  return (
    <div className="rs-wrap">
      <div className="rs-grid" />
      <div className="rs-bloom" />

      <a href="/" className="rs-back">
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16l-6-6 6-6" />
        </svg>
        Back to Home
      </a>

      <div className="rs-inner">
        <div className="rs-head">
          <div className="rs-logo">
            <img
              src="https://res.cloudinary.com/dxmdwvmxl/image/upload/v1776941645/logo_zalary2_mm8mlp.png"
              alt="Zalary"
              style={{ height: "28px", width: "auto", objectFit: "contain" }}
            />
          </div>

          <h1 className="rs-title">
            Choose your role<br />
    
          </h1>

          <p className="rs-sub">
          then take
            you to the right dashboard or setup flow.
          </p>
        </div>

        <div className="rs-cards">
          <button
            className="rs-card rs-card-employer"
            onClick={() => nav("/verify/employer")}
          >
            <div className="rs-card-scan" />

            <div className="rs-card-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                <path d="M12 12v4M10 14h4" />
              </svg>
            </div>

            <div className="rs-card-body">
              <div className="rs-card-role">Employer</div>
              <div className="rs-card-title">Run Private Payroll</div>

              <p className="rs-card-desc">
                Verify your employer wallet, create private payroll runs,
                manage employees, fund payroll securely, and let employees claim
                salary without exposing sensitive payroll data publicly.
              </p>
            </div>

            <div className="rs-card-actions">
              <div className="rs-card-features">
                <span>Wallet Verification</span>
                <span>Company Setup</span>
                <span>Private Payroll Runs</span>
                <span>Employee Claims</span>
              </div>

              <div className="rs-card-cta">
                Continue as Employer
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 10h10M11 6l4 4-4 4" />
                </svg>
              </div>
            </div>
          </button>

          <button
            className="rs-card rs-card-employee"
            onClick={() => nav("/verify/employee")}
          >
            <div className="rs-card-scan" />

            <div className="rs-card-icon rs-card-icon-emp">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                <path d="M16 11l2 2 3-3" />
              </svg>
            </div>

            <div className="rs-card-body">
              <div className="rs-card-role rs-card-role-emp">Employee</div>
              <div className="rs-card-title">Claim Salary</div>

              <p className="rs-card-desc">
                Verify your claim wallet, enable private salary access, view
                available payroll claims, claim salary securely, and withdraw
                when ready.
              </p>
            </div>

            <div className="rs-card-actions">
              <div className="rs-card-features">
                <span>Wallet Verification</span>
                <span>Private Salary Preview</span>
                <span>Claim Reminders</span>
                <span>Secure Withdrawals</span>
              </div>

              <div className="rs-card-cta rs-card-cta-emp">
                Continue as Employee
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 10h10M11 6l4 4-4 4" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        <div className="rs-note">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Your payroll identity is secured with wallet verification, email
          binding, and encrypted salary access.
        </div>
      </div>
    </div>
  );
}