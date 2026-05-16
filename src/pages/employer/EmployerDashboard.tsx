import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LayoutList,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { useTemplatesList } from "../../hooks/useTemplates";
import { useWallet } from "../../lib/wallet";
import { env } from "../../lib/env";
import { ERC20_ABI } from "../../lib/abi";
import { api, toApiError } from "../../lib/api";
import { routes } from "../../lib/routes";
import { Card, StatusBadge, EmptyState } from "../../components/ui";
import { effectiveTemplateStatus } from "../../lib/payrollStatus";
import { formatAtomicToDisplay } from "../../lib/utils";
import type { PayrollRun } from "../../lib/types";

type TemplateFilter = "all" | "active" | "draft" | "failed" | "completed";
const PAYROLL_PAGE_SIZE = 6;
const FILTER_OPTIONS: { value: TemplateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "failed", label: "Failed" },
  { value: "completed", label: "Completed" },
];

function normalizeAddress(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function toBigIntSafe(value: unknown) {
  try {
    if (value === null || value === undefined || value === "") return 0n;
    return BigInt(value as string | number | bigint | boolean);
  } catch {
    return 0n;
  }
}

function runActivityValue(run: PayrollRun) {
  const candidate = run.updated_at || run.created_at || run.run_at;
  const timestamp = candidate ? new Date(candidate).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : Number(run.id || 0);
}

function formatDashboardDate(value?: string | null) {
  if (!value) return "No runs yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No runs yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function useEmployerUsdcBalance(wallet?: string) {
  return useQuery({
    queryKey: ["employerUsdcBalance", wallet ?? ""],
    enabled: Boolean(wallet),
    queryFn: async () => {
      if (!wallet) return 0n;
      const usdcAddress = normalizeAddress(env.usdcAddress);
      if (!usdcAddress.startsWith("0x") || usdcAddress.length !== 42) return 0n;
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(env.rpcUrl),
      });
      const balance = await (publicClient as any)
        .readContract({
          address: env.usdcAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [wallet as `0x${string}`],
        })
        .catch(() => 0n);
      return balance as bigint;
    },
    refetchInterval: 15000,
  });
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`filter-tab${active ? " active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function EmployerDashboardPage() {
  const { wallet } = useWallet();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const templatesQuery = useTemplatesList(wallet || undefined);
  const templates = templatesQuery.data ?? [];
  const templateRunsQueries = useQueries({
    queries: templates.map((template) => ({
      queryKey: ["templateRuns", String(template.id)],
      queryFn: async () => {
        try {
          const res = await api.get<PayrollRun[]>(routes.templates.runs(template.id));

          return res.data;
        } catch (error) {
          throw toApiError(error);
        }
      },
      enabled: Boolean(wallet && template.id),
    })),
  });

  const templateRunsById = useMemo(() => {
    const map = new Map<number, PayrollRun[]>();

    templateRunsQueries.forEach((query, index) => {
      const template = templates[index];

      if (template) {
        map.set(template.id, (query.data ?? []) as PayrollRun[]);
      }
    });

    return map;
  }, [templates, templateRunsQueries]);

  const balanceQuery = useEmployerUsdcBalance(wallet || undefined);
  const usdcBalanceAtomic = balanceQuery.data ?? 0n;
  const balanceDisplay = balanceQuery.isLoading
    ? "..."
    : formatAtomicToDisplay(usdcBalanceAtomic.toString(), 6);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      const status = effectiveTemplateStatus(t, templateRunsById.get(t.id));
      const matchesFilter = filter === "all" ? true : status === filter;
      const matchesSearch =
        !q ||
        String(t.id).includes(q) ||
        String(t.title || "").toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [templates, templateRunsById, search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTemplates.length / PAYROLL_PAGE_SIZE)
  );
  const currentPageStart = (currentPage - 1) * PAYROLL_PAGE_SIZE;
  const currentPageTemplates = filteredTemplates.slice(
    currentPageStart,
    currentPageStart + PAYROLL_PAGE_SIZE
  );
  const visibleStart =
    filteredTemplates.length === 0 ? 0 : currentPageStart + 1;
  const visibleEnd = Math.min(
    filteredTemplates.length,
    currentPageStart + PAYROLL_PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [wallet, search, filter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, draft: 0, completed: 0, failed: 0 };
    for (const t of templates) {
      const s = effectiveTemplateStatus(t, templateRunsById.get(t.id));
      if (s in counts) counts[s]++;
    }
    return counts;
  }, [templates, templateRunsById]);

  const payrollVolumeAtomic = useMemo(() => {
    return templates.reduce((total, template) => {
      const employeeTotal = (template.employees ?? []).reduce(
        (sum, employee) => sum + toBigIntSafe(employee.amount_atomic),
        0n
      );

      if (employeeTotal > 0n) return total + employeeTotal;

      const runs = templateRunsById.get(template.id) ?? [];
      const latestRun = [...runs].sort(
        (a, b) => runActivityValue(b) - runActivityValue(a)
      )[0];
      return total + toBigIntSafe(latestRun?.required_total_atomic);
    }, 0n);
  }, [templates, templateRunsById]);
  const latestRunActivity = useMemo(() => {
    return Array.from(templateRunsById.values())
      .flat()
      .sort((a, b) => runActivityValue(b) - runActivityValue(a))[0];
  }, [templateRunsById]);

  const greeting = "Welcome back";

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }

  const activeFilterLabel =
    FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? "Filter";
  const payrollVolumeDisplay = `${formatAtomicToDisplay(
    payrollVolumeAtomic,
    6
  )} USDC`;
  const latestRunDisplay = latestRunActivity
    ? formatDashboardDate(
        latestRunActivity.updated_at ||
          latestRunActivity.created_at ||
          latestRunActivity.run_at
      )
    : "No runs yet";

  return (
    <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign">
      {!wallet && (
        <Card title="Connect wallet first">
          <p className="muted">
            Connect your employer wallet to view payroll, balance,
            funding needs, and pending actions.
          </p>
        </Card>
      )}

      {wallet && (
        <>
          <div className="employer-task-dashboard">
            <section className="employer-task-hero" data-tour="employer-hero">
              <div className="employer-task-hero-copy">
                <h1>
                  {greeting}, <span>Zalary</span>
                </h1>
                <p className="employer-task-hero-subtitle">
                  Manage payroll, track runs, and fund your workspace.
                </p>
              </div>

              <div className="employer-task-hero-metrics" aria-label="Payroll summary">
                <div className="employer-task-hero-metric">
                  <span>Payroll Volume</span>
                  <strong>{payrollVolumeDisplay}</strong>
                </div>
                <div className="employer-task-hero-metric">
                  <span>Latest Run</span>
                  <strong>{latestRunDisplay}</strong>
                </div>
              </div>

              <div className="employer-task-actions">
                <Link
                  className="employer-task-primary-action"
                  to="/employer/templates/new"
                  data-tour="employer-new-template"
                >
                  <Plus size={15} strokeWidth={2} />
                  New Payroll
                </Link>
              </div>
            </section>

            <main className="employer-task-main">
              <section
                className="employer-task-card employer-payroll-board"
                data-tour="employer-templates"
              >
                <div className="employer-task-card-head">
                  <div>
                    <span>Payroll queue</span>
                    <h2>Your Payroll</h2>
                  </div>
                  <span className="employer-task-count">
                    {filteredTemplates.length} item
                    {filteredTemplates.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="employer-task-board-tools">
                  <label className="employer-task-search">
                    <Search size={17} strokeWidth={1.8} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search payroll..."
                    />
                  </label>

                  <div className="employer-payroll-filter-area employer-task-filter-area">
                    <button
                      type="button"
                      className="employer-payroll-filter-trigger"
                      aria-expanded={filterMenuOpen}
                      aria-haspopup="menu"
                      aria-label="Filter payroll"
                      onClick={() => setFilterMenuOpen((open) => !open)}
                    >
                      <SlidersHorizontal size={15} strokeWidth={1.9} />
                      <span>{activeFilterLabel}</span>
                    </button>

                    {filterMenuOpen && (
                      <div className="employer-payroll-filter-menu" role="menu">
                        {FILTER_OPTIONS.map((option) => {
                          const active = filter === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="menuitemradio"
                              aria-checked={active}
                              className={active ? "active" : ""}
                              onClick={() => {
                                setFilter(option.value);
                                setFilterMenuOpen(false);
                              }}
                            >
                              <span>{option.label}</span>
                              {active && <Check size={14} strokeWidth={2} />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="filter-tabs employer-payroll-filters employer-task-filters">
                      {FILTER_OPTIONS.map((option) => (
                        <FilterButton
                          key={option.value}
                          active={filter === option.value}
                          onClick={() => setFilter(option.value)}
                        >
                          {option.label}
                        </FilterButton>
                      ))}
                    </div>
                  </div>
                </div>

                {templatesQuery.isLoading && (
                  <div className="employer-task-loading">Loading payroll...</div>
                )}

                {templatesQuery.isError && (
                  <p className="text-danger">Could not load payroll.</p>
                )}

                {!templatesQuery.isLoading && templates.length === 0 && (
                  <EmptyState
                    title="No payroll yet"
                    description="Create your first payroll to get started."
                    action={
                      <Link className="btn" to="/employer/templates/new">
                        Create Payroll
                      </Link>
                    }
                  />
                )}

                {templates.length > 0 && filteredTemplates.length === 0 && (
                  <p className="muted employer-task-empty">
                    No payroll matches your current filter.
                  </p>
                )}

                {filteredTemplates.length > 0 && (
                  <>
                    <div className="employer-task-payroll-list">
                      {currentPageTemplates.map((template) => {
                        const payrollName = template.title || `Payroll #${template.id}`;
                        const status = effectiveTemplateStatus(
                          template,
                          templateRunsById.get(template.id)
                        );

                        return (
                          <Link
                            key={template.id}
                            className="employer-task-payroll-row"
                            to={`/employer/templates/${template.id}`}
                            aria-label={`Open ${payrollName}`}
                          >
                            <span className="employer-task-row-copy">
                              <strong>{payrollName}</strong>
                              <StatusBadge value={status} />
                            </span>
                            <span className="employer-task-view-link">View</span>
                            <ArrowRight size={16} strokeWidth={2} />
                          </Link>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div
                        className="employee-claims-pagination employer-payroll-pagination employer-task-pagination"
                        aria-label="Payroll pagination"
                      >
                        <span>
                          Showing {visibleStart}-{visibleEnd} of {filteredTemplates.length}
                        </span>

                        <div className="employee-claims-pagination-controls employer-payroll-pagination-controls">
                          <button
                            type="button"
                            className="employee-claims-page-btn employer-payroll-page-btn"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            aria-label="Previous payroll page"
                          >
                            <ChevronLeft size={15} strokeWidth={2} />
                          </button>

                          <span className="employee-claims-page-count employer-payroll-page-count">
                            {currentPage} / {totalPages}
                          </span>

                          <button
                            type="button"
                            className="employee-claims-page-btn employer-payroll-page-btn"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            aria-label="Next payroll page"
                          >
                            <ChevronRight size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </main>

            <aside className="employer-task-side">
              <Link
                className="employer-task-primary-action employer-sidebar-new-payroll"
                to="/employer/templates/new"
                data-tour="employer-new-template"
              >
                <Plus size={15} strokeWidth={2} />
                New Payroll
              </Link>

              <div className="employer-task-card employer-balance-sidebar-card">
                <span className="employer-task-side-icon">
                  <CircleDollarSign size={14} strokeWidth={1.9} />
                </span>
                <div className="employer-balance-sidebar-copy">
                  <span>Wallet Balance</span>
                  <strong>{balanceDisplay} USDC</strong>
                </div>
              </div>

              <div className="employer-task-card employer-status-sidebar">
                <div className="employer-status-sidebar-head">
                  <span className="employer-task-side-icon">
                    <LayoutList size={14} strokeWidth={1.9} />
                  </span>
                  <div>
                    <span>Payroll Status</span>
                    <strong>{templates.length} total</strong>
                  </div>
                </div>
                {([
                  { label: "Active", key: "active" },
                  { label: "Draft", key: "draft" },
                  { label: "Completed", key: "completed" },
                  { label: "Failed", key: "failed" },
                ] as const).map(({ label, key }) => (
                  <div key={key} className="employer-status-row">
                    <span>{label}</span>
                    <strong>{statusCounts[key] ?? 0}</strong>
                  </div>
                ))}
              </div>
            </aside>

          </div>
        </>
      )}
    </div>
  );
}
