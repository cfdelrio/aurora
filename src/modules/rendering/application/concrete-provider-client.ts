// rendering application: ConcreteProviderClient (Impl 020) — the FIRST concrete adapter for the selected
// provider (recorded at the doc/decision level in Spec 020A), kept NEUTRAL in code so the structural guards
// stay intact. It implements the existing async ProviderClientBoundary (Impl 019) and is DISABLED BY DEFAULT:
// with no injected transport it returns a safe operational failure and performs no work. It uses NO SDK, NO
// HTTP client, NO network, NO environment read, and NO secret value. A live-call path does NOT exist in this
// slice; the only non-default behavior is a DETERMINISTIC, in-process fixture transport used by tests. The
// client composes serializer -> transport -> parser / error-mapper; it never calls validateDraft, never
// exposes a raw payload/secret/prompt, and never creates a RenderedMessage.

import type { ProviderClientRequest, ProviderClientResponse } from "../domain/index.ts";
import type { ProviderClientBoundary } from "./provider-client-boundary.ts";
import {
  serializeProviderInstruction,
  type ConcreteProviderRequestPayload,
} from "./concrete-provider-prompt-serializer.ts";
import { parseProviderResponse } from "./concrete-provider-response-parser.ts";
import { mapProviderError } from "./concrete-provider-error-mapper.ts";

/** A deterministic, in-process fixture for a request payload: either a provider-shaped response or error. */
export type ConcreteProviderFixture =
  | { readonly outcome: "response"; readonly response: unknown }
  | { readonly outcome: "error"; readonly error: unknown };

/** A pure, in-process transport. NOT a network call — it returns a deterministic fixture for the payload. */
export interface ConcreteProviderTransport {
  (payload: ConcreteProviderRequestPayload): ConcreteProviderFixture;
}

export interface ConcreteProviderClientOptions {
  /** descriptive, NEUTRAL label — never the selected vendor's token; defaults to "concrete" */
  readonly kind?: string;
  /** OPTIONAL deterministic in-process transport (tests only). Absent => live calls disabled => safe failure. */
  readonly transport?: ConcreteProviderTransport;
}

export class ConcreteProviderClient implements ProviderClientBoundary {
  readonly kind: string;
  private readonly transport?: ConcreteProviderTransport;

  constructor(options?: ConcreteProviderClientOptions) {
    this.kind = options?.kind ?? "concrete";
    if (options?.transport !== undefined) this.transport = options.transport;
  }

  requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse> {
    const failed = (failure: ProviderClientResponse): Promise<ProviderClientResponse> =>
      Promise.resolve(Object.freeze(failure));

    // 1. credential safety — a non-present credential fails safely; no transport is consulted.
    if (input.secret.status === "missing") {
      return failed({ status: "failed", failure: "missing-credential" });
    }
    if (input.secret.status === "invalid") {
      return failed({ status: "failed", failure: "invalid-credential" });
    }

    // 2. live calls disabled by default — with no in-process transport, do no work and fail safe.
    if (this.transport === undefined) {
      return failed({ status: "failed", failure: mapProviderError({ kind: "live-disabled" }) });
    }

    // 3. deterministic in-process path (tests): serialize -> transport -> parse / map. NEVER a network call.
    const payload = serializeProviderInstruction(input.instruction);
    const fixture = this.transport(payload);
    if (fixture.outcome === "error") {
      return failed({ status: "failed", failure: mapProviderError(fixture.error) });
    }
    return Promise.resolve(parseProviderResponse(fixture.response, this.kind));
  }
}
