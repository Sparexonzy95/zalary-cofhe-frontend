import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

const EMPLOYER_IMAGE =
  "https://res.cloudinary.com/durncdjje/image/upload/v1780077284/emp_1_lib370.avif";
const EMPLOYEE_IMAGE =
  "https://res.cloudinary.com/durncdjje/image/upload/v1780077259/empeee_2_udbnpq.avif";

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
                <li key={f} className="flex items-start gap-3 text-[14.5px] text-foreground/70">
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

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative lg:col-span-7"
          >
            <img
              src={image}
              alt={`${title} interface preview`}
              className="block w-full object-contain"
              width={1920}
              height={1080}
              loading="lazy"
            />
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
      subtitle=""
      features={[
        "Create reusable payroll",
        "Configure employees and allocations",
        "Schedule recurring payroll runs",
        "Generate funding quotes",
        "Fund and activate runs",
        "Track run statuses and operational state",
      ]}
      cta="Start as Employer"
      image={EMPLOYER_IMAGE}
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
      subtitle=""
      features={[
        "View claimable payroll runs",
        "Request confidential claims",
        "Sync pending claim states",
        "Finalize claim flows",
        "Continue into withdrawal",
        "Track statuses transparently",
      ]}
      cta="Continue as Employee"
      image={EMPLOYEE_IMAGE}
    />
  );
}
