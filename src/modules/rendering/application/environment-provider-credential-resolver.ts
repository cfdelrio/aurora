// rendering application: EnvironmentProviderCredentialResolver (Impl 022) — the first credential resolver that
// reads from an environment/config source, behind the existing ProviderCredentialResolver port. It reads from an
// INJECTED, read-only source map (NOT the real process environment — there is no direct environment read in this
// slice), looking up EXACTLY ONE explicitly configured key. It classifies the value as missing / invalid /
// available and returns the existing ProviderCredentialResolution; the available branch wraps the value in the
// existing opaque, transient ProviderCredentialToken used only by the transport. It never scans the source, never
// derives the key from domain data, never exposes a raw secret in a failure, calls no transport / provider /
// validateDraft, persists nothing, audits nothing, and mutates no domain. Credential availability is NOT
// live-call enablement — the LiveCallPolicy stays a separate, disabled-by-default gate.

import {
  providerCredentialToken,
  type ProviderCredentialResolver,
  type ProviderCredentialResolution,
} from "./provider-credential-resolver.ts";

/** A narrow, read-only source of configuration values (injected; a deterministic map in tests). */
export type EnvironmentCredentialSource = Readonly<Record<string, string | undefined>>;

/** Minimal, neutral validation policy — no vendor-specific format. */
export interface CredentialValidationPolicy {
  /** reject values shorter than this (after the blank/control checks); small + neutral */
  readonly minLength: number;
}

const DEFAULT_VALIDATION: CredentialValidationPolicy = Object.freeze({ minLength: 8 });

export interface EnvironmentResolverConfig {
  /** the single, explicit, neutral key to read — never derived from domain data */
  readonly keyName: string;
  /** the injected, read-only source — NOT the real process environment */
  readonly source: EnvironmentCredentialSource;
  readonly validation?: CredentialValidationPolicy;
}

/** true if the value contains any C0 control character or DEL (incl. line breaks / tabs). */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export class EnvironmentProviderCredentialResolver implements ProviderCredentialResolver {
  private readonly keyName: string;
  private readonly source: EnvironmentCredentialSource;
  private readonly minLength: number;

  constructor(config: EnvironmentResolverConfig) {
    this.keyName = config.keyName;
    this.source = config.source;
    this.minLength = (config.validation ?? DEFAULT_VALIDATION).minLength;
  }

  resolve(): ProviderCredentialResolution {
    const missing: ProviderCredentialResolution = Object.freeze({ status: "missing" });
    const invalid: ProviderCredentialResolution = Object.freeze({ status: "invalid" });

    // 1. the configured key name must be explicit (non-empty, no surrounding whitespace) — else fail closed.
    if (this.keyName.length === 0 || this.keyName.trim() !== this.keyName) return invalid;

    // 2. read ONLY that key from the injected source (no scan, no fallback, no domain-derived name).
    const value = this.source[this.keyName];

    // 3. classify — absent => missing; blank/control/too-short => invalid; else => available.
    if (value === undefined) return missing;
    if (value.trim().length === 0) return invalid;
    if (hasControlChar(value)) return invalid;
    if (value.length < this.minLength) return invalid;

    // available — wrap transiently as the opaque token; the raw value lives only here + the transport header.
    return Object.freeze({ status: "available", token: providerCredentialToken(value) });
  }
}
