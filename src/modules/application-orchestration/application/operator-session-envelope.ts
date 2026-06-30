// application-orchestration application: the OPERATOR SESSION ENVELOPE — a safe, whitelisted, reference-only
// projection of an OfflineReflectionRuntimeOutcome (Spec 040 / Tech Spec 040A, Decision 1 = Option C).
//
// This is a PURE, SYNCHRONOUS mapper. It makes Spec 040's redaction contract ENFORCEABLE: it constructs a new
// object FIELD-BY-FIELD (a whitelist), never spreading the raw outcome, so no unsafe field can leak by accident.
// It invokes nothing — no runtime, provider, delivery sink, repository, event recorder, secret resolver, or
// process environment — and it owns no domain. It is NOT an invocation helper: it does not call
// offlineReflectionRuntime; it only narrows an outcome a caller already holds.
//
// safe envelope ≠ raw runtime dump · safe envelope ≠ rendered message persistence · safe envelope ≠ delivery
// artifact · safe envelope ≠ provider output · safe envelope ≠ hidden reasoning · safe envelope ≠ secret material ·
// safe envelope ≠ AthleteDecision · safe envelope ≠ recommendation quality proof · safe envelope ≠ truth proof ·
// reflection-ready ≠ delivered ≠ AthleteDecision · deliveryWithheld ≠ delivery failure · decisionCapture
// invitation ≠ AthleteDecision · admission success ≠ truth · validateDraft success ≠ recommendation quality ·
// Aurora advises, the athlete decides; Aurora never presents inference as fact.

import type { OfflineReflectionRuntimeOutcome, OfflineReflectionStatus } from "./offline-reflection-runtime.ts";
import type { ExternalRenderableRejectionReason } from "./external-renderable-admission.ts";

/** Safe boolean flags about the validated reflection — never its text. Present only on reflection-ready. */
export interface OperatorSessionReflectionFlags {
  readonly validationPassed: true;
  readonly uncertaintyPreserved: boolean;
  readonly limitationsPreserved: boolean;
  readonly traceabilityPreserved: boolean;
}

/** A safe invitation/ref to capture a future athlete decision — NEVER an AthleteDecision. */
export interface OperatorSessionDecisionCapture {
  readonly kind: "athlete-decision-invitation";
  readonly athleteRef: string;
  readonly acceptableSources: readonly ["athlete-declared", "athlete-reported"];
}

/** A ref-only whitelist subset of the OrchestrationTrace — ids/codes only, never raw content. */
export interface OperatorSessionTraceSummary {
  readonly stoppedAt: string;
  readonly renderedMessageRecordId?: string;
  readonly displayEligibility?: "eligible" | "ineligible";
}

/**
 * The stable, safe, reference-only session envelope (Spec 040). Whitelisted projection of a runtime outcome:
 * every field below is deliberately chosen. There is NO reflection text, raw provider output, hidden reasoning,
 * secret, delivery artifact/id, eventRecordIds, AthleteDecision, or raw exception/stack.
 */
export interface OperatorSessionEnvelope {
  readonly status: OfflineReflectionStatus; // exact runtime status — no rename
  readonly deliveryWithheld: true; // always — the runtime never delivers
  readonly rawRetained: false; // always — redacted by design
  readonly reflectionRef?: string; // reflection-ready only — a REF, never reflection.text
  readonly reflectionFlags?: OperatorSessionReflectionFlags; // reflection-ready only — safe flags, no text
  readonly decisionCapture: OperatorSessionDecisionCapture; // invitation/ref only
  readonly admissionReason?: ExternalRenderableRejectionReason; // renderable-inadmissible only — safe closed code
  readonly safeReason?: string; // closed code from trace.reasonCode — never raw text
  readonly intakeStatus: string; // intake.status — safe summary code only
  readonly mediation: { readonly operatorRef: string }; // operational marker — not decision ownership
  readonly traceSummary: OperatorSessionTraceSummary; // ref-only subset
}

/**
 * Project an OfflineReflectionRuntimeOutcome into a safe OperatorSessionEnvelope. Pure + synchronous. It builds
 * the result field-by-field (whitelist) — it NEVER spreads `outcome` — and exposes a `reflectionRef`/flags only on
 * reflection-ready (never the reflection text). It calls nothing and mutates nothing.
 */
export function toOperatorSessionEnvelope(outcome: OfflineReflectionRuntimeOutcome): OperatorSessionEnvelope {
  const traceSummary: OperatorSessionTraceSummary = {
    stoppedAt: String(outcome.trace.stoppedAt),
    ...(outcome.trace.renderedMessageRecordId !== undefined
      ? { renderedMessageRecordId: outcome.trace.renderedMessageRecordId }
      : {}),
    ...(outcome.trace.displayEligibility !== undefined
      ? { displayEligibility: outcome.trace.displayEligibility }
      : {}),
  };

  const decisionCapture: OperatorSessionDecisionCapture = {
    kind: outcome.decisionCapture.kind,
    athleteRef: outcome.decisionCapture.athleteRef,
    acceptableSources: outcome.decisionCapture.acceptableSources,
  };

  // A reflection REF + safe flags are exposed ONLY on reflection-ready, and ONLY a record id (never the text).
  const reflectionReady =
    outcome.status === "reflection-ready" &&
    outcome.reflection !== undefined &&
    outcome.trace.renderedMessageRecordId !== undefined;

  return Object.freeze({
    status: outcome.status,
    deliveryWithheld: true,
    rawRetained: false,
    ...(reflectionReady ? { reflectionRef: outcome.trace.renderedMessageRecordId } : {}),
    ...(reflectionReady && outcome.reflection !== undefined
      ? {
          reflectionFlags: {
            validationPassed: true,
            uncertaintyPreserved: outcome.reflection.uncertaintyPreserved,
            limitationsPreserved: outcome.reflection.limitationsPreserved,
            traceabilityPreserved: outcome.reflection.traceabilityPreserved,
          } as const,
        }
      : {}),
    decisionCapture,
    ...(outcome.admissionReason !== undefined ? { admissionReason: outcome.admissionReason } : {}),
    ...(outcome.trace.reasonCode !== undefined ? { safeReason: outcome.trace.reasonCode } : {}),
    intakeStatus: String(outcome.intake.status),
    mediation: { operatorRef: outcome.mediation.operatorRef },
    traceSummary,
  });
}
