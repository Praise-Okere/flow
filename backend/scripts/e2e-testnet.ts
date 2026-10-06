// End-to-end check against the real Stellar Testnet and a running backend:
// two brand-new keypairs with zero XLM are onboarded (account + USDC trustline,
// fully sponsored), the sender gets testnet USDC from the DEX, then sends a
// gasless payment through POST /sponsor.
//   Usage: npm run dev (in another terminal), then npm run e2e
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const API = process.env.API_URL ?? "http://localhost:4000";
const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
const passphrase = Networks.TESTNET;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(json)}`);
  return json as T;
}

async function onboard(user: Keypair) {
  const { xdr } = await post<{ xdr: string }>("/onboard", { publicKey: user.publicKey() });
  const tx = TransactionBuilder.fromXdr(xdr, passphrase);
  tx.sign(user);
  const result = await post<{ hash: string }>("/onboard/submit", { signedXdr: tx.toXDR() });
  console.log(`onboarded ${user.publicKey().slice(0, 8)}… tx ${result.hash}`);
}

async function balances(publicKey: string) {
  const account = await server.loadAccount(publicKey);
  const xlm = account.balances.find((b) => b.asset_type === "native")?.balance;
  const usdc = account.balances.find((b) => "asset_code" in b && b.asset_code === "USDC")?.balance;
  return { xlm, usdc };
}

async function main() {
  const sender = Keypair.random();
  const recipient = Keypair.random();
  await onboard(sender);
  await onboard(recipient);

  // Test-only funding: a separate Friendbot account buys 2 USDC on the testnet DEX for the sender.
  const funder = Keypair.random();
  await fetch(`https://friendbot.stellar.org?addr=${funder.publicKey()}`);
  const funderAccount = await server.loadAccount(funder.publicKey());
  const buy = new TransactionBuilder(funderAccount, { fee: "1000", networkPassphrase: passphrase })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: "5000",
        destination: sender.publicKey(),
        destAsset: USDC,
        destAmount: "2",
        path: [],
      }),
    )
    .setTimeout(60)
    .build();
  buy.sign(funder);
  await server.submitTransaction(buy);
  console.log("sender before:", await balances(sender.publicKey()));

  // The real Flow payment: user builds and signs, backend fee-bumps.
  const senderAccount = await server.loadAccount(sender.publicKey());
  const payment = new TransactionBuilder(senderAccount, { fee: "100", networkPassphrase: passphrase })
    .addOperation(Operation.payment({ destination: recipient.publicKey(), asset: USDC, amount: "1" }))
    .setTimeout(120)
    .build();
  payment.sign(sender);
  const result = await post("/sponsor", { signedXdr: payment.toXDR() });
  console.log("sponsored payment:", result);

  console.log("sender after:", await balances(sender.publicKey()));
  console.log("recipient after:", await balances(recipient.publicKey()));

  // Policy check: an overdraft must be rejected before reaching the network.
  const again = await server.loadAccount(sender.publicKey());
  const overdraft = new TransactionBuilder(again, { fee: "100", networkPassphrase: passphrase })
    .addOperation(Operation.payment({ destination: recipient.publicKey(), asset: USDC, amount: "1000" }))
    .setTimeout(120)
    .build();
  overdraft.sign(sender);
  await post("/sponsor", { signedXdr: overdraft.toXDR() }).catch((error) =>
    console.log("overdraft rejected as expected:", error.message),
  );
}

main().catch((error) => {
  console.error(error?.response?.data ?? error);
  process.exit(1);
});
