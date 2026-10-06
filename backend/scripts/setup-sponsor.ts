// Creates a sponsor keypair, funds it with Friendbot on Stellar Testnet, and
// writes it to backend/.env. Re-running keeps an existing key.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@stellar/stellar-sdk";

const envPath = resolve(__dirname, "../.env");
const examplePath = resolve(__dirname, "../.env.example");

async function main() {
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : readFileSync(examplePath, "utf8");
  const existing = env.match(/^SPONSOR_SECRET_KEY=(S[A-Z0-9]{55})$/m)?.[1];
  const keypair = existing ? Keypair.fromSecret(existing) : Keypair.random();

  if (!existing) {
    env = env.match(/^SPONSOR_SECRET_KEY=.*$/m)
      ? env.replace(/^SPONSOR_SECRET_KEY=.*$/m, `SPONSOR_SECRET_KEY=${keypair.secret()}`)
      : `${env.trimEnd()}\nSPONSOR_SECRET_KEY=${keypair.secret()}\n`;
    writeFileSync(envPath, env);
    console.log("Wrote new sponsor key to backend/.env");
  }

  const res = await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
  if (res.ok) console.log("Funded sponsor with 10,000 testnet XLM via Friendbot");
  else if (res.status === 400) console.log("Sponsor already funded");
  else throw new Error(`Friendbot failed: ${res.status} ${await res.text()}`);

  console.log(`Sponsor: ${keypair.publicKey()}`);
  console.log(`https://stellar.expert/explorer/testnet/account/${keypair.publicKey()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
