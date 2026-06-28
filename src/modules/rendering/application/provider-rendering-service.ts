// rendering application: requestProviderRendering — the provider seam coordinator. It mirrors render()
// exactly, but swaps the draft source: build a CONSTRAINED ProviderRenderingRequest (rejecting unsafe
// requests before any provider call), ask the ProviderAdapter for a draft, then run the UNCHANGED mandatory
// validateDraft. A RenderedMessage exists ONLY if validation passes. It persists nothing, reviews nothing,
// marks nothing display-eligible, delivers nothing, appends no event, and mutates no aggregate. Provider
// failure or unsafe output degrades to safe non-rendering.

import { validateDraft } from "../domain/index.ts";
import { providerRenderingRequestFrom } from "../domain/index.ts";
import type { RenderingRequest, RenderedMessage, RenderingFailure, ProviderFailure } from "../domain/index.ts";
import type { ProviderAdapter } from "./provider-adapter.ts";

export type ProviderRenderOutcome =
  | {
      readonly status: "rendered";
      readonly message: RenderedMessage;
      readonly providerKind: string;
      readonly providerWarnings: readonly string[];
    }
  | {
      readonly status: "failed";
      readonly failure: ProviderFailure;
      readonly renderingFailures?: readonly RenderingFailure[];
    };

export interface RequestProviderRenderingInput {
  readonly request: RenderingRequest; // authoritative renderable + safe constraints
  readonly provider: ProviderAdapter;
}

export function requestProviderRendering(input: RequestProviderRenderingInput): ProviderRenderOutcome {
  const { request, provider } = input;

  // 1. Build + guard the constrained provider request (rejects unsafe requests before any provider call).
  const built = providerRenderingRequestFrom(request);
  if (built.status === "rejected") {
    return Object.freeze({ status: "failed", failure: built.failure });
  }

  // 2. Ask the provider for an untrusted draft.
  const drafted = provider.draft(built.providerRequest);
  if (drafted.status === "failed") {
    return Object.freeze({ status: "failed", failure: drafted.failure });
  }

  // 3. Mandatory validation — the UNCHANGED gate. A RenderedMessage exists only if this passes.
  const outcome = validateDraft({ draft: drafted.draft.text, renderable: request.renderable, request });
  if (outcome.status === "rendered") {
    return Object.freeze({
      status: "rendered",
      message: outcome.message,
      providerKind: drafted.draft.providerKind,
      providerWarnings: drafted.draft.warnings,
    });
  }
  return Object.freeze({
    status: "failed",
    failure: "provider-output-failed-validation",
    renderingFailures: outcome.failures,
  });
}
