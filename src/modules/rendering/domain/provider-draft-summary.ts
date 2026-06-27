// rendering domain: ProviderDraftSummary — a SAFE summary of a provider draft. It is reason/count-based,
// NEVER content-based: it has no draft / text / content / raw / excerpt / prompt field, so raw or unsafe
// provider output is unrepresentable. `rawDraftRetained` is the literal type `false`. `draftCharacterCount`
// is reserved (not populated this slice) — the audit observes the outcome, not the raw draft.

import type { ProviderFailure } from "./provider-failure.ts";
import type { RenderingFailure } from "./rendering-failure.ts";

export interface ProviderDraftSummary {
  readonly draftProduced: boolean;
  readonly rawDraftRetained: false; // literal false — raw draft text is never retained
  readonly draftCharacterCount?: number; // RESERVED — not populated in Impl 018 (no raw draft is read)
  readonly providerWarningCount?: number;
  readonly validationFailureCount?: number;
  readonly renderingFailureReasons?: readonly RenderingFailure[];
  readonly providerFailureReason?: ProviderFailure;
}
