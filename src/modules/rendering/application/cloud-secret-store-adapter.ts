// rendering application: CloudSecretStoreAdapter (Implementation 029) — a provider-neutral cloud-secret
// adapter contract layer BEHIND the existing managed-secret seam (Impl 028). It implements the existing
// ManagedSecretStoreClient interface by calling an INJECTED, transport-level CloudSecretValueClient and
// MAPPING its richer, cloud-like outcomes — and any thrown exception — into the existing 4-state
// ManagedSecretResolution, fail-closed and fully redacted. It selects no cloud provider, imports no cloud
// SDK, reads no process environment, opens no network, adds no dependency, and enables no live call.
//
//   ManagedSecretStoreClient  = Aurora provider-neutral seam (Impl 028; returns ManagedSecretResolution)
//   CloudSecretValueClient    = injected cloud-like transport boundary (returns the richer lookup result)
//   CloudSecretStoreAdapter   = mapper / redactor / fail-closed adapter implementing ManagedSecretStoreClient
//
// secret manager = credential source
// secret manager ≠ live-call enablement
// cloud adapter  ≠ provider trust ≠ smoke success ≠ production rollout
// secret ref     ≠ secret value
// cloud response ≠ safe failure code

import type {
  ManagedSecretResolution,
  ManagedSecretStoreClient,
} from "./managed-secret-credential-source.ts";

/**
 * Opaque, non-sensitive reference to a cloud-stored secret. A ref is NOT a value. The concrete
 * representation (path / version / stage) is deferred to a future provider-selection slice.
 */
export interface CloudSecretRef {
  readonly name: string;
}

/**
 * Richer, lower-level outcome from a cloud-like transport boundary. This is intentionally distinct from
 * ManagedSecretResolution: it carries the cloud-like failure shape the adapter must classify and redact.
 * Only the "found" branch carries a value; no branch carries a raw cloud response body or metadata bag.
 */
export type CloudSecretLookupResult =
  | { readonly status: "found"; readonly value: string }
  | { readonly status: "not_found" }
  | { readonly status: "malformed" }
  | { readonly status: "denied" }
  | { readonly status: "unauthenticated" }
  | { readonly status: "unavailable" }
  | { readonly status: "timeout" }
  | { readonly status: "throttled" };

/**
 * Transport boundary hidden BEHIND the adapter — a pure TypeScript interface; no cloud SDK; injected in all
 * usage. Unlike ManagedSecretStoreClient, an implementation MAY reject/throw: the adapter catches every
 * exception internally and never lets it surface. In this slice only FakeCloudSecretValueClient exists.
 */
export interface CloudSecretValueClient {
  lookup(ref: CloudSecretRef): Promise<CloudSecretLookupResult>;
}

/**
 * Private, redacted classification the adapter uses to reason about WHY a lookup did not yield a usable
 * credential. It is a closed enum — never a free-form bag, never a raw cloud cause, never a stack trace.
 * It is deliberately NOT part of the outward ManagedSecretResolution contract.
 */
export type CloudSecretAdapterFailureCode =
  | "not-configured"
  | "missing"
  | "malformed"
  | "denied"
  | "unauthenticated"
  | "service-unavailable"
  | "timeout"
  | "throttled"
  | "transport-error";

/** true if the value is empty, all-whitespace, or contains any C0 control character or DEL. */
function isMalformedValue(value: string): boolean {
  if (value.trim().length === 0) return true;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Map a cloud-like lookup result to the existing 4-state ManagedSecretResolution. Fail-closed: every
 * non-found outcome resolves to missing / invalid / unavailable with no payload — never a raw value, never
 * a raw cloud response, never a metadata bag. The value appears only on the available branch.
 */
function mapLookup(result: CloudSecretLookupResult): ManagedSecretResolution {
  switch (result.status) {
    case "found":
      // "invalid returned credential" — a found-but-malformed value never flows downstream.
      if (isMalformedValue(result.value)) return Object.freeze({ status: "invalid" });
      return Object.freeze({ status: "available", value: result.value });
    case "not_found":
      return Object.freeze({ status: "missing" });
    case "malformed":
      return Object.freeze({ status: "invalid" });
    // permission denied, unauthenticated runtime identity, SDK/cloud service unavailable, timeout, and
    // throttling/rate-limiting all collapse to the safe "unavailable" status — the resolver treats the
    // resulting empty source as missing, so no provider call occurs.
    case "denied":
    case "unauthenticated":
    case "unavailable":
    case "timeout":
    case "throttled":
      return Object.freeze({ status: "unavailable" });
  }
}

export interface CloudSecretStoreAdapterConfig {
  /** Injected cloud-like transport boundary — never constructed automatically; tests use the fake. */
  readonly cloudClient: CloudSecretValueClient;
}

/**
 * Adapter implementing the existing ManagedSecretStoreClient by delegating to an injected
 * CloudSecretValueClient and mapping its richer outcomes into ManagedSecretResolution. Honors the Impl 028
 * contract: retrieve() ALWAYS resolves and NEVER rejects — any exception thrown by the injected client is
 * caught internally and mapped to the safe "unavailable" status. Used as the storeClient of
 * ManagedSecretCredentialSource; the downstream synchronous resolver chain is UNCHANGED.
 */
export class CloudSecretStoreAdapter implements ManagedSecretStoreClient {
  private readonly cloudClient: CloudSecretValueClient;

  constructor(config: CloudSecretStoreAdapterConfig) {
    this.cloudClient = config.cloudClient;
  }

  async retrieve(secretName: string): Promise<ManagedSecretResolution> {
    // "not configured" — an empty/blank ref name never reaches the transport; classify as missing.
    if (secretName.trim().length === 0) {
      return Object.freeze({ status: "missing" });
    }
    const ref: CloudSecretRef = Object.freeze({ name: secretName });
    try {
      const result = await this.cloudClient.lookup(ref);
      return mapLookup(result);
    } catch {
      // unexpected transport exception — caught internally; no raw cause retained, fail-closed.
      return Object.freeze({ status: "unavailable" });
    }
  }
}

/** Deterministic scenario catalog for FakeCloudSecretValueClient — no real secret, no network. */
export type CloudSecretClientScenario =
  | "found"
  | "found-malformed"
  | "not_found"
  | "malformed"
  | "denied"
  | "unauthenticated"
  | "unavailable"
  | "timeout"
  | "throttled"
  | "throws";

/**
 * Deterministic fake for tests. Uses the sentinel "opaque:test-cloud-secret" for the found path — clearly
 * not a real credential, matching the established opaque-sentinel precedent. The "throws" scenario rejects,
 * proving the adapter's catch-all. No real secret, no real network, no SDK. Constructed explicitly.
 */
export class FakeCloudSecretValueClient implements CloudSecretValueClient {
  private readonly scenario: CloudSecretClientScenario;

  constructor(opts?: { readonly scenario?: CloudSecretClientScenario }) {
    this.scenario = opts?.scenario ?? "found";
  }

  async lookup(_ref: CloudSecretRef): Promise<CloudSecretLookupResult> {
    switch (this.scenario) {
      case "found":
        return Object.freeze({ status: "found", value: "opaque:test-cloud-secret" });
      case "found-malformed":
        // a found value that is blank — the adapter must classify it as invalid.
        return Object.freeze({ status: "found", value: "   " });
      case "throws":
        throw new Error("simulated cloud transport failure");
      default:
        return Object.freeze({ status: this.scenario });
    }
  }
}
