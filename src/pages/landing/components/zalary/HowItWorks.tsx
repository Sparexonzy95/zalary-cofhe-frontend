import { motion, type PanInfo } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import {
  containerVariant,
  fadeUpVariant,
  itemVariant,
  VP,
} from "../../lib/animations";

const STEPS = [
  {
    index: "01",
    title: "Deposit stablecoins",
    body: "Employers begin by depositing stablecoin value into the system, creating the entry point for confidential payroll operations.",
    image:
      "https://res.cloudinary.com/dxmdwvmxl/image/upload/v1777032757/step1_-_deposit_hzn0oy.png",
  },
  {
    index: "02",
    title: "Convert into confidential value flow",
    body: "The deposited value moves into a confidential handling layer so payroll activity can remain private while still staying on-chain.",
    image:
      "https://res.cloudinary.com/dxmdwvmxl/image/upload/v1777032756/step_2_-_confidential_s6tlvk.png",
  },
  {
    index: "03",
    title: "Create payroll and upload allocations",
    body: "Payroll is created, employee allocations are prepared, and salary amounts are structured before the payroll run is finalized.",
    image:
      "https://res.cloudinary.com/dxmdwvmxl/image/upload/v1777032756/step_3_create_payrolls_liowmr.png",
  },
  {
    index: "04",
    title: "Fund and activate payroll",
    body: "The payroll is funded and activated so the private payout flow becomes ready for eligible employees.",
    image:
      "https://res.cloudinary.com/dxmdwvmxl/image/upload/v1777032757/step_4_fund_and_activate_wlxoib.png",
  },
  {
    index: "05",
    title: "Employees request and finalize claims",
    body: "Employees discover claimable payroll runs, request their payout, and complete the confidential claim process.",
    image:
      "https://res.cloudinary.com/dxmdwvmxl/image/upload/v1777032757/step_5_employee_request_xbwshc.png",
  },
  {
    index: "06",
    title: "Withdraw and complete payout",
    body: "After claim completion, value moves through the withdrawal path to complete the payout journey cleanly and securely.",
    image:
      "https://res.cloudinary.com/dxmdwvmxl/image/upload/v1777032757/step_6_bbnkul.png",
  },
];

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

export function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);

  const indexRef = useRef(0);
  const wheelBuffer = useRef(0);
  const lockedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const THRESHOLD = 80;
  const SWIPE_THRESHOLD = 44;

  const goToStep = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));

    indexRef.current = clamped;
    setActiveIndex(clamped);
  }, []);

  const moveStep = useCallback(
    (dir: number) => {
      goToStep(indexRef.current + dir);
    },
    [goToStep]
  );

  const lock = useCallback(() => {
    if (isTouchDevice()) return;

    document.body.style.overflow = "hidden";
    lockedRef.current = true;
  }, []);

  const unlock = useCallback(() => {
    document.body.style.overflow = "";
    lockedRef.current = false;
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio > 0.9) lock();
        else unlock();
      },
      { threshold: [0.9, 1] }
    );

    const el = document.getElementById("how-section");
    if (el) observer.observe(el);

    return () => {
      observer.disconnect();
      unlock();
    };
  }, [lock, unlock]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!lockedRef.current) return;

      e.preventDefault();
      wheelBuffer.current += e.deltaY;

      if (Math.abs(wheelBuffer.current) < THRESHOLD) return;

      const dir = wheelBuffer.current > 0 ? 1 : -1;
      wheelBuffer.current = 0;

      const next = indexRef.current + dir;

      if (next < 0) {
        unlock();
        window.scrollBy({
          top: -window.innerHeight * 0.8,
          behavior: "smooth",
        });
        return;
      }

      if (next >= STEPS.length) {
        unlock();
        window.scrollBy({
          top: window.innerHeight * 0.8,
          behavior: "smooth",
        });
        return;
      }

      goToStep(next);
    };

    window.addEventListener("wheel", onWheel, { passive: false });

    return () => window.removeEventListener("wheel", onWheel);
  }, [goToStep, unlock]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const start = touchStartRef.current;
      const touch = event.changedTouches[0];

      touchStartRef.current = null;

      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;

      if (absX >= absY) {
        moveStep(deltaX < 0 ? 1 : -1);
        return;
      }

      moveStep(deltaY < 0 ? 1 : -1);
    },
    [moveStep]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const shouldMove =
        Math.abs(info.offset.x) > SWIPE_THRESHOLD ||
        Math.abs(info.velocity.x) > 360;

      if (!shouldMove) return;

      moveStep(info.offset.x < 0 || info.velocity.x < 0 ? 1 : -1);
    },
    [moveStep]
  );

  const step = STEPS[activeIndex];

  return (
    <section
      id="how-section"
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#09090B] py-10 md:h-[80vh] md:min-h-0 md:py-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* HEADER */}
      <motion.div
        variants={containerVariant}
        initial="hidden"
        whileInView="visible"
        viewport={VP}
        className="flex w-full flex-shrink-0 flex-col items-center px-4 pb-5 pt-0 text-center md:pb-3 md:pt-9"
      >
        <motion.span
          variants={itemVariant}
          className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary"
        >
          How it works
        </motion.span>

        <motion.h2
          variants={fadeUpVariant}
          className="max-w-[760px] text-[24px] font-bold leading-[1.1] tracking-[-0.025em] text-white sm:text-[26px] md:text-[32px]"
        >
          From deposit to payout,{" "}
          <span className="text-white/35">every step stays private.</span>
        </motion.h2>

        <motion.p
          variants={itemVariant}
          className="mt-3 max-w-[480px] text-[13px] leading-[1.65] text-white/45 md:text-[14px]"
        >
          Stablecoin deposits, encrypted payroll runs, and wallet-native
          employee claims — six steps, zero on-chain exposure.
        </motion.p>
      </motion.div>

      {/* STAGE + PAGINATOR */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-0 sm:px-6 md:min-h-0 md:px-8 md:pb-7">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleDragEnd}
          className="flex w-full max-w-[980px] flex-col overflow-hidden rounded-md border border-white/10 bg-[#111113] md:h-full md:flex-row"
        >
          {/* IMAGE — visible on mobile and desktop */}
          <div className="flex h-[220px] w-full items-center justify-center border-b border-white/10 bg-[#0E0F12]/60 p-4 sm:h-[260px] md:h-auto md:flex-1 md:border-b-0 md:border-l md:border-white/10 md:p-6 lg:p-8">
            <motion.img
              src={step.image}
              alt={step.title}
              className="h-full w-full object-contain"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
              draggable={false}
            />
          </div>

          {/* TEXT */}
          <div className="flex flex-shrink-0 flex-col justify-center px-5 py-6 sm:p-8 md:order-first md:w-1/2 md:p-10">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40 md:mb-4">
              Step {step.index}
            </div>

            <h3 className="text-xl font-semibold leading-tight text-white sm:text-2xl md:text-[28px] lg:text-[34px]">
              {step.title}
            </h3>

            <p className="mt-3 max-w-[42ch] text-[13px] leading-[1.7] text-white/70 md:mt-4 md:text-[14px]">
              {step.body}
            </p>
          </div>
        </motion.div>

        {/* PAGINATOR — now below the card */}
        <div className="mt-5 flex items-center justify-center gap-1.5 md:mt-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToStep(i)}
              aria-label={`Show step ${i + 1}`}
              aria-current={i === activeIndex ? "step" : undefined}
              className={`h-[3px] cursor-pointer rounded-full border-0 p-0 transition-all duration-300 ${
                i === activeIndex ? "w-5 bg-white/60" : "w-[6px] bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}