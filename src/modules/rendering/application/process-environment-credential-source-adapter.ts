// rendering application: ProcessEnvironmentCredentialSourceAdapter (Impl 023) — the ONE approved file that may
// read the real process environment. It adapts the real environment into the existing injected
// EnvironmentCredentialSource shape (Impl 022): it reads EXACTLY ONE explicitly configured key (via an injected
// accessor) and returns a source containing only that key when a value is present, else an empty source. It does
// NOT classify the value, NOT call the resolver / live client / transport / provider / validateDraft, NOT
// persist / audit / log, and NOT mutate domain. Classification stays in EnvironmentProviderCredentialResolver;
// LiveCallPolicy still gates transport; validateDraft remains the authority. The direct process-environment token
// appears ONLY in `defaultProcessEnvironmentAccessor` below — nowhere else in src/ (a repo-wide guard asserts it).

import type { EnvironmentCredentialSource } from "./environment-provider-credential-resolver.ts";

/** Narrow accessor: one lookup of one key. Tests inject a fake; production uses the default accessor below. */
export type ProcessEnvironmentAccessor = (key: string) => string | undefined;

export interface ProcessEnvironmentAdapterConfig {
  /** the single, explicit, neutral key to read — never derived from domain data */
  readonly keyName: string;
  /** REQUIRED — no implicit default, so a test can never accidentally read the real environment */
  readonly accessor: ProcessEnvironmentAccessor;
}

/** The neutral, approved operational key (vendor stays doc-level; no vendor token). */
export const APPROVED_PROVIDER_CREDENTIAL_KEY = "AURORA_PROVIDER_CREDENTIAL";

export class ProcessEnvironmentCredentialSourceAdapter {
  private readonly keyName: string;
  private readonly accessor: ProcessEnvironmentAccessor;

  constructor(config: ProcessEnvironmentAdapterConfig) {
    this.keyName = config.keyName;
    this.accessor = config.accessor;
  }

  /** Produce the injected source shape — only the configured key, only when a value is present. */
  toEnvironmentCredentialSource(): EnvironmentCredentialSource {
    // a blank/whitespace key name is unusable — fail closed to an empty source (the resolver also rejects it).
    if (this.keyName.length === 0 || this.keyName.trim() !== this.keyName) return Object.freeze({});

    // read ONLY the configured key (one call) — no scan, no fallback. The value is not classified here.
    const value = this.accessor(this.keyName);
    if (value === undefined) return Object.freeze({});
    return Object.freeze({ [this.keyName]: value });
  }
}

/**
 * The ONLY direct real-environment read site in the codebase. Not used by the default test suite (tests inject a
 * fake accessor). No logging, no fallback scan, no domain input — it returns the raw value for the resolver to
 * classify and the transport to use transiently.
 */
export const defaultProcessEnvironmentAccessor: ProcessEnvironmentAccessor = (key) => process.env[key];

/** Production wiring: the adapter bound to the real-environment accessor. The only construction that reads env. */
export function processEnvironmentCredentialSourceAdapter(
  keyName: string = APPROVED_PROVIDER_CREDENTIAL_KEY,
): ProcessEnvironmentCredentialSourceAdapter {
  return new ProcessEnvironmentCredentialSourceAdapter({ keyName, accessor: defaultProcessEnvironmentAccessor });
}
