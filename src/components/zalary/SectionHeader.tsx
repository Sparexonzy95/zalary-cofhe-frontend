import { motion } from "framer-motion";

export function SectionEyebrow({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-px w-8 bg-primary/60" />
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary">
        {label}
      </span>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: "left" | "center";
}) {
  const alignCls = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`flex max-w-2xl flex-col gap-5 ${alignCls} ${align === "center" ? "mx-auto" : ""}`}>
      {eyebrow && <SectionEyebrow label={eyebrow} />}
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="font-display text-[clamp(1.85rem,3.6vw,2.85rem)] font-bold leading-[1.08] tracking-[-0.025em] text-foreground"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[16px] leading-relaxed text-muted-foreground"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
