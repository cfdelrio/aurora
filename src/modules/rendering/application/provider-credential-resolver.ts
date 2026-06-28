// rendering application: ProviderCredentialResolver (Impl 021) — the ONLY place a provider credential may be
// resolved. It returns a RESOLUTION STATE (available / missing / invalid), never storing a raw credential into
// domain state, audit, records, errors, or logs. The available branch carries an OPAQUE credential token the
// transport may use transiently for the call boundary — it is a typed handle, not a domain value, and is never
// persisted/audited/exposed. This slice ships NO environment resolver and reads NO environment variables; credentials
// arrive via an injected resolver (the deterministic static resolver in tests/composition).

declare const credentialTokenBrand: unique symbol;
/** an opaque, transient credential handle — used only inside the transport call boundary; never persisted. */
export type ProviderCredentialToken = string & { readonly [credentialTokenBrand]: "provider-credential" };

/** wrap a non-secret operational handle as a credential token (this slice uses sentinels, not real secrets). */
export function providerCredentialToken(handle: string): ProviderCredentialToken {
  return handle as ProviderCredentialToken;
}

export type ProviderCredentialResolution =
  | { readonly status: "available"; readonly token: ProviderCredentialToken }
  | { readonly status: "missing" }
  | { readonly status: "invalid" };

export interface ProviderCredentialResolver {
  resolve(): ProviderCredentialResolution;
}
