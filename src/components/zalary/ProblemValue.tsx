import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

const CARDS = [
  {
    title: "Payroll Privacy",
    text: "Keep salary logic and balances confidential instead of exposing sensitive compensation data.",
    glyph: "shield",
  },
  {
    title: "On-chain Coordination",
    text: "Payroll, runs, claims, and withdrawals are structured into a real operational workflow.",
    glyph: "flow",
  },
  {
    title: "Employee Self-Service",
    text: "Employees discover claimable runs, request claims, and finalize payouts cleanly.",
    glyph: "user",
  },
  {
    title: "Cryptographic Assurance",
    text: "Decryption flows and proofs support both user display and verifiable transaction paths.",
    glyph: "cube",
  },
];

function Glyph({ kind }: { kind: string }) {
  const common = "h-12 w-12";
  if (kind === "shield")
    return (
      <svg viewBox="0 0 48 48" className={common} fill="none" aria-hidden>
        <path
          d="M24 6l14 5v12c0 9-6 14-14 17-8-3-14-8-14-17V11l14-5z"
          stroke="oklch(0.86 0.16 88)"
          strokeWidth="1.4"
          fill="oklch(0.86 0.16 88 / 0.08)"
        />
        <path d="M18 25l4 4 8-9" stroke="oklch(0.86 0.16 88)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "flow")
    return (
      <svg viewBox="0 0 48 48" className={common} fill="none" aria-hidden>
        <circle cx="10" cy="10" r="4" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.1)" />
        <circle cx="38" cy="10" r="4" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.1)" />
        <circle cx="10" cy="38" r="4" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.1)" />
        <circle cx="38" cy="38" r="4" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.1)" />
        <circle cx="24" cy="24" r="5" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.2)" />
        <path d="M14 12l8 8M34 12l-8 8M14 36l8-8M34 36l-8-8" stroke="oklch(1 0 0 / 0.3)" strokeWidth="1" />
      </svg>
    );
  if (kind === "user")
    return (
      <svg viewBox="0 0 48 48" className={common} fill="none" aria-hidden>
        <circle cx="24" cy="18" r="6" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.1)" />
        <path d="M10 40c0-7 6-12 14-12s14 5 14 12" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.05)" />
      </svg>
    );
  // cube
  return (
    <svg viewBox="0 0 48 48" className={common} fill="none" aria-hidden>
      <path d="M24 6l16 9v18l-16 9-16-9V15l16-9z" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" fill="oklch(0.86 0.16 88 / 0.08)" />
      <path d="M8 15l16 9 16-9M24 24v18" stroke="oklch(0.86 0.16 88)" strokeWidth="1.4" />
    </svg>
  );
}

export function ProblemValue() {
  return (
    <section id="product" className="relative py-28 md:py-36">
      <div className="mx-auto max-w-[1440px] px-6 md:px-8">
        <SectionHeader
          eyebrow="Why Zalary"
          title={
            <>
              Traditional payroll is private.
              <br />
              <span className="text-muted-foreground">
                Public blockchains are not.
              </span>
            </>
          }
          subtitle="Most on-chain payment systems expose balances, payout activity, and transaction patterns. Zalary preserves payroll confidentiality while keeping execution programmable and verifiable."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-[22px] glass grain p-6 transition-all duration-500 hover:-translate-y-1 hover:border-border-strong"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl transition-opacity duration-500 group-hover:bg-primary/15" />
              <div className="relative">
                <div className="mb-6 inline-flex items-center justify-center rounded-2xl border border-border bg-elevated p-3">
                  <Glyph kind={c.glyph} />
                </div>
                <h3 className="font-display text-[17px] font-semibold text-foreground">
                  {c.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {c.text}
                </p>
                <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  <span className="h-px w-4 bg-primary/50" />
                  0{i + 1} / 04
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
