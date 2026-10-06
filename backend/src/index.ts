import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ALLOWED_ORIGINS, PORT, sponsor } from "./config";
import { HttpError } from "./errors";
import { fundDemoWallet, invalidateStats, sponsorStats } from "./demo";
import { buildOnboarding, sponsorPayment, sponsorStatus, submitOnboarding } from "./stellar";

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "32kb" }));

// Minimal per-IP rate limits so the sponsor's XLM cannot be burned by a script.
const WINDOW_MS = 60_000;
function limiter(maxRequests: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }
    if (++entry.count > maxRequests) {
      return next(new HttpError(429, "Too many requests. Please wait a minute.", "rate_limited"));
    }
    next();
  };
}
const rateLimit = limiter(20);
// Each demo funding creates a Friendbot account, so keep it scarce.
const demoRateLimit = limiter(3);

app.get("/health", async (_req, res) => {
  res.json({ ok: true, network: "testnet", ...(await sponsorStatus()) });
});

// Wrap a user-signed USDC payment in a fee-bump and submit it.
app.post("/sponsor", rateLimit, async (req, res) => {
  res.json(await sponsorPayment(req.body?.signedXdr));
  invalidateStats();
});

// Build a sponsor-signed transaction that creates the account (if needed) and
// adds the USDC trustline, with all fees and reserves paid by the sponsor.
app.post("/onboard", rateLimit, async (req, res) => {
  res.json(await buildOnboarding(req.body?.publicKey));
});

app.post("/onboard/submit", rateLimit, async (req, res) => {
  res.json(await submitOnboarding(req.body?.signedXdr));
  invalidateStats();
});

// Lifetime network fees paid by the sponsor, summed from Horizon (cached for 30s).
app.get("/stats", async (_req, res) => {
  res.json(await sponsorStats());
});

// Testnet-only: give a freshly onboarded in-browser demo wallet some USDC.
app.post("/demo/fund", demoRateLimit, async (req, res) => {
  res.json(await fundDemoWallet(req.body?.publicKey));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  console.error(error);
  res.status(500).json({ error: "Unexpected server error.", code: "internal" });
});

app.listen(PORT, () => {
  console.log(`Flow sponsor API on http://localhost:${PORT}`);
  console.log(`Sponsor account: ${sponsor.publicKey()}`);
});
