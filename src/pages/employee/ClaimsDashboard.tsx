import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, StatusBadge } from "../../components/ui";
import { useCreateClaim, useEmployeeClaimables } from "../../hooks/useClaims";
import type { EmployeeClaimable } from "../../lib/types";
import { useWallet } from "../../lib/wallet";

type ClaimableItem = EmployeeClaimable;
const CLAIMS_PAGE_SIZE = 6;

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (text && text !== "null" && text !== "undefined") {
      return text;
    }
  }

  return "";
}

function isClaimedStatus(status?: string | null) {
  return [
    "claimed",
    "completed",
    "complete",
    "finalized",
    "finalized_success",
  ].includes(String(status ?? "").toLowerCase());
}

function isFailedClaimStatus(status?: string | null) {
  return ["failed", "finalized_revert", "error", "cancelled"].includes(
    String(status ?? "").toLowerCase()
  );
}

function displayClaimStatus(status?: string | null) {
  if (isClaimedStatus(status)) return "Claimed";
  if (isFailedClaimStatus(status)) return "Failed";

  return "Claim";
}

function companyNameOf(item: ClaimableItem) {
  return (
    firstText(
      item.company_name,
      item.employer_company_name,
      item.employer_name,
      item.employer?.company_name,
      item.employer?.name,
      item.template?.company_name,
      item.template?.employer_company_name,
      item.template?.employer_name,
      item.template?.employer?.company_name,
      item.template?.employer?.name
    ) || "Company unavailable"
  );
}

function payrollNameOf(item: ClaimableItem) {
  return (
    firstText(
      item.payroll_name,
      item.payroll_title,
      item.template_title,
      item.template?.title
    ) || `Payroll #${item.template_id ?? item.run_id}`
  );
}

function createdAtOf(item: ClaimableItem) {
  return firstText(item.created_at, item.run_at);
}

function displayTimestamp(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function claimPath(item: ClaimableItem, claimId: number | string) {
  const params = new URLSearchParams();

  params.set("runId", String(item.run_id));

  if (item.onchain_payroll_id) {
    params.set("payrollId", String(item.onchain_payroll_id));
  }

  if (isClaimedStatus(item.claim_status)) {
    params.set("tab", "transactions");
  }

  return `/employee/claims/${claimId}?${params.toString()}`;
}

function actionLabel(item: ClaimableItem) {
  if (isClaimedStatus(item.claim_status)) return "View History";
  if (isFailedClaimStatus(item.claim_status) && item.claim_id) return "Review Claim";

  return "Proceed to Claim";
}

function mobileActionLabel(item: ClaimableItem) {
  if (isClaimedStatus(item.claim_status)) return "View";
  if (isFailedClaimStatus(item.claim_status) && item.claim_id) return "Review";

  return "Proceed to Claim";
}

export function ClaimsDashboardPage() {
  const { wallet } = useWallet();
  const nav = useNavigate();
  const claimablesQuery = useEmployeeClaimables(wallet || undefined);
  const createClaim = useCreateClaim();

  const [openingRunId, setOpeningRunId] = useState<number | null>(null);
  const [openError, setOpenError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (wallet) {
      claimablesQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const rows = useMemo(() => {
    const data = (claimablesQuery.data ?? []) as ClaimableItem[];
    return [...data].sort((a, b) => b.run_id - a.run_id);
  }, [claimablesQuery.data]);

  const totalPages = Math.max(1, Math.ceil(rows.length / CLAIMS_PAGE_SIZE));
  const currentPageStart = (currentPage - 1) * CLAIMS_PAGE_SIZE;
  const currentPageRows = rows.slice(
    currentPageStart,
    currentPageStart + CLAIMS_PAGE_SIZE
  );
  const visibleStart = rows.length === 0 ? 0 : currentPageStart + 1;
  const visibleEnd = Math.min(rows.length, currentPageStart + CLAIMS_PAGE_SIZE);
  const claimedCount = rows.filter((row) => isClaimedStatus(row.claim_status)).length;
  const failedCount = rows.filter((row) => isFailedClaimStatus(row.claim_status)).length;
  const readyCount = Math.max(0, rows.length - claimedCount - failedCount);

  useEffect(() => {
    setCurrentPage(1);
  }, [wallet]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }

  async function handleOpen(item: ClaimableItem) {
    try {
      setOpenError("");
      setOpeningRunId(item.run_id);

      if (item.claim_id) {
        nav(claimPath(item, item.claim_id));
        return;
      }

      if (!wallet) {
        throw new Error("Connect the employee wallet first.");
      }

      const created = await createClaim.mutateAsync({
        run: item.run_id,
        employee_address: wallet.toLowerCase(),
      });

      if (!created?.id) {
        throw new Error("Claim was created but no claim id was returned.");
      }

      await claimablesQuery.refetch();

      nav(claimPath(item, created.id));
    } catch (e: any) {
      setOpenError(e?.message ?? "Could not open claim.");
    } finally {
      setOpeningRunId(null);
    }
  }

  async function handleRefresh() {
    try {
      setOpenError("");
      await claimablesQuery.refetch();
    } catch (e: any) {
      setOpenError(e?.message ?? "Could not refresh claimables.");
    }
  }

  return (
    <div className="stack dashboard-shell dashboard-shell-employee employer-dashboard-redesign employee-claims-dashboard-redesign">
      {/* ── Page header ── */}
      <section className="employer-task-hero employee-claims-hero" data-tour="employee-header">
        <div className="employer-task-hero-copy employee-claims-hero-copy">
          <span className="employer-task-kicker">Employee workspace</span>
          <h1>My Claims</h1>
          <p className="employer-task-hero-subtitle">
            Review available salary claims and open your transaction history.
          </p>
        </div>

        <div className="employer-task-hero-metrics employee-claims-hero-metrics" aria-label="Claims summary">
          <div className="employer-task-hero-metric">
            <span>Ready to Claim</span>
            <strong>{readyCount}</strong>
          </div>
          <div className="employer-task-hero-metric">
            <span>Claimed</span>
            <strong>{claimedCount}</strong>
          </div>
        </div>

        {wallet && (
          <div className="employer-task-actions employee-claims-hero-actions">
            <button
              type="button"
              className="employer-task-primary-action employee-claims-refresh-action"
              onClick={() => void handleRefresh()}
              disabled={claimablesQuery.isFetching}
              data-tour="employee-refresh"
            >
              <RefreshCw
                size={15}
                strokeWidth={2}
                className={claimablesQuery.isFetching ? "employee-claims-refresh-spinning" : ""}
              />
              {claimablesQuery.isFetching ? "Refreshing" : "Refresh"}
            </button>
          </div>
        )}
      </section>

      {/* ── No wallet ── */}
      {!wallet && (
        <Card className="employee-claims-wallet-card">
          <div style={{ padding: "1rem 0" }}>
            <EmptyState
              title="Wallet not connected"
              description="Connect your employee wallet to see available salary payments."
            />
          </div>
        </Card>
      )}

      {/* ── Claims table ── */}
      {wallet && (
        <section
          className="employer-task-card employer-payroll-board employee-claims-card employee-claims-board"
          data-tour="employee-claims-card"
        >
          <div className="employer-task-card-head employee-claims-board-head">
            <div>
              <span>Claim queue</span>
              <h2>Salary Claims</h2>
            </div>
            <span className="employer-task-count">
              {rows.length} item{rows.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="stack">
            <div className="muted" style={{ fontSize: "0.82rem" }}>
              {claimablesQuery.isLoading
                ? "Loading available salaries..."
                : `${rows.length} payroll payment${rows.length === 1 ? "" : "s"} found`}
            </div>

            {claimablesQuery.isError && (
              <p style={{ color: "var(--z-danger)", fontSize: "0.84rem" }}>
                Failed to load claimables.
              </p>
            )}

            {openError && (
              <p className="text-danger" style={{ fontSize: "0.84rem" }}>{openError}</p>
            )}

            {!claimablesQuery.isLoading && !claimablesQuery.isError && rows.length === 0 && (
              <EmptyState
                title="No available salary yet"
                description="A new payroll appears here after the employer creates the run, uploads allocations, funds it, activates it, and includes this connected wallet in the employee list."
              />
            )}

            {rows.length > 0 && (
              <>
                <div className="employee-claims-table-wrap">
                  <table className="table employee-claims-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Payroll Name</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>
                          <span className="employee-claims-action-heading">
                            Transaction
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPageRows.map((item) => {
                        return (
                          <tr key={item.run_id}>
                            <td>
                              <strong>{companyNameOf(item)}</strong>
                            </td>
                            <td>
                              <strong>{payrollNameOf(item)}</strong>
                            </td>
                            <td>
                              <span className="employee-claim-created">
                                {displayTimestamp(createdAtOf(item))}
                              </span>
                            </td>
                            <td>
                              <span className="employee-claim-status employee-claim-status-claim">
                                <StatusBadge value={displayClaimStatus(item.claim_status)} />
                              </span>
                            </td>
                            <td>
                              {isClaimedStatus(item.claim_status) ? (
                                <button
                                  type="button"
                                  className="employee-claim-history-link"
                                  disabled={
                                    createClaim.isPending ||
                                    openingRunId === item.run_id
                                  }
                                  onClick={() => void handleOpen(item)}
                                >
                                  <span className="employee-claim-action-label-desktop">
                                    {openingRunId === item.run_id
                                      ? "Opening..."
                                      : actionLabel(item)}
                                  </span>
                                  <span className="employee-claim-action-label-mobile">
                                    {openingRunId === item.run_id
                                      ? "Opening..."
                                      : mobileActionLabel(item)}
                                  </span>
                                  {openingRunId !== item.run_id && (
                                    <ArrowRight size={14} strokeWidth={2} />
                                  )}
                                </button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={
                                    createClaim.isPending ||
                                    openingRunId === item.run_id
                                  }
                                  onClick={() => void handleOpen(item)}
                                >
                                  <span className="employee-claim-action-label-desktop">
                                    {openingRunId === item.run_id ? "Opening..." : actionLabel(item)}
                                  </span>
                                  <span className="employee-claim-action-label-mobile">
                                    {openingRunId === item.run_id ? "Opening..." : mobileActionLabel(item)}
                                  </span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="employee-claims-pagination" aria-label="Claims pagination">
                    <span>
                      Showing {visibleStart}-{visibleEnd} of {rows.length}
                    </span>

                    <div className="employee-claims-pagination-controls">
                      <button
                        type="button"
                        className="employee-claims-page-btn"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous claims page"
                      >
                        <ChevronLeft size={15} strokeWidth={2} />
                      </button>

                      <span className="employee-claims-page-count">
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        className="employee-claims-page-btn"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next claims page"
                      >
                        <ChevronRight size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
