// rendering application: ManagedSecretCredentialSource (Impl 028) — a provider-neutral, async managed-secret
// credential-source boundary behind the existing EnvironmentProviderCredentialResolver / ProviderCredentialResolver
// seam. It retrieves ONE configured secret from an INJECTED async store client (pure TypeScript interface — no
// cloud SDK, no network token, no dependency change), then produces the existing EnvironmentCredentialSource map
// consumed by the existing synchronous EnvironmentProviderCredentialResolver (pre-fetch pattern — the downstream
// synchronous chain is UNCHANGED). It reads NO process environment, imports no cloud SDK, imports nothing
// outside rendering, and adds no new dependency.
//
// secret manager = credential source
// secret manager ≠ live-call enablement
// secret manager ≠ provider trust
// secret manager ≠ domain evidence

import type { EnvironmentCredentialSource } from "./environment-provider-credential-resolver.ts";

/**
 * Internal 4-state resolution from the managed-secret store client.
 * Never exposed raw to callers outside this boundary; the available branch's value is placed in the
 * EnvironmentCredentialSource map and immediately wrapped by EnvironmentProviderCredentialResolver.
 */
export type ManagedSecretResolution =
  | { readonly status: "available"; readonly value: string }
  | { readonly status: "missing" }
  | { readonly status: "invalid" }
  | { readonly status: "unavailable" };

/**
 * Async retrieval boundary — pure TypeScript interface; no cloud SDK; injected in all usage.
 * Implementations must catch all exceptions internally and return unavailable rather than reject.
 * In this slice only FakeManagedSecretStoreClient exists; cloud adapters belong in a later slice.
 */
export interface ManagedSecretStoreClient {
  /** Always resolves — never rejects. Implementations must catch all exceptions internally. */
  retrieve(secretName: string): Promise<ManagedSecretResolution>;
}

export interface ManagedSecretSourceConfig {
  /** Opaque store reference (path, name, ARN — deferred to cloud adapter in a later slice). */
  readonly secretName: string;
  /** Injected async client — never constructed automatically; tests use FakeManagedSecretStoreClient. */
  readonly storeClient: ManagedSecretStoreClient;
}

/**
 * Pre-fetch a managed secret and produce the EnvironmentCredentialSource map consumed by the existing
 * synchronous EnvironmentProviderCredentialResolver. Usage pattern:
 *
 *   const source = await managedSecretSource.toEnvironmentCredentialSource();
 *   const resolver = new EnvironmentProviderCredentialResolver({ keyName: secretName, source });
 *   // resolver is now synchronous and compatible with LiveProviderClient / liveProviderSmoke — unchanged
 */
export class ManagedSecretCredentialSource {
  private readonly secretName: string;
  private readonly storeClient: ManagedSecretStoreClient;

  constructor(config: ManagedSecretSourceConfig) {
    this.secretName = config.secretName;
    this.storeClient = config.storeClient;
  }

  /**
   * Retrieve the managed secret and produce an EnvironmentCredentialSource map for
   * EnvironmentProviderCredentialResolver. Always resolves (never rejects): store failures map to an
   * empty source, which the resolver classifies as missing — no provider call occurs.
   * The raw value is placed in the map only on available; it is never returned in non-available paths.
   */
  async toEnvironmentCredentialSource(): Promise<EnvironmentCredentialSource> {
    const resolution = await this.storeClient.retrieve(this.secretName);
    if (resolution.status === "available") {
      return Object.freeze({ [this.secretName]: resolution.value });
    }
    // missing / invalid / unavailable → empty source → resolver classifies as "missing" → no call.
    return Object.freeze({});
  }
}

/** Deterministic scenario catalog for FakeManagedSecretStoreClient — no real secret, no network. */
export type ManagedSecretClientScenario = "available" | "missing" | "invalid" | "unavailable";

/**
 * Deterministic fake for tests. Uses the sentinel "opaque:test-managed-secret" for the available path —
 * clearly not a real credential, matching the StaticProviderCredentialResolver ("opaque:test-credential")
 * precedent. No real secret, no real network, no SDK. Constructed explicitly — never a global singleton.
 */
export class FakeManagedSecretStoreClient implements ManagedSecretStoreClient {
  private readonly scenario: ManagedSecretClientScenario;

  constructor(opts?: { readonly scenario?: ManagedSecretClientScenario }) {
    this.scenario = opts?.scenario ?? "available";
  }

  async retrieve(_secretName: string): Promise<ManagedSecretResolution> {
    if (this.scenario === "available") {
      return Object.freeze({ status: "available", value: "opaque:test-managed-secret" });
    }
    return Object.freeze({ status: this.scenario });
  }
}
