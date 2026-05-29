import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "./components/zalary/Footer";
import { Navbar } from "./components/zalary/Navbar";

const featured = {
  category: "Confidential Payroll",
  title: "Why private salary infrastructure belongs onchain",
  excerpt:
    "Payroll is one of the most sensitive workflows in a company. Zalary combines verifiable execution with encrypted operational data, giving teams a path to automate payroll without exposing compensation patterns.",
  date: "May 2026",
  read: "6 min read",
};

const posts = [
  {
    icon: ShieldCheck,
    category: "Security",
    title: "Designing payroll flows that reveal less by default",
    excerpt:
      "A practical look at minimizing exposed balances, employee amounts, and repeated payout signals across modern finance teams.",
    date: "May 2026",
    read: "5 min read",
  },
  {
    icon: FileText,
    category: "Operations",
    title: "From spreadsheet approvals to structured salary runs",
    excerpt:
      "How payroll operators can move from manual coordination to reusable templates, controlled funding, and clear run states.",
    date: "Apr 2026",
    read: "4 min read",
  },
  {
    icon: BookOpenText,
    category: "Product",
    title: "What employers should expect from confidential payroll",
    excerpt:
      "The core product principles behind Zalary: predictable funding, private claim logic, transparent status, and employee self-service.",
    date: "Apr 2026",
    read: "7 min read",
  },
];

const briefs = [
  "Payroll privacy is not a feature toggle. It has to be part of the workflow architecture.",
  "The best payroll systems reduce operational exposure while increasing execution confidence.",
  "Confidential finance tools should feel simple at the surface and precise under the hood.",
];

export function BlogPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-36 md:px-10 lg:px-14">
        <section className="grid min-h-[calc(100svh-9rem)] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-[#FE9E15]">
              Zalary Journal
            </p>
            <h1 className="text-5xl font-semibold leading-[0.98] tracking-normal md:text-7xl">
              Notes on private payroll,
              <span className="block text-white/55">finance, and trust.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/62 md:text-lg">
              Thoughtful writing for teams building better payment operations:
              less exposure, cleaner workflows, and more confidence in every run.
            </p>
          </div>

          <article className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[#0D0D0B] p-6 shadow-2xl md:p-8">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(254,158,21,0.22),transparent_42%,rgba(217,249,157,0.08))]" />
            <div className="relative flex min-h-[520px] flex-col justify-between rounded-[24px] border border-white/10 bg-black p-6 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-[#FE9E15] px-3 py-1 text-xs font-semibold text-black">
                  Featured
                </span>
                <div className="flex items-center gap-4 text-xs text-white/45">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {featured.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} />
                    {featured.read}
                  </span>
                </div>
              </div>

              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#FE9E15]">
                  {featured.category}
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-normal md:text-5xl">
                  {featured.title}
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 md:text-base">
                  {featured.excerpt}
                </p>
              </div>

              <Link
                to="/use-cases"
                className="decrypt-hover-btn inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Read Use Cases
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </section>

        <section className="border-t border-white/10 py-16">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#FE9E15]">
                Latest Thinking
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
                Practical essays for payroll teams.
              </h2>
            </div>
            <a
              href="https://docs.zalary.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="decrypt-hover-btn inline-flex w-fit items-center gap-2 rounded-full bg-[#FE9E15] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#FE9E15]/90"
            >
              View Docs
              <ArrowRight size={16} />
            </a>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {posts.map((post) => {
              const Icon = post.icon;

              return (
                <article
                  key={post.title}
                  className="group rounded-[24px] border border-white/10 bg-white/[0.035] p-6 transition hover:border-white/20 hover:bg-white/[0.055]"
                >
                  <div className="mb-10 flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black text-[#FE9E15]">
                      <Icon size={20} />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-white/38">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold leading-tight tracking-normal">
                    {post.title}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-white/55">
                    {post.excerpt}
                  </p>
                  <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/42">
                    <span>{post.date}</span>
                    <span>{post.read}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#FE9E15]">
              Editorial Position
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
              Clear, measured, and useful.
            </h2>
          </div>

          <div className="grid gap-4">
            {briefs.map((brief, index) => (
              <div
                key={brief}
                className="grid gap-4 rounded-[22px] border border-white/10 bg-white/[0.035] p-5 md:grid-cols-[auto_1fr]"
              >
                <span className="font-mono text-sm text-[#FE9E15]">
                  0{index + 1}
                </span>
                <p className="text-lg leading-7 text-white/70">{brief}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
