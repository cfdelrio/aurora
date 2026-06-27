// reasoning domain: EvidenceCase (entity inside Hypothesis) + TraceToSignal.
//
// `createEvidenceCase` is intentionally NOT part of the reasoning public surface — it is created
// ONLY by Hypothesis.attachEvidence, so an EvidenceCase cannot exist outside a Hypothesis.
// A SignalRejection cannot become evidence: the input is typed `Signal`, and a runtime guard
// rejects anything whose outcome is not "signal".

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { ObservationId, ObservationSetId } from "../../../shared-kernel/ids.ts";
import type { Signal, ObservationQuality } from "../../observation/index.ts";
import type { EvidenceCaseId } from "./ids.ts";
import { newEvidenceCaseId } from "./ids.ts";
import type { EvidenceDirection } from "./evidence-direction.ts";

/** Reasoning-level bottom link: the EvidenceCase -> its Signal -> observation roots.
 *  This is NOT the full TraceabilityChain (recommendation-level, owned by decision-support). */
export interface TraceToSignal {
  readonly signal: Signal;
  readonly observationSetId: ObservationSetId;
  readonly observationIds: readonly ObservationId[];
  readonly references: readonly string[];
}

export function traceToSignal(signal: Signal): TraceToSignal {
  return Object.freeze({
    signal,
    observationSetId: signal.trace.observationSetId,
    observationIds: signal.trace.observationIds,
    references: signal.trace.references,
  });
}

export interface EvidenceCase {
  readonly id: EvidenceCaseId;
  readonly trace: TraceToSignal;
  readonly direction: EvidenceDirection;
  readonly quality: ObservationQuality;
  readonly limitations: readonly string[];
  readonly reasoningNote: string;
  readonly at: Timestamp;
}

export interface CreateEvidenceCaseInput {
  readonly signal: Signal;
  readonly direction: EvidenceDirection;
  readonly reasoningNote: string;
  readonly at: Timestamp;
  readonly limitations?: readonly string[];
}

export function createEvidenceCase(input: CreateEvidenceCaseInput): EvidenceCase {
  // A SignalRejection (outcome "rejection") is a type error; this also guards untyped callers.
  if ((input.signal as { outcome?: string }).outcome !== "signal") {
    throw new Error("Only a Signal (not a SignalRejection) can become evidence");
  }
  if (typeof input.reasoningNote !== "string" || input.reasoningNote.length === 0) {
    throw new Error("An EvidenceCase requires a reasoning note");
  }
  return Object.freeze({
    id: newEvidenceCaseId(),
    trace: traceToSignal(input.signal),
    direction: input.direction,
    quality: input.signal.quality,
    limitations: Object.freeze([...(input.limitations ?? [])]),
    reasoningNote: input.reasoningNote,
    at: input.at,
  });
}
