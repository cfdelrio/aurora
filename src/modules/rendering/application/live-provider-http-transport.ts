// rendering application: LiveProviderHttpTransport (Impl 021) — the ONE production file permitted to perform a
// native network call. It uses Node's built-in fetch (no SDK, no dependency, no node http/https import) behind an
// injected endpoint (no hard-coded vendor URL — vendor stays doc-level), with an AbortSignal timeout from the
// policy. It maps HTTP status / transport failures onto a CLOSED, neutral result: a provider-shaped response
// body (handed to the unchanged parser) or a neutral error kind (handed to the unchanged error mapper). It
// reads NO environment variables, holds NO vendor token, re-issues no call, persists nothing, validates nothing, logs no
// secret, and never returns a raw credential. The credential is used transiently in the request header only.

import type { ConcreteProviderRequestPayload } from "./concrete-provider-prompt-serializer.ts";
import type { ConcreteProviderErrorShape } from "./concrete-provider-error-mapper.ts";
import type { ProviderCredentialToken } from "./provider-credential-resolver.ts";
import type { LiveCallPolicy } from "./live-call-policy.ts";

/** closed transport result: a provider-shaped body for the parser, or a neutral error kind for the mapper. */
export type LiveProviderTransportResult =
  | { readonly outcome: "response"; readonly body: unknown }
  | { readonly outcome: "error"; readonly error: ConcreteProviderErrorShape };

export interface LiveProviderTransport {
  send(
    payload: ConcreteProviderRequestPayload,
    credential: ProviderCredentialToken,
    policy: LiveCallPolicy,
  ): Promise<LiveProviderTransportResult>;
}

const fail = (kind: ConcreteProviderErrorShape["kind"]): LiveProviderTransportResult =>
  Object.freeze({ outcome: "error", error: Object.freeze({ kind }) });

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

/** Build the real transport over an injected endpoint. Never invoked by the default test suite. */
export function liveProviderHttpTransport(config: { readonly endpoint: string }): LiveProviderTransport {
  const transport: LiveProviderTransport = {
    async send(payload, credential, policy): Promise<LiveProviderTransportResult> {
      let response: Response;
      try {
        response = await fetch(config.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(policy.timeoutMs),
        });
      } catch (err) {
        return isTimeout(err) ? fail("timeout") : fail("network-unavailable");
      }

      if (response.status === 429) return fail("rate-limit");
      if (response.status === 401 || response.status === 403) return fail("invalid-credential");
      if (response.status >= 500) return fail("network-unavailable");
      if (!response.ok) return fail("unknown");

      try {
        const body: unknown = await response.json();
        return Object.freeze({ outcome: "response", body });
      } catch {
        return fail("malformed-response");
      }
    },
  };
  return Object.freeze(transport);
}
