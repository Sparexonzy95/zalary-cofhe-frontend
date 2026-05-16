import type { ReactNode } from "react";

export type DashboardSummaryRailItem = {
  label: string;
  value: ReactNode;
};

export type DashboardSummaryRailCard = {
  key: string;
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  items?: DashboardSummaryRailItem[];
  className?: string;
};

type DashboardSummaryRailProps = {
  cards: DashboardSummaryRailCard[];
  className?: string;
};

export function DashboardSummaryRail({
  cards,
  className = "employer-task-side",
}: DashboardSummaryRailProps) {
  return (
    <aside className={className}>
      {cards.map((card) => (
        <section
          key={card.key}
          className={["employer-task-card", card.className].filter(Boolean).join(" ")}
        >
          <div className="employer-task-side-head">
            {card.icon && (
              <span className="employer-task-side-icon">{card.icon}</span>
            )}
            <div>
              <span>{card.label}</span>
              <h2>{card.value}</h2>
            </div>
          </div>

          {card.items && card.items.length > 0 && (
            <div className="employer-task-status-list">
              {card.items.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </aside>
  );
}
