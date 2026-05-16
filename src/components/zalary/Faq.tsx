import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

const FAQS = [
  { q: "What is Zalary?", a: "Zalary is a confidential payroll platform that combines employer payroll coordination with encrypted on-chain operations." },
  { q: "Who is it for?", a: "Employers managing payroll and employees claiming payouts through confidential workflows." },
  { q: "Why confidential payroll?", a: "Public chains expose too much salary and treasury information. Zalary preserves privacy while keeping execution programmable." },
  { q: "What token flow does it use?", a: "USDC deposit and withdrawal, with confidential token handling in between." },
  { q: "What network does it support?", a: "The current implementation is centered on Base Sepolia." },
  { q: "Do I need a wallet?", a: "Yes — wallet connectivity is central to both employer and employee flows." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-28 md:py-36">
      <div className="mx-auto max-w-[1100px] px-6 md:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently asked questions."
          align="center"
        />
        <div className="mt-14 overflow-hidden rounded-[20px] border border-border bg-elevated">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-border last:border-0">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-panel md:px-8"
                >
                  <span className="flex items-center gap-4">
                    <span className="font-mono text-[11px] tracking-[0.16em] text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[16px] font-medium text-foreground md:text-[17px]">
                      {f.q}
                    </span>
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border-strong text-foreground"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 pl-[4.25rem] text-[14.5px] leading-relaxed text-muted-foreground md:px-8 md:pl-[4.5rem]">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
