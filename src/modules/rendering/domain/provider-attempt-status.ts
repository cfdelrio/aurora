// rendering domain: ProviderAttemptStatus — the closed set of outcomes the provider-attempt audit records
// for one provider seam attempt. The single-shot audit produces only the four TERMINAL statuses;
// `requested`/`draft-produced` are RESERVED (valid catalog/reconstitute members for a future two-phase
// flow, not produced by the audit this slice).

export type ProviderAttemptStatus =
  | "requested" // RESERVED (future two-phase flow; not produced this slice)
  | "draft-produced" // RESERVED (future; not produced this slice)
  | "validation-passed"
  | "validation-failed"
  | "provider-failed"
  | "unsafe-request-blocked";

export const PROVIDER_ATTEMPT_STATUSES: readonly ProviderAttemptStatus[] = [
  "requested",
  "draft-produced",
  "validation-passed",
  "validation-failed",
  "provider-failed",
  "unsafe-request-blocked",
];

export function isProviderAttemptStatus(value: unknown): value is ProviderAttemptStatus {
  return typeof value === "string" && (PROVIDER_ATTEMPT_STATUSES as readonly string[]).includes(value);
}
