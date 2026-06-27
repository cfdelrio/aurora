// rendering domain: ProviderFailure — the closed set of behavioral reasons a provider drafting attempt
// (or its constrained request) fails. The network-flavored members (provider-unavailable / -timeout /
// -rate-limited) are FAKE-CONFIGURABLE ONLY: the deterministic FakeProviderAdapter can be told to return
// them so they are testable catalog members, but no real network/provider produces them this slice.
// No arbitrary strings; a provider failure never leaks into domain authority.

export type ProviderFailure =
  | "provider-unavailable" // fake-configurable; no real network semantics
  | "provider-timeout" // fake-configurable; no real network semantics
  | "provider-rate-limited" // fake-configurable; no real network semantics
  | "provider-returned-empty-draft"
  | "provider-returned-invalid-draft"
  | "provider-refused"
  | "provider-output-failed-validation"
  | "unsafe-provider-request"
  | "unsupported-locale"
  | "unsupported-style";

export const PROVIDER_FAILURES: readonly ProviderFailure[] = [
  "provider-unavailable",
  "provider-timeout",
  "provider-rate-limited",
  "provider-returned-empty-draft",
  "provider-returned-invalid-draft",
  "provider-refused",
  "provider-output-failed-validation",
  "unsafe-provider-request",
  "unsupported-locale",
  "unsupported-style",
];

export function isProviderFailure(value: unknown): value is ProviderFailure {
  return typeof value === "string" && (PROVIDER_FAILURES as readonly string[]).includes(value);
}
