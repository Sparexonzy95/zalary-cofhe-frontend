import { motion } from "framer-motion";
import {
  containerVariant,
  containerFast,
  fadeUpVariant,
  itemVariant,
  cardVariant,
  VP,
  VP_TIGHT,
} from "../..//lib/animations";

const CARDS = [
  {
    id: 1,
    time: "09:40",
    tag: "Private",
    title: "Private Payroll",
    subtitle:
      "Secure salary logic, confidential balances, and protected payroll execution without exposing sensitive operations publicly.",
    image:
      "https://res.cloudinary.com/dhjmedwbx/image/upload/v1777126508/ChatGPT_Image_Apr_25_2026_03_10_18_PM_2_wrk37z.png",
  },
  {
    id: 2,
    time: "12:15",
    tag: "Funding",
    title: "Stable Deposit Flow",
    subtitle:
      "Stablecoin deposits move into a privacy-first payroll structure built for smooth funding, payroll runs, and employee claims.",
    image:
      "https://res.cloudinary.com/dhjmedwbx/image/upload/v1777126506/ChatGPT_Image_Apr_25_2026_03_08_13_PM_rnob9m.png",
  },
  {
    id: 3,
    time: "15:25",
    tag: "Teams",
    title: "Confidential Operations",
    subtitle:
      "Balances remain protected while employers manage payroll schedules, employee setup, and automated execution flows.",
    image:
      "https://res.cloudinary.com/dhjmedwbx/image/upload/v1777126515/ChatGPT_Image_Apr_25_2026_03_10_18_PM_4_qwh5d9.png",
  },
  {
    id: 4,
    time: "18:10",
    tag: "Claims",
    title: "Employee Claims",
    subtitle:
      "Employees discover claimable payroll runs, request payouts, track pending actions, and complete secure wallet withdrawals.",
    image:
      "https://res.cloudinary.com/dhjmedwbx/image/upload/v1777126507/ChatGPT_Image_Apr_25_2026_03_10_18_PM_1_mmlxip.png",
  },
  {
    id: 5,
    time: "19:30",
    tag: "Email",
    title: "Email Notifications",
    subtitle:
      "Employees receive clear email updates when payroll is ready to claim, actions are pending, or payout status changes.",
    image:
      "https://res.cloudinary.com/dsbmr3xin/image/upload/v1780081262/ChatGPT_Image_May_29_2026_07_56_31_PM_iflszb.png",
  },
];

export function ProductOverview() {
  return (
    <section className="relative overflow-hidden bg-[#09090B] py-16 md:py-24 lg:py-28">
      <div className="relative mx-auto max-w-[1500px] px-5 md:px-8">

        {/* Heading */}
        <motion.div
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={VP}
          className="mb-10 md:mb-14 max-w-[760px]"
        >
          <motion.h2
            variants={fadeUpVariant}
            className="text-[22px] sm:text-[28px] md:text-[36px] font-bold leading-[1.1] tracking-[-0.025em] text-white"
          >
            Confidential payroll infrastructure,
            <span className="block text-white/50">
              built for modern execution.
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariant}
            className="mt-4 max-w-[540px] text-[15px] md:text-[16px] leading-[1.7] text-white/45"
          >
            Designed for employers, employees, and privacy-first payroll
            operations with wallet-native workflows.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerFast}
          initial="hidden"
          whileInView="visible"
          viewport={VP_TIGHT}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {CARDS.map((card) => (
            <motion.div
              key={card.id}
              variants={cardVariant}
              className="group flex min-h-[520px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#151515] p-3 transition duration-500 hover:-translate-y-1 hover:border-white/18 hover:bg-[#191919]"
            >
              <div className="flex items-center justify-between px-2 pb-4 pt-2">
                <span className="rounded-full bg-white px-3 py-1 font-mono text-[10px] font-semibold text-black">
                  {card.time}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
                  {card.tag}
                </span>
              </div>

              <div className="px-2 pb-6">
                <h3 className="max-w-[12rem] text-[27px] font-semibold leading-[0.98] tracking-normal text-white">
                  {card.title}
                </h3>
                <p className="mt-4 text-[13.5px] leading-[1.6] text-white/56">
                  {card.subtitle}
                </p>
              </div>

              <div className="relative mt-auto min-h-[245px] overflow-hidden rounded-[22px] bg-black">
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-full min-h-[245px] w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-[11px] font-semibold text-white/78 backdrop-blur-md">
                  Read more
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-black">
                    +
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
