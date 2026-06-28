// rendering application: ProviderClientBoundary — the async-capable port that a (future) real provider
// client would implement. It is the ONLY place network/SDK/secret concerns would ever live. It is
// provider-agnostic: it exposes no domain mutation handle, receives no raw private reasoning or
// chain-of-thought, and knows nothing of delivery/review/display state or domain aggregate APIs.

import type { ProviderClientRequest, ProviderClientResponse } from "../domain/index.ts";

export interface ProviderClientBoundary {
  readonly kind: string; // descriptive label, e.g. "fake"
  requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse>;
}
