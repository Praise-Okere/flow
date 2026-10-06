"use client";

import { useState } from "react";

type Endpoint = { method: "GET" | "POST"; path: string; summary: string; request: string; response: string };

// Example payloads. Values are illustrative; the shapes match the backend.
const ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/sponsor",
    summary: "Wrap a signed payment in a fee bump and submit it.",
    request: `{ "signedXdr": "AAAAAgAAAAB..." }`,
    response: `{
  "hash": "c1f0a9e47b3d...",
  "ledger": 1284731,
  "feeCharged": "200",
  "feePaidBy": "GSPONSOR...",
  "explorerUrl": "https://stellar.expert/explorer/testnet/tx/c1f0a9e47b3d..."
}`,
  },
  {
    method: "POST",
    path: "/onboard",
    summary: "Build a sponsored account + USDC trustline transaction.",
    request: `{ "publicKey": "GCQ2KJ5L..." }`,
    response: `{
  "xdr": "AAAAAgAAAAB...",
  "createsAccount": true
}`,
  },
  {
    method: "POST",
    path: "/onboard/submit",
    summary: "Submit the onboarding transaction once the user co-signs.",
    request: `{ "signedXdr": "AAAAAgAAAAB..." }`,
    response: `{
  "hash": "7a92be01d4c8...",
  "ledger": 1284702,
  "feeCharged": "400",
  "feePaidBy": "GSPONSOR...",
  "explorerUrl": "https://stellar.expert/explorer/testnet/tx/7a92be01d4c8..."
}`,
  },
  {
    method: "GET",
    path: "/stats",
    summary: "Lifetime network fees the sponsor has paid, from Horizon.",
    request: "",
    response: `{
  "feesPaid": "3400",
  "transactions": 10,
  "payments": 3,
  "onboardings": 7
}`,
  },
  {
    method: "GET",
    path: "/health",
    summary: "Sponsor address and its XLM balance.",
    request: "",
    response: `{
  "ok": true,
  "network": "testnet",
  "sponsor": "GSPONSOR...",
  "xlmBalance": "9998.4210300"
}`,
  },
];

export function ApiExplorer() {
  const [active, setActive] = useState(0);
  const endpoint = ENDPOINTS[active];

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-white shadow-card md:grid-cols-[280px_minmax(0,1fr)]">
      <div role="tablist" aria-label="Endpoints" className="grid grid-cols-2 gap-1 border-b border-line p-2 md:flex md:flex-col md:border-b-0 md:border-r">
        {ENDPOINTS.map((item, index) => (
          <button
            key={item.path}
            role="tab"
            aria-selected={index === active}
            onClick={() => setActive(index)}
            className={`min-w-0 rounded-xl px-3 py-2.5 text-left transition ${
              index === active ? "bg-surface text-ink" : "text-muted hover:bg-surface/60 hover:text-ink"
            }`}
          >
            <span className="flex flex-col gap-0.5 font-mono text-[12px] [overflow-wrap:anywhere] sm:flex-row sm:items-center sm:gap-2 sm:text-[13px]">
              <span className={`text-[11px] font-semibold ${item.method === "GET" ? "text-success" : "text-ink"}`}>{item.method}</span>
              {item.path}
            </span>
            <span className="mt-1 hidden text-[12px] leading-snug text-muted md:block">{item.summary}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-w-0 bg-ink p-4 font-mono text-[12px] leading-relaxed text-white/80 sm:p-6 sm:text-[12.5px]">
        <p className="mb-4 font-sans text-[13px] text-white/60 md:hidden">{endpoint.summary}</p>
        <p className="text-white">
          <span className="text-success">{endpoint.method}</span> {endpoint.path}
        </p>
        {endpoint.request && <pre className="mt-2 whitespace-pre-wrap text-white/70 [overflow-wrap:anywhere] md:overflow-x-auto md:whitespace-pre">{endpoint.request}</pre>}
        <p className="mt-6 font-sans text-[12px] text-white/50">Example response</p>
        <pre key={endpoint.path} className="mt-2 animate-fade-up whitespace-pre-wrap [overflow-wrap:anywhere] md:overflow-x-auto md:whitespace-pre">{endpoint.response}</pre>
      </div>
    </div>
  );
}
