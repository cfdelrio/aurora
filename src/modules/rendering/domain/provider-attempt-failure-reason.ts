// rendering domain: ProviderAttemptFailureReason — the closed reason vocabulary for an audited attempt.
// It REUSES the real catalogs verbatim (no invented/parallel names): a provider-side reason is a
// ProviderFailure (Impl 017); a validation-side reason is a RenderingFailure (Impl 014). The record stores
// the two precisely-typed halves; this union + catalog/guard exist for completeness and validation.

import { PROVIDER_FAILURES } from "./provider-failure.ts";
import type { ProviderFailure } from "./provider-failure.ts";
import { RENDERING_FAILURES } from "./rendering-failure.ts";
import type { RenderingFailure } from "./rendering-failure.ts";

export type ProviderAttemptFailureReason = ProviderFailure | RenderingFailure;

export const PROVIDER_ATTEMPT_FAILURE_REASONS: readonly ProviderAttemptFailureReason[] = [
  ...PROVIDER_FAILURES,
  ...RENDERING_FAILURES,
];

export function isProviderAttemptFailureReason(value: unknown): value is ProviderAttemptFailureReason {
  return typeof value === "string" && (PROVIDER_ATTEMPT_FAILURE_REASONS as readonly string[]).includes(value);
}
