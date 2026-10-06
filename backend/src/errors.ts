export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

const OPERATION_MESSAGES: Record<string, string> = {
  op_underfunded: "Insufficient USDC balance for this payment.",
  op_src_no_trust: "Your account has no USDC trustline. Enable USDC first.",
  op_no_trust: "The recipient has not enabled USDC (no trustline).",
  op_not_authorized: "The recipient is not authorized to hold this USDC.",
  op_no_destination: "The recipient account does not exist on Stellar Testnet.",
  op_line_full: "The recipient's USDC trustline limit would be exceeded.",
  op_low_reserve: "Not enough XLM reserve to create this entry.",
  op_already_exists: "This account already exists.",
  op_too_few_offers: "The testnet DEX has no USDC liquidity right now. Try again shortly.",
  op_over_source_max: "Testnet USDC is too expensive on the DEX right now. Try again shortly.",
};

const TRANSACTION_MESSAGES: Record<string, string> = {
  tx_bad_seq: "Transaction sequence is out of date. Please try again.",
  tx_too_late: "The signed transaction expired. Please sign again.",
  tx_bad_auth: "The transaction signature is invalid.",
  tx_insufficient_fee: "The network fee is too low right now. Please try again.",
  tx_no_source_account: "Your account does not exist on Stellar Testnet.",
  tx_fee_bump_inner_failed: "The payment failed.",
};

type HorizonErrorBody = {
  extras?: { result_codes?: { transaction?: string; operations?: string[]; inner_transaction?: string } };
  detail?: string;
  title?: string;
};

/** Turns a Horizon submission error into a readable HttpError. */
export function fromHorizonError(error: unknown): HttpError {
  const body = (error as { response?: { data?: HorizonErrorBody } })?.response?.data;
  const codes = body?.extras?.result_codes;
  if (!codes) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new HttpError(502, `Stellar network error: ${message}`, "network_error");
  }

  const opCode = codes.operations?.find((code) => code !== "op_success");
  if (opCode && OPERATION_MESSAGES[opCode]) {
    return new HttpError(400, OPERATION_MESSAGES[opCode], opCode);
  }
  const txCode = codes.inner_transaction ?? codes.transaction;
  if (txCode && TRANSACTION_MESSAGES[txCode]) {
    return new HttpError(400, TRANSACTION_MESSAGES[txCode], txCode);
  }
  return new HttpError(
    400,
    `Transaction rejected: ${[codes.transaction, codes.inner_transaction, ...(codes.operations ?? [])]
      .filter(Boolean)
      .join(", ")}`,
    txCode ?? opCode,
  );
}
