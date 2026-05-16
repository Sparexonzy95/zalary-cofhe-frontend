import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";
import dashEmployer from "../../assets/dashboard-employer.jpg";
import dashEmployee from "../../assets/dashboard-employee.jpg";

function FeatureBlock({
  eyebrow,
  title,
  subtitle,
  features,
  cta,
  image,
  reverse = false,
  id,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  features: string[];
  cta: string;
  image: string;
  reverse?: boolean;
  id: string;
}) {
  return (
    <section id={id} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-8">
        <div
          className={[
            "grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16",
            reverse ? "lg:[&>div:first-child]:order-2" : "",
          ].join(" ")}
        >
          {/* Copy */}
          <div className="lg:col-span-5">
            <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

            <ul className="mt-10 space-y-3.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[14.5px] text-foreground/90">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary shadow-[0_0_10px_oklch(0.86_0.16_88_/_0.8)]" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_oklch(0.86_0.16_88_/_0.55)] hover:bg-primary-hover transition">
                {cta}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M3 6.5h7m0 0L6.5 3M10 6.5L6.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Wallet-native flow
              </span>
            </div>
          </div>

          {/* Image / mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative lg:col-span-7"
          >
            <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-primary/8 blur-3xl" />
            <div className="relative overflow-hidden rounded-[24px] glass-strong grain">
              {/* faux window chrome */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  app.zalary.xyz {reverse ? "/ employee" : "/ employer"}
                </div>
                <div className="h-2.5 w-12" />
              </div>

              <div className="relative">
                <img
                  src={image}
                  alt={`${title} interface preview`}
                  className="block w-full"
                  width={1920}
                  height={1080}
                  loading="lazy"
                />
                {/* dim overlay to mute the AI text artefacts */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-background/0 to-background/0" />
              </div>
            </div>

            {/* floating tag */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-5 left-6 hidden glass rounded-2xl px-4 py-3 shadow-soft md:flex md:items-center md:gap-3"
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </div>
                <div className="font-mono text-[12px] text-foreground">
                  {reverse ? "Claim ready" : "Run funded"}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function EmployerSection() {
  return (
    <FeatureBlock
      id="employers"
      eyebrow="For employers"
      title="Build payroll once. Run it repeatedly with privacy and control."
      subtitle="Payroll, schedules, runs, and funding flows — designed for finance teams that need confidentiality without losing operational rigor."
      features={[
        "Create reusable payroll",
        "Configure employees and allocations",
        "Schedule recurring payroll runs",
        "Generate funding quotes",
        "Fund and activate runs",
        "Track run statuses and operational state",
      ]}
      cta="Start as Employer"
      image={dashEmployer}
    />
  );
}

export function EmployeeSection() {
  return (
    <FeatureBlock
      id="employees"
      reverse
      eyebrow="For employees"
      title="Claim what is yours, without exposing what stays private."
      subtitle="A clear, wallet-native experience for finding claimable payroll runs and finalizing payouts through confidential flows."
      features={[
        "View claimable payroll runs",
        "Request confidential claims",
        "Sync pending claim states",
        "Finalize claim flows",
        "Continue into withdrawal",
        "Track statuses transparently",
      ]}
      cta="Continue as Employee"
      image={dashEmployee}
    />
  );
}
