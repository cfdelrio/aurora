// rendering domain: ProviderDraft — the UNTRUSTED raw output of a (future/fake) provider. It is draft text
// only: it is NOT a RenderedMessage / RenderedMessageRecord / Evidence / Observation / Understanding /
// AthleteDecision / DecisionSupport, it carries no preservation flags it sets itself, and it has no
// aggregate-write path. It becomes a RenderedMessage ONLY by passing the mandatory validateDraft gate.

import type { ProviderFailure } from "./provider-failure.ts";

export interface ProviderDraft {
  readonly text: string;
  readonly providerKind: string; // e.g. "fake"
  readonly warnings: readonly string[];
}

export type ProviderDraftOutcome =
  | { readonly status: "drafted"; readonly draft: ProviderDraft }
  | { readonly status: "failed"; readonly failure: ProviderFailure };
