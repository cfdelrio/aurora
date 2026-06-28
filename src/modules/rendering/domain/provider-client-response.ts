// rendering domain: the client request/response at the (future) real-provider boundary. The request carries
// only structured, derived instruction material + non-secret config + an operational secret REF; it has no
// raw key / arbitrary prompt / chain-of-thought / mutable handle / payload bag. The response is untrusted:
// a draft (+ OPERATIONAL metadata only) or an operational failure — no authority field, no secret, no raw
// provider payload.

import type { ProviderInstruction } from "./provider-instruction.ts";
import type { ProviderClientConfig } from "./provider-client-config.ts";
import type { ProviderSecretRef } from "./provider-secret-ref.ts";
import type { ProviderOperationalFailure } from "./provider-operational-failure.ts";

export interface ProviderClientRequest {
  readonly sourceCaseRef: string;
  readonly instruction: ProviderInstruction; // structured, derived
  readonly config: ProviderClientConfig; // non-secret
  readonly secret: ProviderSecretRef; // status + opaque ref only
}

/** OPERATIONAL metadata only — never domain authority, never evidence, never retained in the raw-free audit. */
export interface ProviderClientMetadata {
  readonly providerKind: string;
  readonly latencyMs?: number;
  readonly tokenCount?: number;
  readonly finishReason?: string;
}

export type ProviderClientResponse =
  | { readonly status: "draft"; readonly text: string; readonly metadata?: ProviderClientMetadata }
  | {
      readonly status: "failed";
      readonly failure: ProviderOperationalFailure;
      readonly metadata?: ProviderClientMetadata;
    };
