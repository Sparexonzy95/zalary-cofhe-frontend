import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

const POINTS = [
  "Inputs are encrypted before they enter confidential flows",
  "Permits govern who can decrypt and when",
  "Decrypt-for-view supports user-facing display",
  "Decrypt-for-tx supports proof-backed transaction actions",
  "Privacy is grounded in confidential smart contract logic",
];

export function Security() {
  return (
    <section id="security" className="relative py-28 md:py-36">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <div className="relative mx-auto max-w-[1440px] px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SectionHeader
              eyebrow="Security model"
              title={
                <>
                  Privacy built into computation —
                  <span className="text-muted-foreground"> not just the interface.</span>
                </>
              }
            />
            <ul className="mt-10 space-y-4">
              {POINTS.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex items-start gap-4 rounded-xl glass grain p-4"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-[10px] text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[14.5px] leading-relaxed text-foreground/90">
                    {p}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Animated orb */}
          <div className="relative lg:col-span-6">
            <div className="relative mx-auto aspect-square w-full max-w-[480px]">
              <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl" />

              {/* concentric rings */}
              {[0.95, 0.78, 0.6, 0.42, 0.24].map((s, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                  transition={{ duration: 30 + i * 6, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 m-auto rounded-full border border-border"
                  style={{ width: `${s * 100}%`, height: `${s * 100}%` }}
                >
                  {i === 0 && (
                    <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_18px_oklch(0.86_0.16_88_/_0.8)]" />
                  )}
                  {i === 2 && (
                    <span className="absolute top-1/2 -right-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary/70" />
                  )}
                </motion.div>
              ))}

              {/* core */}
              <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full glass-strong grain">
                <div className="text-center">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">
                    Encrypted
                  </div>
                  <div className="mt-1 font-display text-[15px] font-semibold text-foreground">
                    CoFHE Core
                  </div>
                </div>
              </div>

              {/* labels */}
              <div className="absolute left-2 top-8 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                permit
              </div>
              <div className="absolute right-2 bottom-10 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                proof
              </div>
              <div className="absolute right-6 top-12 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                decrypt-for-tx
              </div>
              <div className="absolute left-4 bottom-14 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                decrypt-for-view
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
