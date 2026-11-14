// Fake payment provider, standing in for something like Stripe

export type ChargeResult =
  { ok: true; ref: string } | { ok: false; reason: "declined" | "timeout" };

// declineRate and unavailable come from the dashboard's chaos controls
export async function charge({
  idempotencyKey,
  declineRate,
  unavailable,
}: {
  idempotencyKey: string; // a real provider uses this to dedupe retries
  declineRate: number; // 0 to 1
  unavailable: boolean; // a transient error, worth retrying
}): Promise<ChargeResult> {
  await scheduler.wait(500); // feels like a network call
  if (unavailable) throw new Error("503 Service Unavailable");
  if (Math.random() < declineRate) return { ok: false, reason: "declined" };
  return { ok: true, ref: `pay_${idempotencyKey}` };
}
