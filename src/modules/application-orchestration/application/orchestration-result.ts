// application-orchestration: the CLOSED result union of an explicit composition run. Each variant carries a
// ref-only OrchestrationTrace and nothing else — no raw draft/prompt/payload/secret/env value, no message
// body. A result is a safe disposition + safe refs; it is never evidence, never an athlete decision, never a
// domain mutation, and reading it triggers nothing.

import type { OrchestrationTrace } from "./orchestration-trace.ts";

/**
 * Closed disposition catalog:
 * - `delivered`              — rendered (+ optionally recorded/reviewed) and delivery succeeded.
 * - `delivery-failed`        — delivery attempted; sink failed/cancelled. NO retry.
 * - `rendered`               — rendered + recorded; delivery not selected (partial composition).
 * - `review-rejected`        — record exists; review rejected → display-ineligible → no delivery.
 * - `display-ineligible`     — record exists; not eligible (no explicit rejection) → no delivery.
 * - `provider-not-rendered`  — provider/validation/credential/live path failed → NO record. Fail-closed.
 * - `recording-failed`       — a REQUIRED persistence step (audit / record / review) threw → safe stop.
 * - `partial-success`        — the domain disposition was reached, but an occurrence-event append failed
 *                              (non-invalidating; completed-step refs remain in the trace).
 */
export type OrchestrationOutcomeKind =
  | "delivered"
  | "delivery-failed"
  | "rendered"
  | "review-rejected"
  | "display-ineligible"
  | "provider-not-rendered"
  | "recording-failed"
  | "partial-success";

export const ORCHESTRATION_OUTCOME_KINDS: readonly OrchestrationOutcomeKind[] = [
  "delivered",
  "delivery-failed",
  "rendered",
  "review-rejected",
  "display-ineligible",
  "provider-not-rendered",
  "recording-failed",
  "partial-success",
];

export interface OrchestrationOutcome {
  readonly kind: OrchestrationOutcomeKind;
  readonly trace: OrchestrationTrace;
}
