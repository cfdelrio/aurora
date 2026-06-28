// delivery domain: DeliveryFailureReason — the closed set of reasons a delivery is blocked/failed/cancelled.
// `provider-unavailable` is intentionally EXCLUDED this slice (no provider exists → it would be dead/
// untestable); `sink-unavailable` is its testable test-sink analog. No arbitrary strings.

export type DeliveryFailureReason =
  | "rendered-message-not-found"
  | "not-display-eligible"
  | "superseded-record"
  | "failed-render-record"
  | "missing-source-ref"
  | "review-not-approved"
  | "unsupported-channel"
  | "unsafe-target"
  | "sink-unavailable" // deterministic test-sink failure (replaces provider-unavailable this slice)
  | "delivery-cancelled";

export const DELIVERY_FAILURE_REASONS: readonly DeliveryFailureReason[] = [
  "rendered-message-not-found",
  "not-display-eligible",
  "superseded-record",
  "failed-render-record",
  "missing-source-ref",
  "review-not-approved",
  "unsupported-channel",
  "unsafe-target",
  "sink-unavailable",
  "delivery-cancelled",
];

export function isDeliveryFailureReason(value: unknown): value is DeliveryFailureReason {
  return typeof value === "string" && (DELIVERY_FAILURE_REASONS as readonly string[]).includes(value);
}
