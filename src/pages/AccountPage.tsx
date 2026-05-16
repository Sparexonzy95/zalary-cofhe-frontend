import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Copy,
  LogOut,
  Mail,
  User,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ui";
import { WalletConnectButton } from "../components/WalletConnectButton";
import { useOnboarding } from "../lib/onboarding";
import { formatAddress } from "../lib/utils";
import { useWallet } from "../lib/wallet";

export function AccountPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { wallet, disconnect } = useWallet();
  const {
    token,
    profile,
    loading,
    refresh,
    loginWithWallet,
    logout,
    isOnboarded,
  } = useOnboarding();
  const [unlockingProfile, setUnlockingProfile] = React.useState(false);
  const lastProfileRefreshWallet = React.useRef("");

  const employerReady = Boolean(token && profile && isOnboarded("employer"));
  const employeeReady = Boolean(token && profile && isOnboarded("employee"));
  const shouldRefreshMissingProfile = Boolean(wallet && !loading && !profile);

  React.useEffect(() => {
    if (!wallet) {
      lastProfileRefreshWallet.current = "";
      return;
    }
    if (
      shouldRefreshMissingProfile &&
      lastProfileRefreshWallet.current !== wallet
    ) {
      lastProfileRefreshWallet.current = wallet;
      void refresh();
    }
  }, [refresh, shouldRefreshMissingProfile, wallet]);

  function handleLogout() {
    logout();
    disconnect();
    navigate("/app", { replace: true });
  }

  async function handleLoadProfile() {
    if (!wallet) return;
    setUnlockingProfile(true);
    try {
      await loginWithWallet("employer");
      toast.push({
        kind: "success",
        title: "Profile loaded",
        message: "Your Zalary profile is now available.",
      });
    } catch (error) {
      toast.push({
        kind: "error",
        title: "Could not load profile",
        message:
          error instanceof Error
            ? error.message
            : "Please try again with your connected wallet.",
      });
    } finally {
      setUnlockingProfile(false);
    }
  }

  async function handleCopyWallet() {
    const address = wallet || profile?.wallet_address;
    if (!address) return;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(address);
      toast.push({
        kind: "success",
        title: "Wallet copied",
        message: "The wallet address has been copied.",
      });
    } catch {
      toast.push({
        kind: "error",
        title: "Could not copy wallet",
        message: "Please copy the address manually.",
      });
    }
  }

  if (loading && wallet) {
    return (
      <div className="account-premium-page dashboard-shell employer-dashboard-redesign account-dashboard-redesign">
        <div className="employer-task-card account-dashboard-card account-premium-card account-premium-connect-card">
          <p className="account-premium-loading">Loading your Zalary profile...</p>
        </div>
      </div>
    );
  }

  if (!token || !profile) {
    return (
      <div className="account-premium-page dashboard-shell employer-dashboard-redesign account-dashboard-redesign">
        <button
          type="button"
          className="template-detail-back-link account-premium-back"
          onClick={() => navigate("/app")}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          <span>Back</span>
        </button>

        <section className="employer-task-hero account-dashboard-hero">
          <div className="employer-task-hero-copy account-dashboard-hero-copy">
            <h1>Profile</h1>
            <p className="employer-task-hero-subtitle">
              Connect your wallet and unlock your Zalary workspace profile.
            </p>
          </div>

          <div className="employer-task-hero-metrics account-dashboard-hero-metrics">
            <div className="employer-task-hero-metric">
              <span>Wallet</span>
              <strong>{wallet ? formatAddress(wallet) : "Not connected"}</strong>
            </div>
            <div className="employer-task-hero-metric">
              <span>Profile</span>
              <strong>{wallet ? "Sign required" : "Locked"}</strong>
            </div>
          </div>
        </section>

        <div className="employer-task-card account-dashboard-card account-premium-card account-premium-connect-card">
          <p className="account-premium-connect-desc">
            {wallet
              ? "Wallet connected. Sign once to unlock your Zalary profile for this browser session."
              : "Connect your wallet to access the Zalary profile attached to your workspace."}
          </p>
          <div className="account-premium-connect-actions">
            {!wallet ? (
              <WalletConnectButton />
            ) : (
              <>
                <button
                  type="button"
                  className="account-premium-action-btn account-premium-action-btn-primary"
                  disabled={unlockingProfile}
                  onClick={() => void handleLoadProfile()}
                >
                  {unlockingProfile ? "Loading..." : "Load Profile"}
                </button>
                <button
                  type="button"
                  className="account-premium-action-btn account-premium-action-btn-danger"
                  onClick={handleLogout}
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const accountWallet = wallet || profile.wallet_address;
  const accountEmail =
    profile.email ||
    profile.employer?.work_email ||
    profile.employee?.notification_email ||
    "Not set";
  const employerName = profile.employer?.company_name || "Zalary";
  const employeeName = profile.employee?.display_name || "Employee";

  return (
    <div className="account-premium-page dashboard-shell employer-dashboard-redesign account-dashboard-redesign">
      <button
        type="button"
        className="template-detail-back-link account-premium-back"
        onClick={() => navigate("/app")}
      >
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Back</span>
      </button>

      <section className="employer-task-hero account-dashboard-hero">
        <div className="employer-task-hero-copy account-dashboard-hero-copy">
          <h1>Profile</h1>
          <p className="employer-task-hero-subtitle">
            Manage wallet identity, verification, and workspace access.
          </p>
        </div>

      </section>

      <section className="employer-task-card account-dashboard-card account-profile-panel">
        <article className="account-profile-card account-profile-details-card">
          <table className="account-profile-details-table">
            <tbody>
              <tr>
                <th scope="row">
                  <span className="account-profile-icon account-profile-icon-accent">
                    <Wallet size={17} strokeWidth={1.8} />
                  </span>
                  <span>Wallet</span>
                </th>
                <td>
                  <span className="account-profile-wallet-full">{accountWallet}</span>
                </td>
                <td className="account-profile-details-action">
                  <button
                    type="button"
                    className="account-profile-copy-btn"
                    aria-label="Copy wallet address"
                    onClick={() => void handleCopyWallet()}
                  >
                    <Copy size={15} strokeWidth={1.8} />
                  </button>
                </td>
              </tr>

              <tr>
                <th scope="row">
                  <span className="account-profile-icon">
                    <Mail size={17} strokeWidth={1.8} />
                  </span>
                  <span>Email</span>
                </th>
                <td colSpan={2}>
                  <strong>{accountEmail}</strong>
                </td>
              </tr>

              <tr>
                <th scope="row">
                  <span className="account-profile-icon">
                    <Mail size={17} strokeWidth={1.8} />
                  </span>
                  <span>Email status</span>
                </th>
                <td colSpan={2}>
                  <strong
                    className={`account-profile-status-pill${
                      profile.email_verified ? "" : " account-profile-status-pill-warning"
                    }`}
                  >
                    {profile.email_verified ? "Verified" : "Pending"}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="account-profile-card account-profile-workspace-card">
          <div className="account-profile-card-eyebrow">
            <Building2 size={15} strokeWidth={1.8} />
            <span>Workspace Access</span>
          </div>

          <div className="account-profile-workspace-row">
            <span className="account-profile-workspace-icon account-profile-workspace-icon-employer">
              <Building2 size={18} strokeWidth={1.8} />
            </span>
            <div className="account-profile-workspace-info">
              <strong>Employer</strong>
              <span>{employerName}</span>
            </div>
            <div className="account-profile-workspace-actions">
              <span
                className={`account-profile-status-pill${
                  employerReady ? "" : " account-profile-status-pill-warning"
                }`}
              >
                {employerReady ? "Ready" : "Setup"}
              </span>
              <button
                type="button"
                className="account-profile-open-btn"
                aria-label={employerReady ? "Open employer workspace" : "Set up employer workspace"}
                onClick={() =>
                  navigate(employerReady ? "/employer" : "/onboarding/employer")
                }
              >
                <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="account-profile-workspace-row">
            <span className="account-profile-workspace-icon account-profile-workspace-icon-employee">
              <User size={18} strokeWidth={1.8} />
            </span>
            <div className="account-profile-workspace-info">
              <strong>Employee</strong>
              <span>{employeeName}</span>
            </div>
            <div className="account-profile-workspace-actions">
              <span
                className={`account-profile-status-pill${
                  employeeReady ? "" : " account-profile-status-pill-warning"
                }`}
              >
                {employeeReady ? "Ready" : "Setup"}
              </span>
              <button
                type="button"
                className="account-profile-open-btn"
                aria-label={employeeReady ? "Open employee workspace" : "Set up employee workspace"}
                onClick={() =>
                  navigate(
                    employeeReady ? "/employee/claims" : "/onboarding/employee"
                  )
                }
              >
                <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </article>

        <div className="account-profile-footer">
          <button
            type="button"
            className="account-premium-action-btn account-premium-action-btn-danger"
            onClick={handleLogout}
          >
            <LogOut size={13} strokeWidth={2} />
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}
