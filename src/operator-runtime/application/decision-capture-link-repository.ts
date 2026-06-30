// operator-runtime application: DecisionCaptureLink (+ factory) and its repository PORT.
//
// A persisted LINK between an operator run and the safe athlete-decision-capture INVITATION the
// envelope carried. It is an invitation/ref only — it is NOT a decision and not a decision's source:
//   DecisionCaptureLink ≠ AthleteDecision · DecisionCaptureLink ≠ decision source.
// It records no decided value, no resolution, and no decision content; the AthleteDecision (if any)
// is created elsewhere, from an athlete-declared/athlete-reported source, never derived from this
// link. Ids + timestamps are injected (no Date.now, no crypto here).

import type { Timestamp } from "../../shared-kernel/time.ts";
import type { OperatorSessionDecisionCapture } from "../../modules/application-orchestration/index.ts";
import type { OperatorSessionRunId } from "./operator-session-run-repository.ts";

declare const decisionCaptureLinkIdBrand: unique symbol;
export type DecisionCaptureLinkId = string & { readonly [decisionCaptureLinkIdBrand]: true };

export interface DecisionCaptureLink {
  readonly id: DecisionCaptureLinkId;
  readonly runId: OperatorSessionRunId;
  readonly athleteRef: string;
  /** the safe invitation/ref the envelope carried — NEVER an AthleteDecision, never a decided value */
  readonly capture: OperatorSessionDecisionCapture;
  readonly createdAt: Timestamp;
}

export interface DecisionCaptureLinkInput {
  readonly id: DecisionCaptureLinkId;
  readonly runId: OperatorSessionRunId;
  readonly athleteRef: string;
  readonly capture: OperatorSessionDecisionCapture;
  readonly createdAt: Timestamp;
}

export function decisionCaptureLink(input: DecisionCaptureLinkInput): DecisionCaptureLink {
  if (input === null || typeof input !== "object") {
    throw new Error("DecisionCaptureLink requires id, runId, athleteRef, capture, createdAt");
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("DecisionCaptureLink requires a non-empty id");
  }
  if (typeof input.runId !== "string" || input.runId.length === 0) {
    throw new Error("DecisionCaptureLink requires a non-empty runId");
  }
  if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
    throw new Error("DecisionCaptureLink requires a non-empty athleteRef");
  }
  if (input.capture === null || typeof input.capture !== "object") {
    throw new Error("DecisionCaptureLink requires an athlete-decision-invitation capture");
  }
  if (input.capture.kind !== "athlete-decision-invitation") {
    throw new Error(
      `DecisionCaptureLink.capture must be an invitation, never a decision; got kind: ${String(input.capture.kind)}`,
    );
  }
  if (input.createdAt === undefined) {
    throw new Error("DecisionCaptureLink requires createdAt");
  }
  // whitelist the capture — invitation/ref only, never a spread of a polluted object
  const capture: OperatorSessionDecisionCapture = {
    kind: input.capture.kind,
    athleteRef: input.capture.athleteRef,
    acceptableSources: input.capture.acceptableSources,
  };
  return Object.freeze({
    id: input.id,
    runId: input.runId,
    athleteRef: input.athleteRef,
    capture,
    createdAt: input.createdAt,
  });
}

export interface DecisionCaptureLinkRepository {
  save(record: DecisionCaptureLink): Promise<void>;
  findById(id: DecisionCaptureLinkId): Promise<DecisionCaptureLink | undefined>;
  findByRun(runId: OperatorSessionRunId): Promise<readonly DecisionCaptureLink[]>;
  listByAthlete(athleteRef: string): Promise<readonly DecisionCaptureLink[]>;
}
