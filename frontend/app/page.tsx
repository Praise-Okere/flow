import Link from "next/link";
import { ApiExplorer } from "@/components/landing/ApiExplorer";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { MobileMenu } from "@/components/landing/MobileMenu";
import { Reveal } from "@/components/landing/Reveal";
import { ArrowRight, ArrowUpRight, BoltIcon, FlowMark, GlobeIcon, LayersIcon, PenIcon, ShieldIcon } from "@/components/icons";

// Kept local so this server page does not pull in the Stellar or Freighter SDKs.
const FREIGHTER_URL = "https://www.freighter.app";
const USDC_FAUCET_URL = "https://faucet.circle.com";
const FEE_BUMP_DOCS = "https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/fee-bump-transactions";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#developers", label: "Developers" },
];

const STEPS = [
  {
    icon: PenIcon,
    title: "You sign",
    body: "Freighter signs a USDC payment from your account. It is not submitted yet.",
  },
  {
    icon: LayersIcon,
    title: "Flow wraps it",
    body: "The backend checks the payment, wraps it in a fee-bump transaction and signs as the fee source.",
  },
  {
    icon: GlobeIcon,
    title: "Stellar settles",
    body: "Only the fee source is charged, so your XLM balance never moves. The ledger closes in seconds.",
  },
];

const ONBOARD_OPS = [
  { op: "beginSponsoringFutureReserves(user)", signer: "sponsor" },
  { op: "createAccount(user, 0 XLM)", signer: "sponsor", note: "only for new accounts" },
  { op: "changeTrust(USDC)", signer: "user" },
  { op: "endSponsoringFutureReserves()", signer: "user" },
];

export default function Landing() {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip">
      <Nav />

      <main>
        <Hero />
        <HowItWorks />
        <Onboarding />
        <Guardrails />
        <Developers />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

function LaunchButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/app"
      className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-black font-medium text-white transition hover:bg-neutral-800 active:scale-[0.98] ${className}`}
    >
      Launch app
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <FlowMark className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight text-ink">Flow</span>
        </Link>

        <nav className="hidden items-center gap-8 text-[14px] text-muted md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="transition hover:text-ink">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LaunchButton className="h-10 px-4 text-[13px] md:h-9" />
          <MobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          Live on Stellar Testnet
        </span>
        <h1 className="mt-6 text-[2.05rem] font-semibold leading-[1.05] tracking-tighter text-ink min-[360px]:text-[2.35rem] min-[400px]:text-[2.75rem] sm:text-6xl">
          Send USDC.
          <br />
          <span className="text-muted">Flow pays the gas.</span>
        </h1>
        <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-muted">
          Sign once in Freighter. Flow sponsors the network fee and the account reserve, so nobody needs XLM.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <LaunchButton className="h-12 px-6 text-[15px]" />
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-6 text-[15px] font-medium text-ink transition hover:border-ink/30 active:scale-[0.98]"
          >
            How it works
          </a>
        </div>
      </div>

      <div className="animate-fade-up mx-auto w-full max-w-[440px] [animation-delay:120ms]">
        <HeroPreview />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 sm:px-6">
        <Reveal>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            One signature. The sponsor covers the rest.
          </h2>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted">
            Flow uses Stellar{" "}
            <a href={FEE_BUMP_DOCS} target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              fee-bump transactions
            </a>
            . Your payment stays yours. Only the fee is paid by someone else.
          </p>
        </Reveal>

        <div className="relative mt-12 sm:mt-16">
          {/* The rail a payment travels along, desktop only. */}
          <div aria-hidden className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px overflow-hidden bg-line md:block">
            <div className="h-full w-full animate-travel">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-ink to-transparent" />
            </div>
          </div>

          <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="relative">
                {/* Mobile: vertical rail joining the step icons. */}
                {index < STEPS.length - 1 && (
                  <span aria-hidden className="absolute -bottom-8 left-7 top-16 w-px bg-line md:hidden" />
                )}
                <Reveal delay={index * 120} className="flex gap-5 md:flex-col md:items-center md:text-center">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-ink shadow-card">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink md:mt-6">{title}</h3>
                    <p className="mt-2 max-w-[19rem] text-[15px] leading-relaxed text-muted">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Onboarding() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:py-24 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
      <Reveal>
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Start with zero XLM.</h2>
        <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-muted">
          A new wallet doesn&apos;t exist on Stellar until it holds XLM. Flow creates the account and the USDC trustline in one
          sponsored transaction, and holds the reserves for you.
        </p>
        <p className="mt-6 flex items-center gap-2 text-[14px] font-medium text-ink">
          <BoltIcon className="h-4 w-4" />
          One click on &ldquo;Enable USDC&rdquo; in the app.
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 text-[12px] text-muted sm:px-5">
            <span className="font-medium text-ink">Onboarding transaction</span>
            <span>Fee paid by sponsor</span>
          </div>
          <ol className="space-y-1 p-2 sm:p-3">
            {ONBOARD_OPS.map(({ op, signer, note }, index) => (
              <li key={op} className="flex items-start gap-3 rounded-xl px-2 py-3 transition hover:bg-surface sm:items-center sm:gap-4 sm:px-3">
                <span className="w-4 shrink-0 text-right font-mono text-[12px] leading-5 text-muted">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <code className="block font-mono text-[12px] leading-5 text-ink [overflow-wrap:anywhere] sm:text-[13px]">{op}</code>
                  {note && <span className="text-[12px] text-muted">{note}</span>}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    signer === "sponsor" ? "bg-success/10 text-success" : "border border-line text-muted"
                  }`}
                >
                  {signer}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}

function Guardrails() {
  return (
    <section id="security" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The sponsor only pays for payments that will land.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Reveal className="md:col-span-2 md:row-span-2">
            <div className="relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden rounded-2xl bg-ink p-6 text-white sm:min-h-[300px] sm:p-8">
              <div aria-hidden className="bg-grid-dark absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_75%)]" />
              <ShieldIcon className="relative mb-auto h-8 w-8 text-success" />
              <h3 className="relative mt-10 text-xl font-semibold tracking-tight sm:text-2xl">Pre-flight against Horizon</h3>
              <p className="relative mt-3 max-w-[48ch] text-[15px] leading-relaxed text-white/65">
                Before anything is submitted, Flow checks that the sender exists with enough USDC and the recipient can receive
                it. Doomed payments never reach the network, so the sponsor never pays for a failed transaction.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <GuardCard title="One payment, in USDC" body="Exactly one payment operation, in USDC from the configured issuer." />
          </Reveal>
          <Reveal delay={160}>
            <GuardCard title="Signed and expiring" body="The source must sign, and every transaction needs time bounds." />
          </Reveal>
          <Reveal delay={80}>
            <GuardCard title="Capped fees" body="The fee per operation can't exceed the configured maximum base fee." />
          </Reveal>
          <Reveal delay={160} className="md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">Rate limited per IP</h3>
                <p className="mt-2 max-w-[40ch] text-[14px] leading-relaxed text-muted">
                  Keeps one client from draining the sponsor account.
                </p>
              </div>
              <p className="font-mono text-5xl font-medium tracking-tighter text-ink">
                20<span className="text-xl text-muted">/min</span>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function GuardCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="h-full rounded-2xl border border-line bg-white p-6 shadow-card">
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Developers() {
  return (
    <section id="developers" className="scroll-mt-20 border-t border-line bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 sm:px-6">
        <Reveal>
          <p className="text-[13px] font-medium text-muted">For developers</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">A small API. Plain JSON.</h2>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            Run the Express backend with your own sponsor key and drop gasless USDC into any Stellar app.
          </p>
        </Reveal>
        <Reveal delay={120} className="mt-12">
          <ApiExplorer />
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28 text-center sm:px-6">
      <Reveal>
        <FlowMark className="mx-auto h-12 w-12" />
        <h2 className="mx-auto mt-8 max-w-xl text-[2rem] font-semibold leading-[1.1] tracking-tighter text-ink sm:text-5xl">
          Send your first sponsored payment.
        </h2>
        <p className="mx-auto mt-4 max-w-[44ch] text-[16px] leading-relaxed text-muted">
          You need Freighter set to Testnet. Circle&apos;s faucet gives you testnet USDC.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <LaunchButton className="h-12 px-6 text-[15px]" />
          <a
            href={USDC_FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-6 text-[15px] font-medium text-ink transition hover:border-ink/30 active:scale-[0.98]"
          >
            Get testnet USDC
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <FlowMark className="h-5 w-5" />
          <span>Flow is built on Stellar.</span>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 sm:flex sm:flex-wrap">
          <Link href="/app" className="py-2 transition hover:text-ink">App</Link>
          <a href={FREIGHTER_URL} target="_blank" rel="noreferrer" className="py-2 transition hover:text-ink">Freighter</a>
          <a href={USDC_FAUCET_URL} target="_blank" rel="noreferrer" className="py-2 transition hover:text-ink">USDC faucet</a>
          <a href={FEE_BUMP_DOCS} target="_blank" rel="noreferrer" className="py-2 transition hover:text-ink">Fee-bump docs</a>
        </nav>
      </div>
    </footer>
  );
}
