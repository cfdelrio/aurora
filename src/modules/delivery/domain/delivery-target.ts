// delivery domain: DeliveryTarget — a SAFE abstraction of where a message would be exposed. It is a label
// for an exposure surface, NEVER a channel implementation. Only `test-sink` is supported in this slice;
// the reserved labels are valid union members (so a historical record reconstitutes) but are unsupported.
// No provider semantics, no channel payload, no arbitrary metadata.

export type DeliveryTarget =
  | "test-sink" // the only SUPPORTED target this slice
  | "manual-review-surface" // RESERVED (future)
  | "future-ui" // RESERVED (future)
  | "future-notification-channel"; // RESERVED (future)

export const DELIVERY_TARGETS: readonly DeliveryTarget[] = [
  "test-sink",
  "manual-review-surface",
  "future-ui",
  "future-notification-channel",
];

export const SUPPORTED_TARGETS: readonly DeliveryTarget[] = ["test-sink"];

export const RESERVED_TARGETS: readonly DeliveryTarget[] = [
  "manual-review-surface",
  "future-ui",
  "future-notification-channel",
];

export function isDeliveryTarget(value: unknown): value is DeliveryTarget {
  return typeof value === "string" && (DELIVERY_TARGETS as readonly string[]).includes(value);
}

export function isSupportedTarget(target: DeliveryTarget): boolean {
  return target === "test-sink";
}
