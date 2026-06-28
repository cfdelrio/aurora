// delivery domain: DeliveryOutcome — the closed set of exposure outcomes. NONE of these feed back into the
// domain: an outcome is auditability, never authority, and never evidence. `accepted-for-delivery` is
// RESERVED for a future request-then-attempt (two-phase) flow; the single-shot service does not produce it.

export type DeliveryOutcome =
  | "accepted-for-delivery" // RESERVED for a future two-phase flow (not produced by the single-shot path)
  | "blocked-not-eligible"
  | "delivered"
  | "failed"
  | "cancelled"
  | "not-attempted";

export const DELIVERY_OUTCOMES: readonly DeliveryOutcome[] = [
  "accepted-for-delivery",
  "blocked-not-eligible",
  "delivered",
  "failed",
  "cancelled",
  "not-attempted",
];

export function isDeliveryOutcome(value: unknown): value is DeliveryOutcome {
  return typeof value === "string" && (DELIVERY_OUTCOMES as readonly string[]).includes(value);
}
