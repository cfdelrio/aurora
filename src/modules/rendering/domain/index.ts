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
