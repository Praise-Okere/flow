"use client";

import { useEffect, useState } from "react";
import { type SponsorStats, getSponsorStats } from "@/lib/api";

type Props = { refreshKey: number };

function stroopsToXlm(stroops: string): string {
  const xlm = (Number(stroops) / 1e7).toFixed(7);
  return xlm.replace(/0+$/, "").replace(/\.$/, "");
}

/** Live total of network fees the sponsor has paid on users' behalf. */
export function SponsorCounter({ refreshKey }: Props) {
  const [stats, setStats] = useState<SponsorStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSponsorStats()
      .then((result) => !cancelled && setStats(result))
      .catch(() => {
        // Keep the last known value; the counter is informational.
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!stats) return <span>Network fees sponsored with fee-bump transactions</span>;

  return (
    <span aria-live="polite">
      Flow has sponsored <span className="font-medium tabular-nums text-ink">{stroopsToXlm(stats.feesPaid)} XLM</span> in network
      fees across <span className="font-medium tabular-nums text-ink">{stats.transactions.toLocaleString("en-US")}</span>{" "}
      {stats.transactions === 1 ? "transaction" : "transactions"}
    </span>
  );
}
