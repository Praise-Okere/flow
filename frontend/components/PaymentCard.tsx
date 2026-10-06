import type { DemoStep } from "@/lib/demoWallet";
import type { AccountState } from "@/lib/stellar";
import { USDC_FAUCET_URL, formatAmount } from "@/lib/stellar";
import { ArrowUpRight, BoltIcon, Spinner } from "./icons";

export type Phase = "idle" | "signing" | "submitting" | "enable-signing" | "enable-submitting";

type Props = {
  connected: boolean;
  account: AccountState | null;
  accountLoading: boolean;
  phase: Phase;
  recipient: string;
  amount: string;
  recipientError: string | null;
  amountError: string | null;
  onRecipientChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  onConnect: () => void;
  onEnable: () => void;
  onSubmit: () => void;
  /** Offer a one-click in-browser demo wallet when not connected. */
  onDemo?: () => void;
  demoStep?: DemoStep | null;
};

const DEMO_LABEL: Record<DemoStep, string> = {
  creating: "Creating your wallet…",
  funding: "Adding 10 test USDC…",
};

const PHASE_LABEL: Partial<Record<Phase, string>> = {
  signing: "Confirm in Freighter…",
  submitting: "Sending…",
};

export function PaymentCard(props: Props) {
  const { connected, account, accountLoading, phase, recipient, amount, recipientError, amountError } = props;
  const busy = phase !== "idle";
  const ready = connected && account?.status === "ready";
  const needsSetup = connected && (account?.status === "missing" || account?.status === "no-trustline");
  const formDisabled = !ready || busy;
  const canSend = ready && !busy && recipient.length > 0 && !recipientError && !amountError && Number(amount) > 0;

  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Send USDC on Stellar</h1>
      <p className="mt-1.5 text-[15px] text-muted">Zero gas fees. One click.</p>

      {needsSetup && <EnableUsdc phase={phase} createsAccount={account?.status === "missing"} onEnable={props.onEnable} />}

      <form
        className="mt-7 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSend) props.onSubmit();
        }}
      >
        <div>
          <label htmlFor="recipient" className="mb-2 block text-[13px] font-medium text-ink">
            Recipient
          </label>
          <input
            id="recipient"
            value={recipient}
            onChange={(event) => props.onRecipientChange(event.target.value.trim())}
            placeholder="Recipient Stellar address..."
            disabled={formDisabled}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!recipientError}
            className={`h-12 w-full rounded-xl border bg-surface px-4 font-mono text-[13px] text-ink outline-none transition placeholder:font-sans placeholder:text-[14px] placeholder:text-muted/70 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
              recipientError
                ? "border-danger focus:ring-danger/10"
                : "border-line focus:border-ink focus:ring-black/5"
            }`}
          />
          {recipientError && <p className="mt-1.5 text-[12px] text-danger">{recipientError}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="amount" className="text-[13px] font-medium text-ink">
              Amount
            </label>
            {connected && (
              <span className="text-[12px] text-muted">
                {accountLoading && !account ? (
                  "Loading balance…"
                ) : account?.status === "ready" ? (
                  <>
                    Balance {formatAmount(account.usdc)} USDC
                    {Number(account.usdc) > 0 && (
                      <button
                        type="button"
                        onClick={props.onMax}
                        disabled={busy}
                        className="ml-2 font-medium text-ink hover:underline"
                      >
                        Max
                      </button>
                    )}
                  </>
                ) : null}
              </span>
            )}
          </div>
          <div
            className={`flex h-14 items-center rounded-xl border bg-surface pr-4 transition focus-within:bg-white focus-within:ring-4 ${
              formDisabled ? "opacity-60" : ""
            } ${amountError ? "border-danger focus-within:ring-danger/10" : "border-line focus-within:border-ink focus-within:ring-black/5"}`}
          >
            <input
              id="amount"
              value={amount}
              onChange={(event) => props.onAmountChange(event.target.value)}
              inputMode="decimal"
              disabled={formDisabled}
              aria-invalid={!!amountError}
              className="h-full min-w-0 flex-1 bg-transparent px-4 text-xl font-medium tabular-nums text-ink outline-none disabled:cursor-not-allowed"
            />
            <span className="text-[14px] font-medium text-muted">USDC</span>
          </div>
          {amountError && <p className="mt-1.5 text-[12px] text-danger">{amountError}</p>}
          {account?.status === "ready" && Number(account.usdc) === 0 && (
            <p className="mt-1.5 text-[12px] text-muted">
              No USDC yet?{" "}
              <a href={USDC_FAUCET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center font-medium text-ink hover:underline">
                Get testnet USDC from Circle
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </p>
          )}
        </div>

        {connected ? (
          <button
            type="submit"
            disabled={!canSend}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-black text-[16px] font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-black/25 disabled:active:scale-100"
          >
            {(phase === "signing" || phase === "submitting") && <Spinner />}
            {PHASE_LABEL[phase] ?? `Send ${amount && Number(amount) > 0 ? formatAmount(amount) : "0"} USDC`}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={props.onConnect}
              disabled={!!props.demoStep}
              className="h-14 w-full rounded-xl bg-black text-[16px] font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60"
            >
              Connect wallet to send
            </button>
            {props.onDemo && (
              <button
                type="button"
                onClick={props.onDemo}
                disabled={!!props.demoStep}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-[15px] font-medium text-ink transition hover:border-ink/30 active:scale-[0.99] disabled:cursor-wait"
              >
                {props.demoStep && <Spinner />}
                {props.demoStep ? DEMO_LABEL[props.demoStep] : "Try a demo wallet"}
              </button>
            )}
            {props.onDemo && (
              <p className="text-center text-[12px] text-muted">
                {props.demoStep
                  ? "Sponsored onboarding on Stellar Testnet. Takes about 15 seconds."
                  : "No extension needed. We create a testnet wallet with 10 USDC and 0 XLM."}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">Network fee</span>
          <span className="flex items-center gap-1.5 font-medium text-ink">
            0 XLM
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">Sponsored</span>
          </span>
        </div>
      </form>
    </div>
  );
}

function EnableUsdc({ phase, createsAccount, onEnable }: { phase: Phase; createsAccount: boolean; onEnable: () => void }) {
  const busy = phase === "enable-signing" || phase === "enable-submitting";
  return (
    <div className="mt-6 rounded-xl border border-line bg-surface p-4">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-ink shadow-sm">
          <BoltIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink">Enable USDC to get started</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            {createsAccount ? "Your account isn't on Stellar yet. " : "Your account needs a USDC trustline. "}
            Flow covers the fee and the reserve, so you don't need any XLM.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onEnable}
        disabled={phase !== "idle"}
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-black text-[14px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {busy && <Spinner className="h-3.5 w-3.5" />}
        {phase === "enable-signing" ? "Confirm in Freighter…" : phase === "enable-submitting" ? "Enabling USDC…" : "Enable USDC"}
      </button>
    </div>
  );
}
