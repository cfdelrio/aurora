// operator-runtime application: OperatorSessionEnvelopeRecord (+ factory) and its repository PORT.
//
// The ONLY safe result a run persists. It stores an OperatorSessionEnvelope — the whitelisted,
// reference-only projection built by toOperatorSessionEnvelope (Spec 040) — and NOTHING else:
//   OperatorSessionEnvelopeRecord ≠ raw OfflineReflectionRuntimeOutcome ·
//   OperatorSessionEnvelopeRecord ≠ delivered artifact.
// There is no reflection.text, no raw provider output, no hidden reasoning, no secret, no delivery
// id/artifact, no eventRecordIds, and no AthleteDecision. The factory does NOT trust its input shape:
// it rebuilds the envelope field-by-field (a whitelist, never a spread), so even a polluted object
// cast as OperatorSessionEnvelope cannot smuggle an unsafe field into storage. Ids + timestamps are
// injected (no Date.now, no crypto here).

import type { Timestamp } from "../../shared-kernel/time.ts";
import type { OperatorSessionEnvelope } from "../../modules/application-orchestration/index.ts";
import type { OperatorSessionRunId } from "./operator-session-run-repository.ts";

declare const operatorSessionEnvelopeRecordIdBrand: unique symbol;
export type OperatorSessionEnvelopeRecordId = string & {
  readonly [operatorSessionEnvelopeRecordIdBrand]: true;
};

export interface OperatorSessionEnvelopeRecord {
  readonly id: OperatorSessionEnvelopeRecordId;
  readonly runId: OperatorSessionRunId;
  readonly athleteRef: string;
  /** the ONLY payload — a safe, whitelisted OperatorSessionEnvelope (re-whitelisted on construction) */
  readonly envelope: OperatorSessionEnvelope;
  readonly recordedAt: Timestamp;
}

export interface OperatorSessionEnvelopeRecordInput {
  readonly id: OperatorSessionEnvelopeRecordId;
  readonly runId: OperatorSessionRunId;
  readonly athleteRef: string;
  readonly envelope: OperatorSessionEnvelope;
  readonly recordedAt: Timestamp;
}

/**
 * Re-project an OperatorSessionEnvelope onto a fresh whitelist. Mirrors toOperatorSessionEnvelope:
 * every field is chosen by name; the input is never spread. This is the persistence-side guarantee
 * that an unsafe field can never ride along into storage even if the caller passes a polluted object.
 * Exported so every storage path (this record factory + the row mapper) shares ONE redaction source.
 */
export function whitelistOperatorSessionEnvelope(envelope: OperatorSessionEnvelope): OperatorSessionEnvelope {
  return Object.freeze({
    status: envelope.status,
    deliveryWithheld: true,
    rawRetained: false,
    ...(envelope.reflectionRef !== undefined ? { reflectionRef: envelope.reflectionRef } : {}),
    ...(envelope.reflectionFlags !== undefined
      ? {
          reflectionFlags: {
            validationPassed: true,
            uncertaintyPreserved: envelope.reflectionFlags.uncertaintyPreserved,
            limitationsPreserved: envelope.reflectionFlags.limitationsPreserved,
            traceabilityPreserved: envelope.reflectionFlags.traceabilityPreserved,
          } as const,
        }
      : {}),
    decisionCapture: {
      kind: envelope.decisionCapture.kind,
      athleteRef: envelope.decisionCapture.athleteRef,
      acceptableSources: envelope.decisionCapture.acceptableSources,
    },
    ...(envelope.admissionReason !== undefined ? { admissionReason: envelope.admissionReason } : {}),
    ...(envelope.safeReason !== undefined ? { safeReason: envelope.safeReason } : {}),
    intakeStatus: envelope.intakeStatus,
    mediation: { operatorRef: envelope.mediation.operatorRef },
    traceSummary: {
      stoppedAt: envelope.traceSummary.stoppedAt,
      ...(envelope.traceSummary.renderedMessageRecordId !== undefined
        ? { renderedMessageRecordId: envelope.traceSummary.renderedMessageRecordId }
        : {}),
      ...(envelope.traceSummary.displayEligibility !== undefined
        ? { displayEligibility: envelope.traceSummary.displayEligibility }
        : {}),
    },
  });
}

export function operatorSessionEnvelopeRecord(
  input: OperatorSessionEnvelopeRecordInput,
): OperatorSessionEnvelopeRecord {
  if (input === null || typeof input !== "object") {
    throw new Error("OperatorSessionEnvelopeRecord requires id, runId, athleteRef, envelope, recordedAt");
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("OperatorSessionEnvelopeRecord requires a non-empty id");
  }
  if (typeof input.runId !== "string" || input.runId.length === 0) {
    throw new Error("OperatorSessionEnvelopeRecord requires a non-empty runId");
  }
  if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
    throw new Error("OperatorSessionEnvelopeRecord requires a non-empty athleteRef");
  }
  if (input.envelope === null || typeof input.envelope !== "object") {
    throw new Error("OperatorSessionEnvelopeRecord requires an OperatorSessionEnvelope");
  }
  if (input.recordedAt === undefined) {
    throw new Error("OperatorSessionEnvelopeRecord requires recordedAt");
  }
  return Object.freeze({
    id: input.id,
    runId: input.runId,
    athleteRef: input.athleteRef,
    envelope: whitelistOperatorSessionEnvelope(input.envelope),
    recordedAt: input.recordedAt,
  });
}

export interface OperatorSessionEnvelopeRepository {
  save(record: OperatorSessionEnvelopeRecord): void;
  findById(id: OperatorSessionEnvelopeRecordId): OperatorSessionEnvelopeRecord | undefined;
  findByRun(runId: OperatorSessionRunId): readonly OperatorSessionEnvelopeRecord[];
  listByAthlete(athleteRef: string): readonly OperatorSessionEnvelopeRecord[];
}
