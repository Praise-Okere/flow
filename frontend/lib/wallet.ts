import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./stellar";

export const FREIGHTER_URL = "https://www.freighter.app";

export class WalletError extends Error {
  constructor(
    message: string,
    public kind: "not-installed" | "wrong-network" | "rejected" | "other" = "other",
  ) {
    super(message);
  }
}

async function assertInstalled() {
  const { isConnected: installed } = await isConnected();
  if (!installed) {
    throw new WalletError("Freighter is not installed in this browser.", "not-installed");
  }
}

async function assertTestnet() {
  const details = await getNetworkDetails();
  if (details.error) throw new WalletError(details.error.message);
  if (details.networkPassphrase !== NETWORK_PASSPHRASE) {
    throw new WalletError(
      `Freighter is on ${details.network || "another network"}. Switch it to Testnet and try again.`,
      "wrong-network",
    );
  }
}

/** Returns the address if this site was already approved in Freighter, without prompting. */
export async function restoreConnection(): Promise<string | null> {
  try {
    if (!(await isConnected()).isConnected) return null;
    if (!(await isAllowed()).isAllowed) return null;
    const { address, error } = await getAddress();
    return error || !address ? null : address;
  } catch {
    return null;
  }
}

export async function connectWallet(): Promise<string> {
  await assertInstalled();
  const { address, error } = await requestAccess();
  if (error || !address) {
    throw new WalletError(error?.message ?? "Freighter did not share an address.", "rejected");
  }
  await assertTestnet();
  return address;
}

/** Asks Freighter to sign (not submit) a transaction, returning the signed XDR. */
export async function signWithFreighter(xdr: string, address: string): Promise<string> {
  await assertInstalled();
  await assertTestnet();
  const { signedTxXdr, error } = await signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  if (error || !signedTxXdr) {
    const message = error?.message ?? "Freighter did not return a signature.";
    throw new WalletError(
      /reject|declin|denied|cancel/i.test(message) ? "You declined the request in Freighter." : message,
      "rejected",
    );
  }
  return signedTxXdr;
}
