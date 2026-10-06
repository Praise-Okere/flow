"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityList } from "@/components/ActivityList";
import { ErrorModal, type ModalError } from "@/components/ErrorModal";
import { Header } from "@/components/Header";
import { PaymentCard, type Phase } from "@/components/PaymentCard";
import { SponsorCounter } from "@/components/SponsorCounter";
import { SuccessCard } from "@/components/SuccessCard";
import { ApiError, requestOnboarding, sponsorPayment, submitOnboarding, type SubmitResult } from "@/lib/api";
import {
  type DemoStep,
  type DemoWallet,
  clearDemoWallet,
  createDemoWallet,
  loadDemoWallet,
  signWithKeypair,
} from "@/lib/demoWallet";
import {
  type AccountState,
  USDC_FAUCET_URL,
  buildPaymentXdr,
  formatAmount,
  getAccountState,
  isValidAddress,
} from "@/lib/stellar";
import { FREIGHTER_URL, WalletError, connectWallet, restoreConnection, signWithFreighter } from "@/lib/wallet";

type Success = { result: SubmitResult; amount: string; recipient: string };

// Freighter has no "disconnect" API, so remember the choice for this tab.
const DISCONNECTED_KEY = "flow:disconnected";
function readDisconnected(): boolean {
  try {
    return sessionStorage.getItem(DISCONNECTED_KEY) === "1";
  } catch {
    return false;
  }
}
function writeDisconnected(value: boolean) {
  try {
    if (value) sessionStorage.setItem(DISCONNECTED_KEY, "1");
    else sessionStorage.removeItem(DISCONNECTED_KEY);
  } catch {
    // Storage can be blocked; disconnect then only lasts until the next focus.
  }
}

function toModalError(error: unknown, fallbackTitle: string): ModalError {
  if (error instanceof WalletError) {
    if (error.kind === "not-installed") {
      return {
        title: "Freighter not found",
        message: "Flow uses the Freighter wallet to sign payments. Install the extension, then refresh this page.",
        action: { label: "Get Freighter", href: FREIGHTER_URL },
      };
    }
    if (error.kind === "wrong-network") return { title: "Wrong network", message: error.message };
    if (error.kind === "rejected") return { title: "Request cancelled", message: error.message };
  }
  if (error instanceof ApiError && error.code === "op_underfunded") {
    return {
      title: "Insufficient balance",
      message: error.message,
      action: { label: "Get testnet USDC", href: USDC_FAUCET_URL },
    };
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return { title: fallbackTitle, message };
}

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState<AccountState | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("10");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<ModalError | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [demo, setDemo] = useState<DemoWallet | null>(null);
  const [demoStep, setDemoStep] = useState<DemoStep | null>(null);
  // Bumped whenever the sponsor pays a fee, so history and the counter reload.
  const [activityKey, setActivityKey] = useState(0);

  const refreshAccount = useCallback(async (publicKey: string) => {
    setAccountLoading(true);
    try {
      setAccount(await getAccountState(publicKey));
    } catch (err) {
      setError(toModalError(err, "Couldn't load your account"));
    } finally {
      setAccountLoading(false);
    }
  }, []);

  // Reconnect silently if this site was approved before, and follow account
  // switches made in Freighter while the tab was in the background.
  useEffect(() => {
    const sync = async () => {
      const saved = loadDemoWallet();
      if (saved) {
        setDemo(saved);
        setAddress(saved.address);
        return;
      }
      if (readDisconnected()) return;
      const restored = await restoreConnection();
      if (restored) setAddress(restored);
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  useEffect(() => {
    setAccount(null);
    if (address) refreshAccount(address);
  }, [address, refreshAccount]);

  const recipientError = useMemo(() => {
    if (!recipient) return null;
    if (!isValidAddress(recipient)) return "Enter a valid Stellar address (starts with G, 56 characters).";
    if (recipient === address) return "You can't send USDC to yourself.";
    return null;
  }, [recipient, address]);

  const amountError = useMemo(() => {
    if (!amount) return null;
    if (Number(amount) <= 0) return "Enter an amount greater than 0.";
    if (account?.status === "ready" && Number(amount) > Number(account.usdc)) {
      return `Insufficient balance. You have ${formatAmount(account.usdc)} USDC.`;
    }
    return null;
  }, [amount, account]);

  // Signs with Freighter, or locally when the in-browser demo wallet is active.
  const sign = (xdr: string, publicKey: string) =>
    demo ? Promise.resolve(signWithKeypair(xdr, demo.secret)) : signWithFreighter(xdr, publicKey);

  const handleDemo = async () => {
    try {
      const wallet = await createDemoWallet(setDemoStep);
      writeDisconnected(false);
      setDemo(wallet);
      setAddress(wallet.address);
      setRecipient(wallet.friendAddress);
      setActivityKey((key) => key + 1);
    } catch (err) {
      // A wallet that was created but not funded is still usable with the Circle faucet.
      const saved = loadDemoWallet();
      if (saved) {
        setDemo(saved);
        setAddress(saved.address);
      }
      setError(toModalError(err, "Couldn't create a demo wallet"));
    } finally {
      setDemoStep(null);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      setAddress(await connectWallet());
      writeDisconnected(false);
    } catch (err) {
      setError(toModalError(err, "Couldn't connect wallet"));
    } finally {
      setConnecting(false);
    }
  };

  const handleEnable = async () => {
    if (!address) return;
    setPhase("enable-signing");
    try {
      const { xdr } = await requestOnboarding(address);
      const signed = await sign(xdr, address);
      setPhase("enable-submitting");
      await submitOnboarding(signed);
      setActivityKey((key) => key + 1);
      await refreshAccount(address);
    } catch (err) {
      if (err instanceof ApiError && err.code === "already_enabled") await refreshAccount(address);
      else setError(toModalError(err, "Couldn't enable USDC"));
    } finally {
      setPhase("idle");
    }
  };

  const handleSend = async () => {
    if (!address) return;
    setPhase("signing");
    try {
      const xdr = await buildPaymentXdr(address, recipient, amount);
      const signed = await sign(xdr, address);
      setPhase("submitting");
      const result = await sponsorPayment(signed);
      setSuccess({ result, amount, recipient });
      setActivityKey((key) => key + 1);
      refreshAccount(address);
    } catch (err) {
      setError(toModalError(err, "Payment failed"));
    } finally {
      setPhase("idle");
    }
  };

  const handleSendAnother = () => {
    setSuccess(null);
    setRecipient(demo?.friendAddress ?? "");
    setAmount("10");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        address={address}
        connecting={connecting}
        demo={!!demo}
        onConnect={handleConnect}
        onDisconnect={() => {
          writeDisconnected(true);
          clearDemoWallet();
          setDemo(null);
          setAddress(null);
          setSuccess(null);
        }}
      />

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-16">
        <div className="w-full max-w-[480px]">
          {success ? (
            <SuccessCard {...success} onSendAnother={handleSendAnother} />
          ) : (
            <PaymentCard
              connected={!!address}
              account={account}
              accountLoading={accountLoading}
              phase={phase}
              recipient={recipient}
              amount={amount}
              recipientError={recipientError}
              amountError={amountError}
              onRecipientChange={setRecipient}
              onAmountChange={(value) => {
                if (/^\d*\.?\d{0,7}$/.test(value)) setAmount(value);
              }}
              onMax={() => account?.status === "ready" && setAmount(account.usdc.replace(/\.?0+$/, ""))}
              onConnect={handleConnect}
              onEnable={handleEnable}
              onSubmit={handleSend}
              onDemo={handleDemo}
              demoStep={demoStep}
            />
          )}

          {address && <ActivityList address={address} refreshKey={activityKey} />}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-[13px] text-muted sm:flex-row sm:px-6 sm:text-left">
        <span>Built on Stellar</span>
        <SponsorCounter refreshKey={activityKey} />
      </footer>

      <ErrorModal error={error} onClose={() => setError(null)} />
    </div>
  );
}
