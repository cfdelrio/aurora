// rendering application: concrete-provider error mapper (Impl 020). A PURE, deterministic mapping from a
// neutral, provider-shaped error (a local fixture this slice) DOWN to the existing closed
// ProviderOperationalFailure (Impl 019). It never expands the operational catalog, never reads a secret, and
// never copies a raw provider message/payload into the result. Unknown / unrecognized errors map to the safe
// `provider-unavailable` without leaking anything. From here the existing toProviderFailure(...) maps further
// DOWN into the existing closed ProviderFailure (Impl 017) — no ProviderFailure expansion either.

import type { ProviderOperationalFailure } from "../domain/index.ts";

/** Neutral discriminators for the conditions a (future) real provider call could surface. No vendor token. */
export type ConcreteProviderErrorKind =
  | "live-disabled"
  | "missing-credential"
  | "invalid-credential"
  | "network-unavailable"
  | "timeout"
  | "rate-limit"
  | "refusal"
  | "empty-response"
  | "malformed-response"
  | "unsupported-config"
  | "unknown";

/** A neutral, provider-shaped error object. Only a safe discriminator is read; no message/payload is copied. */
export interface ConcreteProviderErrorShape {
  readonly kind: ConcreteProviderErrorKind;
}

const ERROR_KIND_TO_OPERATIONAL: Readonly<Record<ConcreteProviderErrorKind, ProviderOperationalFailure>> =
  Object.freeze({
    "live-disabled": "provider-unavailable",
    "missing-credential": "missing-credential",
    "invalid-credential": "invalid-credential",
    "network-unavailable": "provider-unavailable",
    timeout: "provider-timeout",
    "rate-limit": "provider-rate-limited",
    refusal: "provider-refused",
    "empty-response": "provider-returned-empty-response",
    "malformed-response": "provider-returned-malformed-response",
    "unsupported-config": "unsupported-provider-config",
    unknown: "provider-unavailable",
  });

function isErrorKind(value: unknown): value is ConcreteProviderErrorKind {
  return typeof value === "string" && value in ERROR_KIND_TO_OPERATIONAL;
}

/** Map a provider-shaped error to a safe operational failure. Anything unrecognized → provider-unavailable. */
export function mapProviderError(error: unknown): ProviderOperationalFailure {
  if (error !== null && typeof error === "object" && isErrorKind((error as { kind?: unknown }).kind)) {
    return ERROR_KIND_TO_OPERATIONAL[(error as ConcreteProviderErrorShape).kind];
  }
  // unknown shape — never inspect/copy the raw payload; fail safe
  return "provider-unavailable";
}
