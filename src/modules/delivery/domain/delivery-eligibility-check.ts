// delivery domain: DeliveryEligibilityCheck — DERIVED from rendering's displayEligibilityOf(record). Delivery
// VERIFIES, it does not reinterpret: it carries the rendering DisplayEligibility verbatim, retains its raw
// reasons, and maps them to specific DeliveryFailureReasons (never a generic catch-all). It never re-runs
// rendering validation, repairs review, decides domain truth, or mutates the record.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { DisplayEligibility, RenderedMessageRecordId } from "../../rendering/index.ts";
import type { DeliveryFailureReason } from "./delivery-failure.ts";

export interface DeliveryEligibilityCheck {
  readonly renderedMessageRecordRef: RenderedMessageRecordId;
  readonly eligible: boolean;
  /** the rendering DisplayEligibility, carried verbatim (the single source of eligibility) */
  readonly eligibility: DisplayEligibility;
  /** = eligibility.reasons (raw rendering reasons retained; nothing lost) */
  readonly reasons: readonly string[];
  readonly checkedAt: Timestamp;
}

/** Build a check from rendering's DisplayEligibility — no re-derivation. */
export function deliveryEligibilityCheck(input: {
  readonly eligibility: DisplayEligibility;
  readonly checkedAt: Timestamp;
}): DeliveryEligibilityCheck {
  const { eligibility, checkedAt } = input;
  return Object.freeze({
    renderedMessageRecordRef: eligibility.recordRef,
    eligible: eligibility.eligible,
    eligibility,
    reasons: Object.freeze([...eligibility.reasons]),
    checkedAt,
  });
}

/**
 * Map rendering's specific display-eligibility reasons to a specific DeliveryFailureReason.
 * Order (most specific first): superseded → failed-render → missing-source-ref → review-not-approved →
 * not-display-eligible. Returns undefined when the record is eligible.
 *
 * Rendering's raw reasons (from displayEligibilityOf): "not-rendered", `review-status:<status>`,
 * "superseded", "missing-source-ref", "validation-not-preserved".
 */
export function primaryFailureReasonFor(eligibility: DisplayEligibility): DeliveryFailureReason | undefined {
  if (eligibility.eligible) return undefined;
  const reasons = eligibility.reasons;
  const has = (r: string): boolean => reasons.includes(r);
  if (has("superseded") || has("review-status:superseded")) return "superseded-record";
  if (has("not-rendered")) return "failed-render-record";
  if (has("missing-source-ref")) return "missing-source-ref";
  if (reasons.some((r) => r.startsWith("review-status:"))) return "review-not-approved";
  if (has("validation-not-preserved")) return "not-display-eligible";
  return "not-display-eligible";
}
