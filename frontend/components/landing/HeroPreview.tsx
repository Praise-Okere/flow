"use client";

import { useEffect, useRef } from "react";
import { PaymentCard } from "@/components/PaymentCard";

const noop = () => {};

// The real payment card, frozen in a "ready to send" state.
export function HeroPreview() {
  const frozen = useRef<HTMLDivElement>(null);

  // React 18 doesn't pass `inert` through, so set it directly to keep the preview out of tab order.
  useEffect(() => frozen.current?.setAttribute("inert", ""), []);

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-x-6 -inset-y-8 rounded-[2rem] bg-grid [mask-image:radial-gradient(closest-side,#000_55%,transparent)]" />
      <div ref={frozen} aria-hidden className="pointer-events-none relative select-none">
        <PaymentCard
          connected
          account={{ status: "ready", usdc: "250" }}
          accountLoading={false}
          phase="idle"
          recipient="GCQ2KJ5LHVOWKHAKZ3EUXJ7BMPT3XRAWVPL4N6LJUQJ6GJV4AYXF2Q7M"
          amount="25"
          recipientError={null}
          amountError={null}
          onRecipientChange={noop}
          onAmountChange={noop}
          onMax={noop}
          onConnect={noop}
          onEnable={noop}
          onSubmit={noop}
        />
      </div>
    </div>
  );
}
