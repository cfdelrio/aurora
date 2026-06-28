// rendering application: StaticProviderCredentialResolver (Impl 021) — a DETERMINISTIC, test/composition-only
// ProviderCredentialResolver. It simulates available / missing / invalid credential states without any real
// secret, env read, or network. The "available" token is a non-secret operational sentinel (never a real key),
// used only transiently by the transport. No real credential string appears here, in tests, or in errors.

import {
  providerCredentialToken,
  type ProviderCredentialResolver,
  type ProviderCredentialResolution,
} from "./provider-credential-resolver.ts";

export type StaticCredentialStatus = "available" | "missing" | "invalid";

export class StaticProviderCredentialResolver implements ProviderCredentialResolver {
  private readonly status: StaticCredentialStatus;

  constructor(opts?: { readonly status?: StaticCredentialStatus }) {
    this.status = opts?.status ?? "available";
  }

  resolve(): ProviderCredentialResolution {
    if (this.status === "missing") return Object.freeze({ status: "missing" });
    if (this.status === "invalid") return Object.freeze({ status: "invalid" });
    // non-secret sentinel — proves the available path without a real key
    return Object.freeze({ status: "available", token: providerCredentialToken("opaque:test-credential") });
  }
}
