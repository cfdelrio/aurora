// rendering domain: ProviderOperationalFailure — the closed client-level failure catalog for a (future)
// real provider call. It maps DOWN to the existing closed ProviderFailure (Impl 017) so credential/config
// detail never leaks into the domain-facing failure set and the core catalog is NOT expanded.

import type { ProviderFailure } from "./provider-failure.ts";

export type ProviderOperationalFailure =
  | "missing-credential"
  | "invalid-credential"
  | "provider-unavailable"
  | "provider-timeout"
  | "provider-rate-limited"
  | "provider-refused"
  | "provider-returned-empty-response"
  | "provider-returned-malformed-response"
  | "unsupported-provider-config"
  | "unsafe-provider-request";

export const PROVIDER_OPERATIONAL_FAILURES: readonly ProviderOperationalFailure[] = [
  "missing-credential",
  "invalid-credential",
  "provider-unavailable",
  "provider-timeout",
  "provider-rate-limited",
  "provider-refused",
  "provider-returned-empty-response",
  "provider-returned-malformed-response",
  "unsupported-provider-config",
  "unsafe-provider-request",
];

export function isProviderOperationalFailure(value: unknown): value is ProviderOperationalFailure {
  return typeof value === "string" && (PROVIDER_OPERATIONAL_FAILURES as readonly string[]).includes(value);
}

/** Map a client-level operational failure DOWN to the existing closed ProviderFailure (no expansion). */
export function toProviderFailure(op: ProviderOperationalFailure): ProviderFailure {
  switch (op) {
    case "missing-credential":
    case "invalid-credential":
    case "unsupported-provider-config":
    case "provider-unavailable":
      return "provider-unavailable";
    case "provider-timeout":
      return "provider-timeout";
    case "provider-rate-limited":
      return "provider-rate-limited";
    case "provider-refused":
      return "provider-refused";
    case "provider-returned-empty-response":
      return "provider-returned-empty-draft";
    case "provider-returned-malformed-response":
      return "provider-returned-invalid-draft";
    case "unsafe-provider-request":
      return "unsafe-provider-request";
  }
}
