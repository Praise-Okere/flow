"use client";

import { useState } from "react";
import type { SubmitResult } from "@/lib/api";
import { formatAmount, shortAddress } from "@/lib/stellar";
import { ArrowUpRight, CheckIcon, CopyIcon } from "./icons";

type Props = {
  result: SubmitResult;
  amount: string;
  recipient: string;
  onSendAnother: () => void;
};

export function SuccessCard({ result, amount, recipient, onSendAnother }: Props) {
  const [copied, setCopied] = useState(false);
  const sponsoredXlm = (Number(result.feeCharged) / 1e7).toFixed(7);

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(result.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); the hash is still visible.
    }
  };

  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-white p-8 text-center shadow-card">
      <div className="mx-auto flex h-14 w-14 animate-pop items-center justify-center rounded-full bg-success text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.55)]">
        <CheckIcon className="h-7 w-7" />
      </div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Payment Successful</h1>
      <p className="mt-2 text-[15px] text-muted">
        <span className="font-medium text-ink">{formatAmount(amount)} USDC</span> sent to{" "}
        <span className="font-mono text-ink" title={recipient}>
          {shortAddress(recipient)}
        </span>
      </p>

      <dl className="mt-7 divide-y divide-line rounded-xl bg-surface text-left text-[13px]">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-muted">Network fee</dt>
          <dd className="text-right">
            <span className="font-medium text-ink">0 XLM</span>{" "}
            <span className="text-success">(sponsored by Flow)</span>
          </dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-muted">Paid by sponsor</dt>
          <dd className="font-mono text-ink">{sponsoredXlm} XLM</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-muted">Ledger</dt>
          <dd className="font-mono text-ink">{result.ledger.toLocaleString("en-US")}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="text-muted">Transaction</dt>
          <dd>
            <button
              onClick={copyHash}
              className="inline-flex items-center gap-1.5 font-mono text-ink transition hover:text-muted"
              title={result.hash}
            >
              {copied ? "Copied" : `${result.hash.slice(0, 8)}…${result.hash.slice(-8)}`}
              <CopyIcon className="h-3.5 w-3.5" />
            </button>
          </dd>
        </div>
      </dl>

      <a
        href={result.explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-1 text-[14px] font-medium text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
      >
        View on Stellar Expert
        <ArrowUpRight className="h-4 w-4" />
      </a>

      <button
        onClick={onSendAnother}
        className="mt-7 h-12 w-full rounded-xl bg-black text-[15px] font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99]"
      >
        Send Another
      </button>
    </div>
  );
}
