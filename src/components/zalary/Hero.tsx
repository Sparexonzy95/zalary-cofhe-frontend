import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import heroImg from "../../assets/hero-3d.jpg";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-36"
    >
      {/* background grid + glow */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[20%] h-[360px] w-[360px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-6 md:px-8 lg:grid-cols-12 lg:gap-8">
        {/* Left — copy */}
        <motion.div
          style={{ y: textY }}
          className="relative z-10 lg:col-span-6 lg:pt-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" />
            Confidential Payroll · USDC · CoFHE · Base Sepolia
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display text-[clamp(2.5rem,5.6vw,4.4rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground"
          >
            Private payroll,
            <br />
            powered by{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-br from-[oklch(0.94_0.18_88)] to-[oklch(0.78_0.15_82)] bg-clip-text text-transparent">
                confidential
              </span>
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
            </span>
            <br />
            smart contracts.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground"
          >
            Zalary helps employers fund, schedule, and execute payroll flows
            with encrypted values, wallet-based claims, and proof-backed
            withdrawals on Base Sepolia.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a href="/app" className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_40px_-10px_oklch(0.86_0.16_88_/_0.6)] transition-all hover:bg-primary-hover">
              Launch App
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-elevated px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-panel"
            >
              See how it works
            </a>
          </motion.div>

          {/* Supporting points */}
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {[
              "Confidential balances and salary allocations",
              "USDC deposit and confidential routing",
              "Employer payroll, runs, and funding",
              "Employee claims and withdrawals",
            ].map((p) => (
              <li
                key={p}
                className="flex items-start gap-2.5 font-mono text-[11.5px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-px w-3 flex-shrink-0 bg-primary" />
                {p}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Right — 3D visual */}
        <div className="relative lg:col-span-6">
          <motion.div
            style={{ y, scale, opacity }}
            className="relative mx-auto aspect-[5/4] w-full max-w-[640px]"
          >
            {/* glow halo */}
            <div className="pointer-events-none absolute inset-8 rounded-[40px] bg-primary/15 blur-3xl" />

            {/* main glass frame */}
            <div className="relative h-full w-full overflow-hidden rounded-[28px] glass-strong grain">
              <img
                src={heroImg}
                alt="Zalary confidential payroll architecture: USDC flowing through encrypted layers into a wallet"
                className="h-full w-full object-cover"
                width={1536}
                height={1280}
              />

              {/* scan line */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-scan" />
              </div>

              {/* corner ticks */}
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <span
                  key={c}
                  className={[
                    "absolute h-3 w-3 border-primary/70",
                    c === "tl" && "left-3 top-3 border-l border-t",
                    c === "tr" && "right-3 top-3 border-r border-t",
                    c === "bl" && "bottom-3 left-3 border-b border-l",
                    c === "br" && "bottom-3 right-3 border-b border-r",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              ))}
            </div>

            {/* Floating info chips */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 top-12 hidden glass rounded-2xl p-3 shadow-soft md:block"
            >
              <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                Encrypted input
              </div>
              <div className="mt-1 font-mono text-[12px] text-foreground">
                0xae…3f · OK
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-2 bottom-10 hidden glass rounded-2xl p-3 shadow-soft md:block"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  Payroll run
                </span>
              </div>
              <div className="mt-1 font-mono text-[12px] text-foreground">
                #PR-0294 · finalize
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
