// rendering application: liveProviderSmoke (Impl 026) — a manual, OPT-IN, fail-closed operational WIRING CHECK
// for the live-provider path. It is NOT a default test, NOT a CI test, NOT a production rollout, NOT model
// evaluation, NOT telemetry. It composes the EXISTING rendering/provider seam — requestRealProviderRendering ->
// the mandatory validateDraft — through INJECTED collaborators only: an opt-in indicator, a CI indicator, a
// ProviderCredentialResolver, a LiveCallPolicy, a non-secret config, and a ProviderClientBoundary client (the
// live client, wired by the caller). It reads NO process environment, holds NO secret, imports NO transport /
// environment adapter / delivery / event-recording / application-orchestration, persists nothing, delivers
// nothing, records no event, creates no rendered-message record / review / display eligibility / evidence, and
// mutates no domain. It makes AT MOST ONE provider call (no loop, no re-issue) and returns a CLOSED, REDACTED
// result carrying safe codes only — never a raw draft / prompt / payload / response / secret / environment value
// / rendered-message body. validateDraft stays the only path to a RenderedMessage; provider success is wiring
// success, never evidence; a smoke result triggers nothing.

import { requestRealProviderRendering } from "./real-provider-rendering-service.ts";
import type { ProviderRenderOutcome } from "./provider-rendering-service.ts";
import type { ProviderClientBoundary } from "./provider-client-boundary.ts";
import type { LiveCallPolicy } from "./live-call-policy.ts";
import type { ProviderCredentialResolver } from "./provider-credential-resolver.ts";
import type { RenderingRequest, ProviderClientConfig, ProviderSecretRef } from "../domain/index.ts";

/** Closed status catalog for a live-provider smoke run. Each is a safe operational disposition. */
export type LiveProviderSmokeStatus =
  | "not-enabled" // no operator opt-in — stopped BEFORE credential resolution / any provider call
  | "ci-disabled" // CI indicator present — stopped BEFORE credential resolution / any provider call
  | "credential-missing" // resolver: missing — stopped BEFORE any provider call
  | "credential-invalid" // resolver: invalid — stopped BEFORE any provider call
  | "live-policy-disabled" // policy disabled — stopped BEFORE any provider call
  | "provider-failed" // one provider call; non-validation failure (carries a closed ProviderFailure code)
  | "validation-failed" // provider drafted, but the mandatory validateDraft rejected it
  | "passed" // provider drafted AND validateDraft accepted — wiring OK (NOT evidence, NOT product-ready)
  | "unexpected-failure"; // an unexpected error — safe result, no raw content

export const LIVE_PROVIDER_SMOKE_STATUSES: readonly LiveProviderSmokeStatus[] = [
  "not-enabled",
  "ci-disabled",
  "credential-missing",
  "credential-invalid",
  "live-policy-disabled",
  "provider-failed",
  "validation-failed",
  "passed",
  "unexpected-failure",
];

/** Command — DATA only (no collaborators). Carries a SYNTHETIC, bounded request; no raw credential/prompt/payload. */
export interface LiveProviderSmokeCommand {
  /** explicit operator opt-in indicator — INJECTED (never read from the process environment by this helper) */
  readonly optIn: boolean;
  /** CI indicator — INJECTED (never read from the process environment by this helper) */
  readonly ci: boolean;
  /** a synthetic, bounded rendering request — no athlete-sensitive data, no prompt template */
  readonly request: RenderingRequest;
}

/** Dependencies — all side-effecting collaborators INJECTED; no globals, no environment read, no service locator. */
export interface LiveProviderSmokeDependencies {
  /** the live client behind the existing async boundary (the caller wires it with the same policy/resolver/transport) */
  readonly client: ProviderClientBoundary;
  /** the live-call policy — used here ONLY for the explicit pre-call gate; disabled by default */
  readonly policy: LiveCallPolicy;
  /** the credential resolver — resolved ONCE as the explicit pre-call gate (deterministic / idempotent) */
  readonly resolver: ProviderCredentialResolver;
  /** non-secret provider config (neutral providerKind) */
  readonly config: ProviderClientConfig;
  /** optional millisecond clock for a safe duration; omit to omit duration (keeps tests deterministic) */
  readonly now?: () => number;
}

/** Closed, REDACTED result — safe codes only; never a raw draft/prompt/payload/response/secret/env value/body. */
export interface LiveProviderSmokeResult {
  readonly status: LiveProviderSmokeStatus;
  /** literal false — the explicit "no raw payload was retained" statement */
  readonly rawRetained: false;
  /** present on passed (true) / validation-failed (false) */
  readonly validationPassed?: boolean;
  /** a closed ProviderFailure code — present ONLY for provider-failed */
  readonly providerFailureCode?: string;
  /** a safe, closed/derived reason code — never raw text */
  readonly reason?: string;
  /** a safe duration in ms — present only when a clock is injected and a provider call ran */
  readonly durationMs?: number;
}

interface ResultFields {
  readonly validationPassed?: boolean;
  readonly providerFailureCode?: string;
  readonly reason?: string;
  readonly durationMs?: number;
}

function result(status: LiveProviderSmokeStatus, fields: ResultFields = {}): LiveProviderSmokeResult {
  return Object.freeze({
    status,
    rawRetained: false,
    ...(fields.validationPassed !== undefined ? { validationPassed: fields.validationPassed } : {}),
    ...(fields.providerFailureCode !== undefined ? { providerFailureCode: fields.providerFailureCode } : {}),
    ...(fields.reason !== undefined ? { reason: fields.reason } : {}),
    ...(fields.durationMs !== undefined ? { durationMs: fields.durationMs } : {}),
  });
}

/**
 * Run ONE manual, opt-in live-provider wiring check through the existing seam. The explicit fail-closed gates run
 * in order — opt-in, CI, credential, live policy — and EACH stops BEFORE any provider call. Only when all four
 * pass is the single provider call made via requestRealProviderRendering (so the mandatory validateDraft, inside
 * that service, stays the only path to a RenderedMessage). Returns a redacted result; records nothing, delivers
 * nothing, mutates nothing.
 */
export async function liveProviderSmoke(
  command: LiveProviderSmokeCommand,
  deps: LiveProviderSmokeDependencies,
): Promise<LiveProviderSmokeResult> {
  // 1. explicit operator opt-in — absent ⇒ stop BEFORE credential resolution / any provider call.
  if (!command.optIn) return result("not-enabled");

  // 2. CI guard — present ⇒ stop BEFORE credential resolution / any provider call.
  if (command.ci) return result("ci-disabled");

  // 3. credential gate (explicit, precise) — resolve ONCE; missing/invalid ⇒ stop BEFORE any provider call.
  const credential = deps.resolver.resolve();
  if (credential.status === "missing") return result("credential-missing");
  if (credential.status === "invalid") return result("credential-invalid");

  // 4. live-policy gate — disabled ⇒ stop BEFORE any provider call.
  if (!deps.policy.enabled) return result("live-policy-disabled");

  // 5. ONE provider call through the existing seam. The credential is available + policy enabled here; the secret
  //    ref is a SAFE opaque operational handle (never a secret). The injected client owns the actual call boundary
  //    (its own policy/resolver/transport), and validateDraft (inside the service) stays the only path to a message.
  const secret: ProviderSecretRef = { status: "present", ref: "ref:live" };
  const start = deps.now?.();
  let outcome: ProviderRenderOutcome;
  try {
    outcome = await requestRealProviderRendering({
      request: command.request,
      client: deps.client,
      config: deps.config,
      secret,
    });
  } catch {
    // an unexpected error — safe result; no secret, no raw provider body.
    return result("unexpected-failure");
  }
  const end = deps.now?.();
  const durationMs = start !== undefined && end !== undefined ? end - start : undefined;
  const withDuration = (fields: ResultFields): ResultFields =>
    durationMs !== undefined ? { ...fields, durationMs } : fields;

  // 6. map the outcome to a redacted result — never the message body, never a raw draft/response.
  if (outcome.status === "rendered") {
    return result("passed", withDuration({ validationPassed: true }));
  }
  if (outcome.failure === "provider-output-failed-validation") {
    return result("validation-failed", withDuration({ validationPassed: false, reason: outcome.failure }));
  }
  return result("provider-failed", withDuration({ providerFailureCode: outcome.failure, reason: outcome.failure }));
}
