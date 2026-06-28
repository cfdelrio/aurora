// rendering application: requestRealProviderRendering — the async real-provider-ready coordinator. It mirrors
// the sync requestProviderRendering exactly, but swaps the draft source for an async client: reuse the
// UNCHANGED providerRenderingRequestFrom guard, short-circuit on a non-present credential before any client
// call, ask the async client for an untrusted draft, then run the UNCHANGED mandatory validateDraft. A
// RenderedMessage exists ONLY if validation passes. It persists nothing, reviews nothing, marks nothing
// display-eligible, delivers nothing, appends no event, mutates nothing, and never retries. The returned
// ProviderRenderOutcome is identical in shape to the sync path's, so the Impl 018 raw-free audit observes
// it unchanged (composed by the caller).

import { validateDraft, providerRenderingRequestFrom, toProviderFailure } from "../domain/index.ts";
import type { RenderingRequest, ProviderClientConfig, ProviderSecretRef } from "../domain/index.ts";
import type { ProviderClientBoundary } from "./provider-client-boundary.ts";
import { realProviderAdapter } from "./real-provider-adapter.ts";
import type { ProviderRenderOutcome } from "./provider-rendering-service.ts";

export interface RequestRealProviderRenderingInput {
  readonly request: RenderingRequest; // authoritative renderable + safe constraints
  readonly client: ProviderClientBoundary;
  readonly config: ProviderClientConfig;
  readonly secret: ProviderSecretRef;
}

export async function requestRealProviderRendering(
  input: RequestRealProviderRenderingInput,
): Promise<ProviderRenderOutcome> {
  const { request, client, config, secret } = input;

  // 1. Build + guard the constrained provider request (rejects unsafe requests before any client call).
  const built = providerRenderingRequestFrom(request);
  if (built.status === "rejected") {
    return Object.freeze({ status: "failed", failure: built.failure });
  }

  // 2. Credential fast-path: a non-present credential fails safely BEFORE any client call.
  if (secret.status !== "present") {
    const op = secret.status === "missing" ? "missing-credential" : "invalid-credential";
    return Object.freeze({ status: "failed", failure: toProviderFailure(op) });
  }

  // 3. Ask the async (fake/in-process) client for an untrusted draft.
  const adapter = realProviderAdapter(client, config, secret);
  const drafted = await adapter.draft(built.providerRequest);
  if (drafted.status === "failed") {
    return Object.freeze({ status: "failed", failure: drafted.failure });
  }

  // 4. Mandatory validation — the UNCHANGED gate. A RenderedMessage exists only if this passes.
  const outcome = validateDraft({ draft: drafted.draft.text, renderable: request.renderable, request });
  if (outcome.status === "rendered") {
    return Object.freeze({
      status: "rendered",
      message: outcome.message,
      providerKind: config.providerKind,
      providerWarnings: drafted.draft.warnings,
    });
  }
  return Object.freeze({
    status: "failed",
    failure: "provider-output-failed-validation",
    renderingFailures: outcome.failures,
  });
}
