// reasoning application: thin coordinators. They COORDINATE, they do not reason.
// All lifecycle/confidence/falsification invariants live in the Hypothesis aggregate.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { Signal } from "../../observation/index.ts";
import { Hypothesis } from "../domain/index.ts";
import type {
  AttachEvidenceInput,
  EvidenceDirection,
  HypothesisLifecycleState,
  OpenHypothesisInput,
} from "../domain/index.ts";

export function openHypothesis(input: OpenHypothesisInput): Hypothesis {
  return Hypothesis.open(input);
}

export interface AttachSignalAsEvidenceInput {
  readonly hypothesis: Hypothesis;
  readonly signal: Signal;
  readonly direction: EvidenceDirection;
  readonly reasoningNote: string;
  readonly at: Timestamp;
  readonly limitations?: readonly string[];
}

export function attachSignalAsEvidence(input: AttachSignalAsEvidenceInput): Hypothesis {
  const attach: AttachEvidenceInput = {
    signal: input.signal,
    direction: input.direction,
    reasoningNote: input.reasoningNote,
    at: input.at,
    ...(input.limitations !== undefined ? { limitations: input.limitations } : {}),
  };
  return input.hypothesis.attachEvidence(attach);
}

export interface TransitionHypothesisInput {
  readonly hypothesis: Hypothesis;
  readonly to: HypothesisLifecycleState;
  readonly cause: string;
  readonly at: Timestamp;
}

export function transitionHypothesis(input: TransitionHypothesisInput): Hypothesis {
  return input.hypothesis.transition(input.to, input.cause, input.at);
}
