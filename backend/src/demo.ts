import { Asset, Keypair, NotFoundError, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";
import { DEMO_USDC_AMOUNT, NETWORK_PASSPHRASE, USDC, server, sponsor } from "./config";
import { HttpError, fromHorizonError } from "./errors";

const PAGE_SIZE = 200;
const MAX_PAGES = 10;
const STATS_TTL_MS = 30_000;

export type SponsorStats = {
  /** Total network fees paid by the sponsor, in stroops. */
  feesPaid: string;
  /** Transactions whose fee the sponsor paid (fee-bumped payments + onboardings). */
  transactions: number;
  payments: number;
  onboardings: number;
};

let cached: { stats: SponsorStats; expiresAt: number } | null = null;

/** Call after the sponsor pays a fee so the next /stats read is fresh. */
export function invalidateStats() {
  cached = null;
}

/**
 * Sums the fees the sponsor actually paid, straight from Horizon. Only
 * transactions where the sponsor is the fee account count, which covers both
 * fee-bumped payments (user is the source) and onboardings (sponsor is the source).
 */
export async function sponsorStats(): Promise<SponsorStats> {
  if (cached && cached.expiresAt > Date.now()) return cached.stats;

  const me = sponsor.publicKey();
  let feesPaid = 0n;
  let payments = 0;
  let onboardings = 0;

  let page = await server.transactions().forAccount(me).limit(PAGE_SIZE).order("desc").call();
  for (let i = 0; i < MAX_PAGES && page.records.length > 0; i++) {
    for (const tx of page.records) {
      if (tx.fee_account !== me) continue;
      feesPaid += BigInt(tx.fee_charged);
      if (tx.source_account === me) onboardings++;
      else payments++;
    }
    if (page.records.length < PAGE_SIZE) break;
    page = await page.next();
  }

  const stats = { feesPaid: feesPaid.toString(), transactions: payments + onboardings, payments, onboardings };
  cached = { stats, expiresAt: Date.now() + STATS_TTL_MS };
  return stats;
}

/**
 * Testnet-only faucet for the in-browser demo wallet: a fresh Friendbot account
 * buys USDC on the testnet DEX and sends it to the demo wallet. The sponsor's
 * XLM is never used, so the fee counter only reflects real sponsorship.
 */
export async function fundDemoWallet(publicKey: unknown): Promise<{ amount: string; hash: string }> {
  if (Number(DEMO_USDC_AMOUNT) <= 0) {
    throw new HttpError(404, "Demo funding is turned off on this server.", "demo_disabled");
  }
  if (typeof publicKey !== "string" || !StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new HttpError(400, "publicKey must be a valid G... Stellar address.", "bad_request");
  }

  let account;
  try {
    account = await server.loadAccount(publicKey);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new HttpError(400, "Enable USDC for this account before funding it.", "op_no_destination");
    }
    throw error;
  }
  const usdc = account.balances.find(
    (b) => "asset_code" in b && b.asset_code === USDC.getCode() && b.asset_issuer === USDC.getIssuer(),
  );
  if (!usdc) throw new HttpError(400, "Enable USDC for this account before funding it.", "op_no_trust");
  // Top-ups only for (nearly) empty wallets, so the faucet can't be farmed.
  if (Number(usdc.balance) >= 1) {
    throw new HttpError(409, "This demo wallet already has USDC.", "already_funded");
  }

  const funder = Keypair.random();
  const friendbot = await fetch(`https://friendbot.stellar.org?addr=${funder.publicKey()}`);
  if (!friendbot.ok) throw new HttpError(503, "Testnet Friendbot is unavailable. Try again shortly.", "friendbot_down");

  const funderAccount = await server.loadAccount(funder.publicKey());
  const buy = new TransactionBuilder(funderAccount, { fee: "1000", networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: "9000",
        destination: publicKey,
        destAsset: USDC,
        destAmount: DEMO_USDC_AMOUNT,
        path: [],
      }),
    )
    .setTimeout(60)
    .build();
  buy.sign(funder);

  try {
    const result = await server.submitTransaction(buy);
    return { amount: DEMO_USDC_AMOUNT, hash: result.hash };
  } catch (error) {
    throw fromHorizonError(error);
  }
}
