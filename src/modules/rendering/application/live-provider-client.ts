// rendering application: LiveProviderClient (Impl 021) — an OPT-IN, FAIL-CLOSED implementation of the existing
// async ProviderClientBoundary. It is a sibling of ConcreteProviderClient (Impl 020): same boundary, same pure
// serializer/parser/error-mapper, but its transport is an async network call instead of a sync fixture. It is
// disabled by default and fails closed BEFORE any transport call when the policy is disabled or the credential
// is missing/invalid. It NEVER calls validateDraft (the service owns validation), NEVER creates a
// RenderedMessage/record/review/display/delivery/event, persists nothing, mutates no domain, re-issues no call,
// and exposes no raw secret. Provider output is an untrusted draft.

import type { ProviderClientRequest, ProviderClientResponse, ProviderOperationalFailure } from "../domain/index.ts";
import { serializeProviderInstruction } from "./concrete-provider-prompt-serializer.ts";
import { parseProviderResponse } from "./concrete-provider-response-parser.ts";
import { mapProviderError } from "./concrete-provider-error-mapper.ts";
import type { ProviderClientBoundary } from "./provider-client-boundary.ts";
import type { LiveCallPolicy } from "./live-call-policy.ts";
import type { ProviderCredentialResolver } from "./provider-credential-resolver.ts";
import type { LiveProviderTransport } from "./live-provider-http-transport.ts";

export interface LiveProviderClientDeps {
  readonly policy: LiveCallPolicy;
  readonly resolver: ProviderCredentialResolver;
  readonly transport: LiveProviderTransport;
  /** neutral label — NEVER a vendor token; defaults to "live" */
  readonly kind?: string;
}

export class LiveProviderClient implements ProviderClientBoundary {
  readonly kind: string;
  private readonly policy: LiveCallPolicy;
  private readonly resolver: ProviderCredentialResolver;
  private readonly transport: LiveProviderTransport;

  constructor(deps: LiveProviderClientDeps) {
    this.kind = deps.kind ?? "live";
    this.policy = deps.policy;
    this.resolver = deps.resolver;
    this.transport = deps.transport;
  }

  async requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse> {
    const failed = (failure: ProviderOperationalFailure): ProviderClientResponse =>
      Object.freeze({ status: "failed", failure });

    // 1. fail closed if live calls are disabled — NO transport call.
    if (!this.policy.enabled) return failed(mapProviderError({ kind: "live-disabled" }));

    // 2. resolve the credential — missing/invalid fail safely BEFORE any transport call.
    const credential = this.resolver.resolve();
    if (credential.status === "missing") return failed("missing-credential");
    if (credential.status === "invalid") return failed("invalid-credential");

    // 3. construct a safe payload from the structured instruction (unchanged serializer).
    const payload = serializeProviderInstruction(input.instruction);

    // 4. perform the live call through the single approved transport.
    const result = await this.transport.send(payload, credential.token, this.policy);

    // 5. parse an untrusted draft, or map the neutral error — both via the unchanged Impl 020 functions.
    if (result.outcome === "error") return failed(mapProviderError(result.error));
    return parseProviderResponse(result.body, this.kind);
  }
}
