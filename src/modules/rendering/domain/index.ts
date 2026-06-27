// rendering domain: public surface.

export {
  renderableFromTerminalOutput,
} from "./renderable-domain-output.ts";
export type {
  RenderableDomainOutput,
  RenderableKind,
  RenderableFreshness,
  RenderableTraceability,
  RenderableFromTerminalOutputInput,
} from "./renderable-domain-output.ts";

export { SAFE_STYLES, SUPPORTED_LOCALES, isSafeStyle, isSupportedLocale } from "./rendering-request.ts";
export type { RenderingRequest, RenderingStyle } from "./rendering-request.ts";

export type { RenderedMessage, RenderOutcome } from "./rendered-message.ts";

export { RENDERING_FAILURES } from "./rendering-failure.ts";
export type { RenderingFailure } from "./rendering-failure.ts";

export {
  RECOMMENDATION_CUES,
  ADVICE_CUES,
  UNCERTAINTY_MARKERS,
  COMPLETENESS_CLAIMS,
  FORBIDDEN_DOMAIN_CUES,
  hasRecommendationCue,
  hasAdviceCue,
  hasUncertaintyMarker,
  hasCompletenessClaim,
  hasForbiddenDomainCue,
} from "./rendering-policy.ts";

export { validateDraft } from "./rendering-validator.ts";
export type { ValidateDraftInput } from "./rendering-validator.ts";

export { fakeRender, fakeRenderText, render } from "./fake-renderer.ts";

// Rendered-message review / persistence (Impl 015) — auditable presentation records, downstream only.
export {
  renderedMessageRecordId,
  newRenderedMessageRecordId,
  renderReviewId,
  newRenderReviewId,
} from "./ids.ts";
export type { RenderedMessageRecordId, RenderReviewId } from "./ids.ts";

export {
  RENDER_REVIEW_DECISIONS,
  APPENDABLE_REVIEW_DECISIONS,
  RENDER_REVIEW_REASONS,
  isRenderReviewReason,
  renderReview,
} from "./render-review.ts";
export type { RenderReview, RenderReviewDecision, RenderReviewReason, ReviewerKind } from "./render-review.ts";

export { RenderedMessageRecord } from "./rendered-message-record.ts";
export type {
  RenderedMessageRecordState,
  RenderingStatus,
  PreservedFlags,
} from "./rendered-message-record.ts";

export { displayEligibilityOf } from "./display-eligibility.ts";
export type { DisplayEligibility } from "./display-eligibility.ts";

// Provider adapter seam (Impl 017) — constrained request, untrusted draft, closed failure catalog.
export { PROVIDER_FAILURES, isProviderFailure } from "./provider-failure.ts";
export type { ProviderFailure } from "./provider-failure.ts";
export { providerRenderingRequestFrom } from "./provider-rendering-request.ts";
export type { ProviderRenderingRequest, ProviderRenderingRequestOutcome } from "./provider-rendering-request.ts";
export type { ProviderDraft, ProviderDraftOutcome } from "./provider-draft.ts";

// Provider attempt audit (Impl 018) — auditability, not authority; safe summary, no raw draft retention.
export { PROVIDER_ATTEMPT_STATUSES, isProviderAttemptStatus } from "./provider-attempt-status.ts";
export type { ProviderAttemptStatus } from "./provider-attempt-status.ts";
export {
  PROVIDER_ATTEMPT_FAILURE_REASONS,
  isProviderAttemptFailureReason,
} from "./provider-attempt-failure-reason.ts";
export type { ProviderAttemptFailureReason } from "./provider-attempt-failure-reason.ts";
export type { ProviderDraftSummary } from "./provider-draft-summary.ts";
export { ProviderAttemptRecord, providerAttemptRecordId, newProviderAttemptRecordId } from "./provider-attempt-record.ts";
export type {
  ProviderAttemptRecordId,
  ProviderAttemptRecordState,
  ProviderAttemptRequestSummary,
} from "./provider-attempt-record.ts";
