import {
  Asset,
  Horizon,
  Networks,
  NotFoundError,
  Operation,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
export const USDC_FAUCET_URL = "https://faucet.circle.com";

const server = new Horizon.Server(HORIZON_URL);

export type AccountState =
  | { status: "missing" }
  | { status: "no-trustline" }
  | { status: "ready"; usdc: string };

export async function getAccountState(publicKey: string): Promise<AccountState> {
  try {
    const account = await server.loadAccount(publicKey);
    const line = account.balances.find(
      (balance) =>
        balance.asset_type === "credit_alphanum4" &&
        balance.asset_code === USDC.getCode() &&
        balance.asset_issuer === USDC.getIssuer(),
    );
    return line ? { status: "ready", usdc: line.balance } : { status: "no-trustline" };
  } catch (error) {
    if (error instanceof NotFoundError) return { status: "missing" };
    throw error;
  }
}

export function isValidAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address);
}

/**
 * Builds an unsigned USDC payment. The inner fee is never charged to the user:
 * the backend wraps the signed transaction in a fee-bump paid by the sponsor.
 */
export async function buildPaymentXdr(from: string, to: string, amount: string): Promise<string> {
  const account = await server.loadAccount(from);
  return new TransactionBuilder(account, { fee: "0", networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.payment({ destination: to, asset: USDC, amount }))
    .setTimeout(180)
    .build()
    .toXDR();
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** Formats a 7-decimal Stellar amount without trailing zeros, keeping at least 2 decimals. */
export function formatAmount(amount: string): string {
  const [whole, fraction = ""] = amount.split(".");
  const trimmed = fraction.replace(/0+$/, "").padEnd(2, "0");
  return `${Number(whole).toLocaleString("en-US")}.${trimmed}`;
}

export type PaymentItem = {
  id: string;
  direction: "sent" | "received";
  amount: string;
  counterparty: string;
  createdAt: string;
  successful: boolean;
  /** True when someone other than the sender paid the network fee. */
  sponsored: boolean;
  explorerUrl: string;
};

// Path payments count too: that's how USDC arrives from the DEX or a faucet.
const USDC_TRANSFER_TYPES = new Set<string>(["payment", "path_payment_strict_receive", "path_payment_strict_send"]);
type UsdcTransferRecord =
  | Horizon.ServerApi.PaymentOperationRecord
  | Horizon.ServerApi.PathPaymentOperationRecord
  | Horizon.ServerApi.PathPaymentStrictSendOperationRecord;

/** The account's most recent USDC payments, newest first. */
export async function getRecentPayments(publicKey: string, limit = 3): Promise<PaymentItem[]> {
  const page = await server.payments().forAccount(publicKey).order("desc").limit(30).join("transactions").call();
  return page.records
    .filter(
      (record): record is UsdcTransferRecord =>
        USDC_TRANSFER_TYPES.has(record.type) &&
        "asset_code" in record &&
        record.asset_code === USDC.getCode() &&
        record.asset_issuer === USDC.getIssuer(),
    )
    .slice(0, limit)
    .map((record) => {
      const sent = record.from === publicKey;
      // With join=transactions the SDK keeps the raw transaction under `transaction_attr`.
      const tx = (record as unknown as { transaction_attr?: { fee_account?: string } }).transaction_attr;
      return {
        id: record.id,
        direction: sent ? "sent" : "received",
        amount: record.amount,
        counterparty: sent ? record.to : record.from,
        createdAt: record.created_at,
        successful: record.transaction_successful,
        sponsored: !!tx?.fee_account && tx.fee_account !== record.from,
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${record.transaction_hash}`,
      };
    });
}
