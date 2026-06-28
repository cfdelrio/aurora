// rendering domain: ProviderSecretRef — a SAFE operational credential reference for a (future) real
// provider. It carries only a status + an OPAQUE handle (e.g. "ref:fake"); it NEVER holds a raw secret /
// API key. Secrets are operational, never domain data: they are not persisted in records, not audited, not
// logged, and not exposed in errors. There is simply no field here to put a key in.

export type ProviderCredentialStatus = "present" | "missing" | "invalid";

export const PROVIDER_CREDENTIAL_STATUSES: readonly ProviderCredentialStatus[] = ["present", "missing", "invalid"];

export interface ProviderSecretRef {
  readonly status: ProviderCredentialStatus;
  /** an opaque operational handle (e.g. "ref:fake") — NEVER a raw secret value */
  readonly ref?: string;
}

export function isProviderCredentialStatus(value: unknown): value is ProviderCredentialStatus {
  return typeof value === "string" && (PROVIDER_CREDENTIAL_STATUSES as readonly string[]).includes(value);
}
