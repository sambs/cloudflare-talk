// Fake payment provider, standing in for something like Stripe

export type ChargeResult =
  { ok: true; ref: string } | { ok: false; reason: "declined" | "timeout" };

export async function charge({
  idempotencyKey,
  declineRate,
}: {
  idempotencyKey: string; // a real provider uses this to dedupe retries
  declineRate: number; // 0 to 1, from the "decline-rate" feature flag
}): Promise<ChargeResult> {
  await scheduler.wait(500); // feels like a network call
  if (Math.random() < declineRate) return { ok: false, reason: "declined" };
  return { ok: true, ref: `pay_${idempotencyKey}` };
}
