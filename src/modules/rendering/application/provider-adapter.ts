// rendering application: ProviderAdapter port. A draft source behind the rendering boundary — it asks a
// future external/internal provider for a DRAFT phrasing of an already-approved, constrained request. It
// returns a draft or a failure; it NEVER returns a RenderedMessage, mutates state, or calls the validator.
// A real adapter implements this same interface later (secrets/network isolated outside the domain).

import type { ProviderRenderingRequest, ProviderDraftOutcome } from "../domain/index.ts";

export interface ProviderAdapter {
  readonly kind: string; // descriptive label, e.g. "fake"
  draft(request: ProviderRenderingRequest): ProviderDraftOutcome;
}
