import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SectionHeader } from "./SectionHeader";

const STEPS = [
  { n: "01", title: "Deposit USDC", text: "Employers begin by depositing USDC into the routing layer." },
  { n: "02", title: "Receive confidential balance", text: "Value is handled through confidential token flows so balances and movements remain private." },
  { n: "03", title: "Create payroll", text: "Define schedules, employees, and reusable payroll structure." },
  { n: "04", title: "Fund and activate payroll", text: "Encrypted funding data is submitted and the payroll is activated once ready." },
  { n: "05", title: "Employees request claims", text: "Employees discover claimable runs and submit claim requests." },
  { n: "06", title: "Finalize and withdraw", text: "Proof-backed finalize flows support payout completion and withdrawal handling." },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.85], ["0%", "100%"]);

  return (
    <section id="how" className="relative py-28 md:py-36">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <div className="relative mx-auto max-w-[1440px] px-6 md:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12">
          {/* Sticky left */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SectionHeader
                eyebrow="How it works"
                title={
                  <>
                    A confidential payroll
                    <br />
                    <span className="text-muted-foreground">
                      lifecycle, end to end.
                    </span>
                  </>
                }
                subtitle="From funding the routing layer to finalizing private claims — Zalary structures every operational step into a clear, verifiable workflow."
              />

              <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-border bg-elevated px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
                Live on Base Sepolia
              </div>
            </div>
          </div>

          {/* Steps */}
          <div ref={ref} className="relative lg:col-span-7">
            {/* vertical track */}
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border md:left-[22px]">
              <motion.div
                style={{ height: lineHeight }}
                className="absolute inset-x-0 top-0 w-px bg-gradient-to-b from-primary via-primary to-primary/0"
              />
            </div>

            <ol className="space-y-5">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.n}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="relative pl-14 md:pl-20"
                >
                  {/* Node */}
                  <div className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background md:h-11 md:w-11">
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_oklch(0.86_0.16_88_/_0.8)]" />
                  </div>

                  <div className="rounded-2xl glass grain p-6 transition-all duration-300 hover:border-border-strong">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-[18px] font-semibold text-foreground">
                        {s.title}
                      </h3>
                      <span className="font-mono text-[11px] tracking-[0.16em] text-primary">
                        {s.n}
                      </span>
                    </div>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                      {s.text}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
