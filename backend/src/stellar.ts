import {
  Asset,
  BASE_FEE,
  FeeBumpTransaction,
  Horizon,
  Keypair,
  NotFoundError,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  EXPLORER_TX_URL,
  MAX_BASE_FEE,
  NETWORK_PASSPHRASE,
  USDC,
  server,
  sponsor,
} from "./config";
import { HttpError, fromHorizonError } from "./errors";

export type SubmitResult = {
  hash: string;
  ledger: number;
  feeCharged: string;
  feePaidBy: string;
  explorerUrl: string;
};

async function loadAccountOrNull(publicKey: string): Promise<Horizon.AccountResponse | null> {
  try {
    return await server.loadAccount(publicKey);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

function usdcBalance(account: Horizon.AccountResponse): string | null {
  const line = account.balances.find(
    (balance) =>
      (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC.getCode() &&
      balance.asset_issuer === USDC.getIssuer(),
  );
  return line ? line.balance : null;
}

function parseTransaction(signedXdr: unknown): Transaction | FeeBumpTransaction {
  if (typeof signedXdr !== "string" || signedXdr.length === 0) {
    throw new HttpError(400, "Request body must include a signedXdr string.", "bad_request");
  }
  try {
    return TransactionBuilder.fromXdr(signedXdr, NETWORK_PASSPHRASE);
  } catch {
    throw new HttpError(400, "signedXdr is not a valid Stellar transaction envelope.", "bad_xdr");
  }
}

function isSignedBy(tx: Transaction, publicKey: string): boolean {
  const keypair = Keypair.fromPublicKey(publicKey);
  const hash = tx.hash();
  return tx.signatures.some((sig) => keypair.verify(hash, sig.signature));
}

async function submit(tx: Transaction | FeeBumpTransaction): Promise<SubmitResult> {
  let response: Horizon.HorizonApi.SubmitTransactionResponse;
  try {
    response = await server.submitTransaction(tx);
  } catch (error) {
    throw fromHorizonError(error);
  }
  const record = await server.transactions().transaction(response.hash).call();
  return {
    hash: response.hash,
    ledger: response.ledger,
    feeCharged: String(record.fee_charged),
    feePaidBy: record.fee_account,
    explorerUrl: `${EXPLORER_TX_URL}/${response.hash}`,
  };
}

/**
 * Validates a user-signed USDC payment, wraps it in a fee-bump transaction
 * paid by the sponsor, and submits it to Stellar Testnet.
 */
export async function sponsorPayment(signedXdr: unknown): Promise<SubmitResult> {
  const inner = parseTransaction(signedXdr);
  if (inner instanceof FeeBumpTransaction) {
    throw new HttpError(400, "Send the inner transaction, not a fee-bump transaction.", "bad_request");
  }

  // Policy: the sponsor only pays for a single USDC payment from a regular account.
  if (!StrKey.isValidEd25519PublicKey(inner.source)) {
    throw new HttpError(400, "Transaction source must be a G... account.", "policy_violation");
  }
  if (inner.source === sponsor.publicKey()) {
    throw new HttpError(400, "The sponsor account cannot be the payer.", "policy_violation");
  }
  if (inner.operations.length !== 1) {
    throw new HttpError(400, "Only single-payment transactions are sponsored.", "policy_violation");
  }
  const op = inner.operations[0];
  if (op.type !== "payment" || !op.asset.equals(USDC)) {
    throw new HttpError(400, "Only USDC payments are sponsored.", "policy_violation");
  }
  if (op.source && op.source !== inner.source) {
    throw new HttpError(400, "The payment must come from the transaction source.", "policy_violation");
  }
  if (!inner.timeBounds || Number(inner.timeBounds.maxTime) === 0) {
    throw new HttpError(400, "The transaction must have an expiry (timeout).", "policy_violation");
  }
  if (!isSignedBy(inner, inner.source)) {
    throw new HttpError(400, "The transaction is not signed by its source account.", "bad_signature");
  }

  // Pre-flight the payment so the sponsor does not pay fees for doomed transactions.
  const [sender, recipient] = await Promise.all([
    loadAccountOrNull(inner.source),
    loadAccountOrNull(op.destination),
  ]);
  if (!sender) throw new HttpError(400, "Your account does not exist on Stellar Testnet.", "tx_no_source_account");
  const senderBalance = usdcBalance(sender);
  if (senderBalance === null) {
    throw new HttpError(400, "Your account has no USDC trustline. Enable USDC first.", "op_src_no_trust");
  }
  if (Number(senderBalance) < Number(op.amount)) {
    throw new HttpError(400, `Insufficient balance: you have ${senderBalance} USDC.`, "op_underfunded");
  }
  if (!recipient) {
    throw new HttpError(400, "The recipient account does not exist on Stellar Testnet.", "op_no_destination");
  }
  if (usdcBalance(recipient) === null) {
    throw new HttpError(400, "The recipient has not enabled USDC (no trustline).", "op_no_trust");
  }

  const innerFeeRate = Math.ceil(Number(inner.fee) / inner.operations.length);
  const networkFee = await server.fetchBaseFee();
  const baseFee = Math.max(networkFee, innerFeeRate, Number(BASE_FEE));
  if (baseFee > MAX_BASE_FEE) {
    throw new HttpError(400, `Fee of ${baseFee} stroops exceeds the sponsor limit.`, "fee_too_high");
  }

  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    sponsor,
    String(baseFee),
    inner,
    NETWORK_PASSPHRASE,
  );
  feeBump.sign(sponsor);
  return submit(feeBump);
}

/**
 * Builds a transaction that enables USDC for a user who holds no XLM. The
 * sponsor pays the fee and the reserves, and creates the account first if it
 * does not exist yet. The returned XDR is signed by the sponsor and still
 * needs the user's signature.
 */
export async function buildOnboarding(publicKey: unknown): Promise<{ xdr: string; createsAccount: boolean }> {
  if (typeof publicKey !== "string" || !StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new HttpError(400, "publicKey must be a valid G... Stellar address.", "bad_request");
  }
  if (publicKey === sponsor.publicKey()) {
    throw new HttpError(400, "The sponsor account cannot be onboarded.", "policy_violation");
  }

  const [sponsorAccount, user] = await Promise.all([
    server.loadAccount(sponsor.publicKey()),
    loadAccountOrNull(publicKey),
  ]);
  if (user && usdcBalance(user) !== null) {
    throw new HttpError(409, "USDC is already enabled for this account.", "already_enabled");
  }

  const builder = new TransactionBuilder(sponsorAccount, {
    fee: String(Math.max(await server.fetchBaseFee(), Number(BASE_FEE))),
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: publicKey }));

  if (!user) {
    builder.addOperation(Operation.createAccount({ destination: publicKey, startingBalance: "0" }));
  }

  const tx = builder
    .addOperation(Operation.changeTrust({ asset: USDC, source: publicKey }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: publicKey }))
    .setTimeout(300)
    .build();
  tx.sign(sponsor);
  return { xdr: tx.toXDR(), createsAccount: !user };
}

const ONBOARDING_OPS = new Set([
  "beginSponsoringFutureReserves",
  "createAccount",
  "changeTrust",
  "endSponsoringFutureReserves",
]);

/** Submits an onboarding transaction after the user has co-signed it. */
export async function submitOnboarding(signedXdr: unknown): Promise<SubmitResult> {
  const tx = parseTransaction(signedXdr);
  if (tx instanceof FeeBumpTransaction || tx.source !== sponsor.publicKey()) {
    throw new HttpError(400, "This is not a Flow onboarding transaction.", "policy_violation");
  }
  const validOps = tx.operations.every(
    (op) =>
      ONBOARDING_OPS.has(op.type) &&
      (op.type !== "changeTrust" || (op.line instanceof Asset && op.line.equals(USDC))),
  );
  if (!validOps || !isSignedBy(tx, sponsor.publicKey())) {
    throw new HttpError(400, "This is not a Flow onboarding transaction.", "policy_violation");
  }
  return submit(tx);
}

export async function sponsorStatus() {
  const account = await server.loadAccount(sponsor.publicKey());
  const xlm = account.balances.find((balance) => balance.asset_type === "native");
  return { sponsor: sponsor.publicKey(), xlmBalance: xlm?.balance ?? "0" };
}
