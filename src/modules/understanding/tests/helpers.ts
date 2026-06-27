// understanding test helpers. (Not a .test. file.)

import { timestamp } from "../../../shared-kernel/time.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";
import {
  reasoningOutcome,
  understandingDimension,
} from "../index.ts";
import type { OutcomeKind, ReasoningOutcome, UnderstandingDimension } from "../index.ts";
import type { HypothesisId } from "../../reasoning/index.ts";

export const T = (iso: string): Timestamp => timestamp(iso);

export function dim(
  responsePattern = "aerobic-response",
  conditionContext = "high-intensity",
): UnderstandingDimension {
  return understandingDimension(responsePattern, conditionContext);
}

let counter = 0;
function hid(): HypothesisId {
  counter += 1;
  return `hyp-${counter}` as unknown as HypothesisId;
}

export interface OutcomeOpts {
  readonly kind: OutcomeKind;
  readonly hadDeclaredFalsifier?: boolean;
  readonly conditions?: readonly string[];
  readonly dimension?: UnderstandingDimension;
  readonly at?: string;
  readonly athleteRef?: string;
}

export function outcome(opts: OutcomeOpts): ReasoningOutcome {
  return reasoningOutcome({
    hypothesisId: hid(),
    athleteRef: opts.athleteRef ?? "athlete:1",
    outcomeKind: opts.kind,
    hadDeclaredFalsifier: opts.hadDeclaredFalsifier ?? false,
    conditions: opts.conditions ?? ["baseline"],
    dimension: opts.dimension ?? dim(),
    at: T(opts.at ?? "2026-01-02T09:00:00.000Z"),
  });
}
