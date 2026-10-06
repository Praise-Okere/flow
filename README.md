# Flow

**Send USDC. Zero gas. One click.**

Flow is a gasless USDC payment widget for Stellar. Users sign a payment in Freighter, and the Flow
backend wraps it in a [fee-bump transaction](https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/fee-bump-transactions)
so a sponsor account pays the network fee. New users don't need XLM to get started either: Flow
creates their account and USDC trustline with [sponsored reserves](https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/sponsored-reserves).

Everything runs on the real Stellar Testnet. There is no mock data.

```
frontend/  Next.js 14 · TypeScript · Tailwind · Freighter
backend/   Express · TypeScript · @stellar/stellar-sdk
```

## Quick start

Requires Node 18+ and the [Freighter](https://www.freighter.app) extension set to **Testnet**.

```bash
# 1. Backend
cd backend
npm install
npm run setup      # creates backend/.env with a new sponsor key, funded by Friendbot
npm run dev        # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

To get testnet USDC, use [faucet.circle.com](https://faucet.circle.com) and pick Stellar Testnet. Your
account must have a USDC trustline first, which the **Enable USDC** button creates.

## How it works

### Sending a payment

1. The frontend builds a `payment` operation for USDC
   (`GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) with the user as the source.
2. Freighter **signs** it. It does not submit it.
3. `POST /sponsor` validates the signed transaction, wraps it with
   `TransactionBuilder.buildFeeBumpTransaction()`, signs the wrapper with the sponsor key and submits it to Horizon.
4. Under a fee bump, only the fee source is charged, so the user's XLM balance never changes.

### Onboarding a user with 0 XLM

`POST /onboard` builds a transaction whose source is the sponsor:

```
beginSponsoringFutureReserves(user)      ← sponsor
createAccount(user, 0 XLM)               ← only if the account doesn't exist yet
changeTrust(USDC)                        ← user
endSponsoringFutureReserves()            ← user
```

The sponsor signs it, the user co-signs it in Freighter, and `POST /onboard/submit` submits it. The
sponsor pays the fee and holds the reserves.

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/sponsor` | `{ "signedXdr": "AAAA..." }` | `{ hash, ledger, feeCharged, feePaidBy, explorerUrl }` |
| `POST` | `/onboard` | `{ "publicKey": "G..." }` | `{ xdr, createsAccount }` (sponsor-signed, needs the user's signature) |
| `POST` | `/onboard/submit` | `{ "signedXdr": "AAAA..." }` | same as `/sponsor` |
| `GET` | `/health` | | sponsor address and XLM balance |
| `GET` | `/stats` | | `{ feesPaid, transactions, payments, onboardings }`: lifetime fees paid by the sponsor (stroops), summed from Horizon, cached 30s |
| `POST` | `/demo/fund` | `{ "publicKey": "G..." }` | `{ amount, hash }`: testnet-only, buys `DEMO_USDC_AMOUNT` USDC on the DEX for an empty demo wallet (3 requests/min per IP) |

Errors return `{ "error": "Human readable message", "code": "op_underfunded" }`. The `code` is the
Stellar result code where one applies.

### Sponsor protection

The sponsor only pays for transactions that pass these checks:

- exactly one `payment` operation, in USDC from the configured issuer
- a `G...` source account that is not the sponsor, signed by that source
- an expiry (time bounds) on the transaction
- fee per operation at or below `MAX_BASE_FEE`
- a pre-flight check against Horizon: the sender exists, has a trustline and enough USDC, and the
  recipient exists with a trustline. Doomed payments never reach the network, so the sponsor never
  pays fees for failed transactions.
- a per-IP rate limit of 20 requests per minute

## End-to-end test

With the backend running:

```bash
cd backend && npm run e2e
```

The test creates two brand-new keypairs with zero XLM and onboards both. A separate Friendbot account
buys 2 USDC on the testnet DEX for the sender. The sender then makes a sponsored payment, and the test
checks that an overdraft is rejected. Both users end with **0 XLM**.

## Notes

- **SAC vs. classic payment:** USDC moves with a classic `payment` operation. The Stellar Asset
  Contract (SAC) for USDC reads and writes these same trustline balances, so Soroban wallets and
  contracts see the result. Classic payments need no simulation or resource fees, which makes them the
  cheapest and most reliable thing to fee-bump.
- **Concurrency:** `/onboard` transactions use the sponsor's sequence number, so two onboardings
  signed at the same moment can conflict. The second one gets a "please try again" error.
  `/sponsor` payments don't use the sponsor's sequence and run fully in parallel. For production, use
  channel accounts for onboarding.
- **Secrets:** `backend/.env` holds a testnet secret key and is gitignored. Never reuse it on mainnet.
