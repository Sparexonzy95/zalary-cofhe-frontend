import { useEffect, useState } from "react";
import { ZalaryMark } from "./ZalaryMark";

const NAV = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how" },
  { label: "Employers", href: "#employers" },
  { label: "Employees", href: "#employees" },
  { label: "Architecture", href: "#architecture" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-40 transition-all duration-500",
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 md:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <ZalaryMark />
          <span className="font-display text-[17px] font-bold tracking-tight text-foreground">
            Zalary
          </span>
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="hidden rounded-full border border-border-strong bg-elevated px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-panel sm:inline-flex">
            Connect Wallet
          </button>
          <a href="/app" className="group relative inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-[0_8px_24px_-6px_oklch(0.86_0.16_88_/_0.55)] transition-all hover:bg-primary-hover">
            Launch App
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 6h6m0 0L6 3m3 3L6 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated text-foreground lg:hidden"
            aria-label="Toggle menu"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col px-6 py-3">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-elevated hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
