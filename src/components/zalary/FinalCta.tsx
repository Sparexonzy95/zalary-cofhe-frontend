import { motion } from "framer-motion";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[160px]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      <div className="relative mx-auto max-w-[1100px] px-6 text-center md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[28px] glass-strong grain p-10 md:p-16"
        >
          {/* yellow beam */}
          <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary">
            Launch
          </span>
          <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground">
            Bring privacy to
            <br />
            payroll operations.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
            Create payroll, fund runs, claim allocations, and complete
            confidential withdrawal flows.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="/app" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_50px_-10px_oklch(0.86_0.16_88_/_0.6)] hover:bg-primary-hover transition">
              Launch App
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <button className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-elevated px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-panel">
              Connect Wallet
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
