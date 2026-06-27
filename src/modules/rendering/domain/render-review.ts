// rendering domain: RenderReview — an appended review of a rendered presentation artifact. Review is
// about DISPLAY SAFETY/FAITHFULNESS, never whether the domain output is true. It carries no domain edit.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import { renderReviewId } from "./ids.ts";
import type { RenderReviewId, RenderedMessageRecordId } from "./ids.ts";

/** Closed decision set. `not-reviewed` is the initial DERIVED status (no reviews yet); `superseded` is
 *  derived from a record's `supersededBy`. Neither is an appendable review decision (renderReview rejects them). */
export type RenderReviewDecision =
  | "approved-for-display"
  | "rejected-for-display"
  | "needs-revision"
  | "not-reviewed"
  | "superseded";

export const RENDER_REVIEW_DECISIONS: readonly RenderReviewDecision[] = [
  "approved-for-display",
  "rejected-for-display",
  "needs-revision",
  "not-reviewed",
  "superseded",
];

/** The decisions a reviewer may actually APPEND (not the two derived-only statuses). */
export const APPENDABLE_REVIEW_DECISIONS: readonly RenderReviewDecision[] = [
  "approved-for-display",
  "rejected-for-display",
  "needs-revision",
];

/** Closed reason set, aligned to Spec 015 + the renderer's failure vocabulary. */
export type RenderReviewReason =
  | "faithful-to-domain-output"
  | "voice-escalation"
  | "uncertainty-hidden"
  | "limitation-hidden"
  | "invented-fact"
  | "traceability-overstated"
  | "style-unsafe"
  | "tone-unsafe"
  | "stale-source-visible"
  | "manual-review-required"
  | "superseded-by-new-render";

export const RENDER_REVIEW_REASONS: readonly RenderReviewReason[] = [
  "faithful-to-domain-output",
  "voice-escalation",
  "uncertainty-hidden",
  "limitation-hidden",
  "invented-fact",
  "traceability-overstated",
  "style-unsafe",
  "tone-unsafe",
  "stale-source-visible",
  "manual-review-required",
  "superseded-by-new-render",
];

export type ReviewerKind = "system" | "human" | "test";
const REVIEWER_KINDS: readonly ReviewerKind[] = ["system", "human", "test"];

export interface RenderReview {
  readonly id: RenderReviewId;
  readonly recordRef: RenderedMessageRecordId;
  readonly decision: RenderReviewDecision;
  readonly reasons: readonly RenderReviewReason[];
  readonly reviewedAt: Timestamp;
  readonly reviewerKind: ReviewerKind;
  /** an explicit single note; never an arbitrary payload bag */
  readonly notes?: string;
}

export function isRenderReviewReason(value: unknown): value is RenderReviewReason {
  return typeof value === "string" && (RENDER_REVIEW_REASONS as readonly string[]).includes(value);
}

function validTimestamp(t: unknown): t is Timestamp {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof (t as Timestamp).epochMillis === "number" &&
    Number.isFinite((t as Timestamp).epochMillis) &&
    typeof (t as Timestamp).iso === "string"
  );
}

/** Smart constructor for an APPENDED review. Rejects the derived-only decisions and unknown reasons. */
export function renderReview(input: RenderReview): RenderReview {
  const id = renderReviewId(String(input.id));
  if (typeof input.recordRef !== "string" || String(input.recordRef).length === 0) {
    throw new Error("RenderReview requires a recordRef");
  }
  if (!(APPENDABLE_REVIEW_DECISIONS as readonly string[]).includes(input.decision)) {
    throw new Error(
      `RenderReview.decision must be one of {${APPENDABLE_REVIEW_DECISIONS.join(", ")}} (not the derived '${input.decision}')`,
    );
  }
  if (!Array.isArray(input.reasons) || input.reasons.length === 0 || !input.reasons.every(isRenderReviewReason)) {
    throw new Error("RenderReview requires at least one reason from the closed reason set");
  }
  if (!validTimestamp(input.reviewedAt)) {
    throw new Error("RenderReview requires a valid reviewedAt timestamp");
  }
  if (!REVIEWER_KINDS.includes(input.reviewerKind)) {
    throw new Error(`RenderReview.reviewerKind must be system | human | test, got ${String(input.reviewerKind)}`);
  }
  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw new Error("RenderReview.notes, when present, must be a string");
  }
  return Object.freeze({
    id,
    recordRef: input.recordRef,
    decision: input.decision,
    reasons: Object.freeze([...input.reasons]),
    reviewedAt: input.reviewedAt,
    reviewerKind: input.reviewerKind,
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  });
}
