"use client";

import { useEffect, useState } from "react";
import { type PaymentItem, formatAmount, getRecentPayments, shortAddress } from "@/lib/stellar";
import { ArrowUpRight } from "./icons";

type Props = {
  address: string;
  /** Bump to reload, e.g. after a payment lands. */
  refreshKey: number;
};

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (seconds > -60) return "just now";
  if (seconds > -3600) return relativeTime.format(Math.round(seconds / 60), "minute");
  if (seconds > -86400) return relativeTime.format(Math.round(seconds / 3600), "hour");
  return relativeTime.format(Math.round(seconds / 86400), "day");
}

export function ActivityList({ address, refreshKey }: Props) {
  const [items, setItems] = useState<PaymentItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    getRecentPayments(address)
      .then((result) => !cancelled && setItems(result))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [address, refreshKey]);

  // Clear stale rows when switching accounts.
  useEffect(() => setItems(null), [address]);

  return (
    <section className="mt-6 animate-fade-up rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-[14px] font-semibold text-ink">
        Recent activity
      </h2>

      {failed ? (
        <p className="mt-4 text-[13px] text-muted">Couldn&apos;t load your activity from Horizon. It will retry after your next payment.</p>
      ) : items === null ? (
        <ul className="mt-3 divide-y divide-line" aria-label="Loading activity">
          {[0, 1, 2].map((key) => (
            <li key={key} className="flex items-center justify-between py-3">
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-surface" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-surface" />
              </div>
              <div className="h-3 w-14 animate-pulse rounded bg-surface" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">No USDC payments yet. Your sent and received payments will show up here.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-surface"
              >
                <div className="min-w-0">
                  <p className="text-[14px] text-ink">
                    {item.direction === "sent" ? "Sent to " : "Received from "}
                    <span className="font-mono text-[13px]" title={item.counterparty}>
                      {shortAddress(item.counterparty)}
                    </span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                    {timeAgo(item.createdAt)}
                    {item.successful && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">Success</span>
                    )}
                    {item.direction === "sent" && item.sponsored && (
                      <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">0 XLM fee</span>
                    )}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[14px] font-medium tabular-nums text-ink">
                  {item.direction === "sent" ? "−" : "+"}
                  {formatAmount(item.amount)}
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted opacity-0 transition group-hover:opacity-100" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
