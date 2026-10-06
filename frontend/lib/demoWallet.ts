import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { fundDemoWallet, requestOnboarding, submitOnboarding } from "./api";
import { NETWORK_PASSPHRASE } from "./stellar";

/**
 * A throwaway testnet wallet that lives in this browser tab, so people can try
 * Flow without installing Freighter. It goes through the same sponsored
 * onboarding and payment flow; only the signer is different.
 */
export type DemoWallet = { secret: string; address: string; friendAddress: string };

const STORAGE_KEY = "flow:demo-wallet";

export function loadDemoWallet(): DemoWallet | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoWallet) : null;
  } catch {
    return null;
  }
}

function saveDemoWallet(wallet: DemoWallet) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  } catch {
    // Storage can be blocked; the wallet then lasts until the page reloads.
  }
}

export function clearDemoWallet() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

export function signWithKeypair(xdr: string, secret: string): string {
  const tx = TransactionBuilder.fromXdr(xdr, NETWORK_PASSPHRASE);
  tx.sign(Keypair.fromSecret(secret));
  return tx.toXDR();
}

async function onboard(keypair: Keypair) {
  const { xdr } = await requestOnboarding(keypair.publicKey());
  await submitOnboarding(signWithKeypair(xdr, keypair.secret()));
}

export type DemoStep = "creating" | "funding";

/**
 * Creates the demo wallet (sponsored account + USDC trustline), tops it up with
 * testnet USDC, and creates a second wallet to send to.
 */
export async function createDemoWallet(onStep: (step: DemoStep) => void): Promise<DemoWallet> {
  const me = Keypair.random();
  const friend = Keypair.random();

  const wallet = { secret: me.secret(), address: me.publicKey(), friendAddress: friend.publicKey() };

  onStep("creating");
  await onboard(me);
  // Keep the wallet even if a later step fails; it can still be topped up from a faucet.
  saveDemoWallet(wallet);

  // Both onboardings use the sponsor as source, so they run one after the other;
  // funding doesn't touch the sponsor and can overlap with the second one.
  onStep("funding");
  await Promise.all([fundDemoWallet(me.publicKey()), onboard(friend)]);
  return wallet;
}
