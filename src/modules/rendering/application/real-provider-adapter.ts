// rendering application: RealProviderAdapter — the async analog of the (sync) ProviderAdapter. It bridges a
// constrained ProviderRenderingRequest to a ProviderClientBoundary call and maps the untrusted client
// response to a ProviderDraftOutcome (the same shape the sync seam produces). It NEVER calls validateDraft,
// NEVER constructs a RenderedMessage, and touches no secret beyond the operational ProviderSecretRef.

import {
  providerInstructionFrom,
  toProviderFailure,
} from "../domain/index.ts";
import type {
  ProviderRenderingRequest,
  ProviderDraftOutcome,
  ProviderClientRequest,
  ProviderClientConfig,
  ProviderSecretRef,
} from "../domain/index.ts";
import type { ProviderClientBoundary } from "./provider-client-boundary.ts";

export interface RealProviderAdapter {
  readonly kind: string;
  draft(request: ProviderRenderingRequest): Promise<ProviderDraftOutcome>;
}

/** Build a RealProviderAdapter over an async client + non-secret config + an operational secret ref. */
export function realProviderAdapter(
  client: ProviderClientBoundary,
  config: ProviderClientConfig,
  secret: ProviderSecretRef,
): RealProviderAdapter {
  return Object.freeze({
    kind: config.providerKind,
    async draft(request: ProviderRenderingRequest): Promise<ProviderDraftOutcome> {
      const clientRequest: ProviderClientRequest = Object.freeze({
        sourceCaseRef: request.sourceCaseRef,
        instruction: providerInstructionFrom(request),
        config,
        secret,
      });
      const response = await client.requestDraft(clientRequest);
      if (response.status === "failed") {
        return Object.freeze({ status: "failed", failure: toProviderFailure(response.failure) });
      }
      // untrusted draft — validation happens in the service, never here
      return Object.freeze({
        status: "drafted",
        draft: Object.freeze({ text: response.text, providerKind: config.providerKind, warnings: Object.freeze([]) }),
      });
    },
  });
}
