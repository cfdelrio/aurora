// rendering application: operator-live-smoke-entrypoint support (Impl 027) — the PURE, typechecked, testable core
// of the manual operator live-smoke entrypoint. It holds the decidable logic so the executable script
// (scripts/operator-live-smoke.mjs) can stay a thin wiring+I/O adapter. It READS NO process environment (env is
// an INJECTED record), calls no provider, imports no live transport / process-env adapter / concrete-provider
// internals / delivery / event-recording / application-orchestration, performs no side effect, and never reads or
// emits a raw draft / prompt / payload / response / secret / env value / rendered-message body. It parses the
// operator opt-in / CI indicators, builds a SAFE synthetic rendering request, projects a LiveProviderSmokeResult
// into a redacted operator output, and maps a status to a safe exit code. Smoke proves wiring, not wisdom.

import type { RenderingRequest, RenderableDomainOutput } from "../domain/index.ts";
import type { LiveProviderSmokeResult, LiveProviderSmokeStatus } from "./live-provider-smoke.ts";

/** The exact, neutral operator opt-in flag name. */
export const OPERATOR_SMOKE_OPT_IN_KEY = "AURORA_LIVE_PROVIDER_SMOKE";
/** Only this exact value enables the run — no truthy variants. */
export const OPERATOR_SMOKE_OPT_IN_VALUE = "1";
/** The CI indicator key — any truthy value blocks the run. */
export const OPERATOR_SMOKE_CI_KEY = "CI";
/** The operator-supplied live endpoint key (a non-secret URL; read only by the outside-src script). */
export const OPERATOR_SMOKE_ENDPOINT_KEY = "AURORA_LIVE_PROVIDER_ENDPOINT";

/** Parsed operator indicators (booleans) — fed to liveProviderSmoke's command, which owns the gates. */
export interface OperatorSmokeIndicators {
  readonly optIn: boolean;
  readonly ci: boolean;
}

/** A CI value is "truthy" unless it is absent, empty, "0", or "false" (case-insensitive). */
function isCiTruthy(value: string | undefined): boolean {
  if (value === undefined) return false;
  const v = value.trim().toLowerCase();
  return v !== "" && v !== "0" && v !== "false";
}

/**
 * Parse the operator indicators from an INJECTED env record (never the real process environment). Opt-in requires
 * the EXACT value "1"; anything absent/other fails closed to `optIn: false`. CI truthy → `ci: true`.
 */
export function parseOperatorSmokeEnv(env: Readonly<Record<string, string | undefined>>): OperatorSmokeIndicators {
  return Object.freeze({
    optIn: env[OPERATOR_SMOKE_OPT_IN_KEY] === OPERATOR_SMOKE_OPT_IN_VALUE,
    ci: isCiTruthy(env[OPERATOR_SMOKE_CI_KEY]),
  });
}

/**
 * A bounded, deterministic, SYNTHETIC rendering request for the smoke run. It carries NO athlete-sensitive or
 * real training data, NO chain-of-thought, and NO production prompt template — only clearly-synthetic content.
 */
export function syntheticSmokeRenderingRequest(): RenderingRequest {
  const renderable: RenderableDomainOutput = {
    sourceCaseRef: "case:operator-smoke",
    kind: "support",
    voice: "Reflection",
    intent: "reflect",
    contentAtoms: ["operational smoke check — synthetic content"],
    allowedClaims: ["operational smoke check — synthetic content"],
    forbiddenClaims: [],
    uncertaintyVisibleRequired: true,
    limitations: [],
    traceability: { status: "complete", summary: "synthetic smoke traceability", observationSetId: "obs:operator-smoke" },
    agencyRequired: true,
    conditions: [],
  };
  return Object.freeze({ renderable });
}

/** A closed, redacted operator output — safe codes only; never a raw draft/payload/response/secret/env/body. */
export interface OperatorSmokeOutput {
  readonly status: LiveProviderSmokeStatus;
  /** literal false — the explicit "no raw payload was retained" statement (inherited from the helper result) */
  readonly rawRetained: false;
  /** true iff status === "passed" — a passed smoke is WIRING success only, never product readiness */
  readonly wiringOnly: boolean;
  /** literal — no persistence / delivery / event recording / domain mutation occurred */
  readonly sideEffects: "none";
  readonly validationPassed?: boolean;
  readonly providerFailureCode?: string;
  readonly reason?: string;
  readonly durationMs?: number;
}

/** Project the (already redacted) helper result into the operator output — carries no new content. */
export function operatorSmokeOutput(result: LiveProviderSmokeResult): OperatorSmokeOutput {
  return Object.freeze({
    status: result.status,
    rawRetained: false,
    wiringOnly: result.status === "passed",
    sideEffects: "none",
    ...(result.validationPassed !== undefined ? { validationPassed: result.validationPassed } : {}),
    ...(result.providerFailureCode !== undefined ? { providerFailureCode: result.providerFailureCode } : {}),
    ...(result.reason !== undefined ? { reason: result.reason } : {}),
    ...(result.durationMs !== undefined ? { durationMs: result.durationMs } : {}),
  });
}

/**
 * Map a smoke status to a safe exit code: 0 for `passed` and the safe skips (`not-enabled`/`ci-disabled`);
 * 1 for operational failures. The status is always present in the output; the code leaks no detail.
 */
export function operatorSmokeExitCode(status: LiveProviderSmokeStatus): 0 | 1 {
  return status === "passed" || status === "not-enabled" || status === "ci-disabled" ? 0 : 1;
}
