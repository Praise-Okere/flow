import Link from "next/link";
import { shortAddress } from "@/lib/stellar";
import { FlowMark, Spinner } from "./icons";

type Props = {
  address: string | null;
  connecting: boolean;
  /** The connected account is the in-browser demo wallet, not Freighter. */
  demo?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function Header({ address, connecting, demo, onConnect, onDisconnect }: Props) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
      <div className="flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <FlowMark className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight text-ink">Flow</span>
        </Link>
        {/* Hidden on the narrowest phones so a connected wallet pill still fits. */}
        <span className="ml-1 hidden rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted min-[400px]:inline">
          Testnet
        </span>
      </div>

      {address ? (
        <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1 pl-3 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
          <span className="ml-1 font-mono text-[13px] text-ink" title={address}>
            {shortAddress(address)}
          </span>
          {demo && (
            <span className="ml-1.5 hidden rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted min-[400px]:inline" title="In-browser testnet wallet">
              Demo
            </span>
          )}
          <button
            onClick={onDisconnect}
            className="ml-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-muted transition hover:bg-surface hover:text-ink"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={connecting}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-black px-4 text-[13px] font-medium text-white transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-70"
        >
          {connecting && <Spinner className="h-3.5 w-3.5" />}
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
    </header>
  );
}
