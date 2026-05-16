import { ZalaryMark } from "./ZalaryMark";

const COLUMNS: Record<string, string[]> = {
  Product: ["How It Works", "For Employers", "For Employees", "Security"],
  Architecture: ["Smart Contracts", "Backend", "CoFHE Model", "Frontend"],
  App: ["Launch App", "Role Select", "Connect Wallet"],
};

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5">
              <ZalaryMark />
              <span className="font-display text-[18px] font-bold tracking-tight text-foreground">
                Zalary
              </span>
            </div>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
              Confidential payroll infrastructure. Encrypted by computation,
              orchestrated for production.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              Base Sepolia · CoFHE
            </div>
          </div>

          {Object.entries(COLUMNS).map(([title, items]) => (
            <div key={title} className="md:col-span-2">
              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                {title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {items.map((it) => (
                  <li key={it}>
                    <a
                      href="#"
                      className="text-[13.5px] text-foreground/80 transition-colors hover:text-primary"
                    >
                      {it}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="md:col-span-1" />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 md:flex-row md:items-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Zalary — confidential payroll infrastructure.
          </p>
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground/70">
            © {new Date().getFullYear()} Zalary Labs · v0.1.0 · base-sepolia
          </p>
        </div>
      </div>
    </footer>
  );
}
