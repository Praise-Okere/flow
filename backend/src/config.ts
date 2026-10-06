import "dotenv/config";
import { Asset, Horizon, Keypair, Networks } from "@stellar/stellar-sdk";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Run "npm run setup" to create a funded testnet sponsor, or copy .env.example to .env.`,
    );
  }
  return value;
}

export const PORT = Number(process.env.PORT ?? 4000);
export const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const EXPLORER_TX_URL = "https://stellar.expert/explorer/testnet/tx";

export const USDC = new Asset(
  "USDC",
  process.env.USDC_ISSUER ?? "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
);

export const sponsor = Keypair.fromSecret(required("SPONSOR_SECRET_KEY"));

// Upper bound on the per-operation fee the sponsor will pay, so a client cannot
// drain the sponsor by submitting an inner transaction with an inflated fee.
export const MAX_BASE_FEE = Number(process.env.MAX_BASE_FEE ?? 10_000);

// USDC sent to each new in-browser demo wallet. Set to 0 to turn the demo faucet off.
export const DEMO_USDC_AMOUNT = process.env.DEMO_USDC_AMOUNT ?? "10";

export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const server = new Horizon.Server(HORIZON_URL);
