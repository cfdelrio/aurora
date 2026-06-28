// rendering domain: ProviderClientConfig — provider-AGNOSTIC, NON-SECRET configuration for a (future) real
// provider client. `providerKind`/`modelRef` are opaque labels, not a chosen real provider; `timeoutMs` is
// advisory only this slice. No API key, no endpoint URL, no SDK config, no secret.

export interface ProviderClientConfig {
  readonly providerKind: string; // descriptive label, e.g. "fake" — NOT a chosen real provider
  readonly timeoutMs?: number; // operational; advisory only this slice
  readonly modelRef?: string; // opaque deployment/model label if ever needed; no default, no real value
}
