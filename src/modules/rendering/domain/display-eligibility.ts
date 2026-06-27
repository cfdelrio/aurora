// rendering domain: DisplayEligibility — a DERIVED answer to "may a future UI/delivery layer show this?".
// It is NOT domain approval, NOT delivery, NOT recommendation creation, and it triggers NOTHING. It is a
// pure read over a RenderedMessageRecord.

import type { RenderedMessageRecord } from "./rendered-message-record.ts";
import type { RenderedMessageRecordId } from "./ids.ts";
import type { RenderReviewDecision } from "./render-review.ts";

export interface DisplayEligibility {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly recordRef: RenderedMessageRecordId;
  readonly currentReviewStatus: RenderReviewDecision;
}

/** Eligible iff: rendered successfully · latest review approved-for-display · not superseded ·
 *  source ref present · validation/preservation flags all intact. Otherwise not eligible, with reasons. */
export function displayEligibilityOf(record: RenderedMessageRecord): DisplayEligibility {
  const reasons: string[] = [];
  const currentReviewStatus = record.currentReviewStatus();

  if (record.renderingStatus !== "rendered") reasons.push("not-rendered");
  if (currentReviewStatus !== "approved-for-display") reasons.push(`review-status:${currentReviewStatus}`);
  if (record.supersededBy !== undefined) reasons.push("superseded");
  if (typeof record.sourceDomainOutputRef !== "string" || record.sourceDomainOutputRef.length === 0) {
    reasons.push("missing-source-ref");
  }
  const p = record.preserved;
  if (p === undefined || !p.uncertaintyPreserved || !p.limitationsPreserved || !p.traceabilityPreserved) {
    reasons.push("validation-not-preserved");
  }

  return Object.freeze({
    eligible: reasons.length === 0,
    reasons: Object.freeze(reasons),
    recordRef: record.id,
    currentReviewStatus,
  });
}
