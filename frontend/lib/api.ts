const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type SubmitResult = {
  hash: string;
  ledger: number;
  feeCharged: string;
  feePaidBy: string;
  explorerUrl: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Can't reach the Flow sponsor service at ${API_URL}. Is the backend running?`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error ?? `Request failed (${res.status}).`, json.code);
  return json as T;
}

export const sponsorPayment = (signedXdr: string) => post<SubmitResult>("/sponsor", { signedXdr });

export const requestOnboarding = (publicKey: string) =>
  post<{ xdr: string; createsAccount: boolean }>("/onboard", { publicKey });

export const submitOnboarding = (signedXdr: string) => post<SubmitResult>("/onboard/submit", { signedXdr });

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch {
    throw new ApiError(`Can't reach the Flow sponsor service at ${API_URL}. Is the backend running?`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error ?? `Request failed (${res.status}).`, json.code);
  return json as T;
}

export type SponsorStats = { feesPaid: string; transactions: number; payments: number; onboardings: number };

export const getSponsorStats = () => get<SponsorStats>("/stats");

export const fundDemoWallet = (publicKey: string) => post<{ amount: string; hash: string }>("/demo/fund", { publicKey });
