// reasoning domain: the Hypothesis aggregate root.
//
// A falsifiable, revisable claim. Immutable-by-operation: every mutating-looking method returns a
// NEW Hypothesis sharing prior history. It is never a fact, never certain; contradictions are kept
// visible; falsified/retired hypotheses are preserved and excluded from active support.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { Signal } from "../../observation/index.ts";
import type { HypothesisId } from "./ids.ts";
import { newHypothesisId } from "./ids.ts";
import type { HypothesisClaim, HypothesisScope } from "./hypothesis-claim.ts";
import type { Falsifier } from "./falsifier.ts";
import type { ClaimConfidence, ConfidenceLevel } from "./claim-confidence.ts";
import { claimConfidence } from "./claim-confidence.ts";
import type { EvidenceDirection } from "./evidence-direction.ts";
import type { EvidenceCase } from "./evidence-case.ts";
import { createEvidenceCase } from "./evidence-case.ts";
import type { HypothesisLifecycleState, HypothesisRevision } from "./hypothesis-lifecycle.ts";
import { canTransition, isActiveSupport, receivesEvidence } from "./hypothesis-lifecycle.ts";

export interface OpenHypothesisInput {
  readonly id?: HypothesisId;
  readonly claim: HypothesisClaim;
  readonly scope: HypothesisScope;
  readonly athleteRef?: string;
  readonly purposeContextRef?: string;
  /** non-empty tuple: an unfalsifiable hypothesis is a compile error */
  readonly falsifiers: readonly [Falsifier, ...Falsifier[]];
  readonly confidence?: ClaimConfidence;
  readonly limitations?: readonly string[];
}

export interface AttachEvidenceInput {
  readonly signal: Signal;
  readonly direction: EvidenceDirection;
  readonly reasoningNote: string;
  readonly at: Timestamp;
  readonly limitations?: readonly string[];
}

interface HypothesisProps {
  readonly id: HypothesisId;
  readonly claim: HypothesisClaim;
  readonly scope: HypothesisScope;
  readonly athleteRef: string | undefined;
  readonly purposeContextRef: string | undefined;
  readonly state: HypothesisLifecycleState;
  readonly confidence: ClaimConfidence;
  readonly limitations: readonly string[];
  readonly falsifiers: readonly Falsifier[];
  readonly evidence: readonly EvidenceCase[];
  readonly revisions: readonly HypothesisRevision[];
}

function nextStateForEvidence(
  current: HypothesisLifecycleState,
  direction: EvidenceDirection,
  hasDeclaredFalsifier: boolean,
): HypothesisLifecycleState {
  switch (direction) {
    case "falsifies":
      if (!hasDeclaredFalsifier) {
        throw new Error("Cannot falsify: the hypothesis has no declared falsifier to satisfy");
      }
      return "falsified";
    case "contradicts":
      return "contradicted";
    case "weakens":
      return "weakened";
    case "supports":
      return "supported";
    case "contextualizes":
      return current === "proposed" ? "active" : current;
  }
}

function deriveConfidence(
  evidence: readonly EvidenceCase[],
  state: HypothesisLifecycleState,
): ClaimConfidence {
  if (state === "falsified") {
    return claimConfidence("tentative", ["claim falsified by a declared falsifier"]);
  }
  if (state === "retired") {
    return claimConfidence("tentative", ["hypothesis retired"]);
  }

  const limitations: string[] = [];
  const has = (d: EvidenceDirection) => evidence.some((e) => e.direction === d);
  const hasConflict = evidence.some((e) => e.quality.status === "source-conflicted");
  const hasDegraded = evidence.some((e) => e.quality.status !== "complete");

  let level: ConfidenceLevel = "tentative";
  if (has("supports") && !has("contradicts") && !has("weakens")) {
    level = "moderate";
  }
  if (has("contradicts")) {
    level = "limited";
    limitations.push("contradicted by evidence");
  }
  if (has("weakens") && level !== "limited") {
    level = "limited";
    limitations.push("weakened by evidence");
  }
  if (hasConflict) {
    level = "limited";
    limitations.push("source conflict present");
  }
  if (hasDegraded) {
    limitations.push("some evidence quality is degraded");
  }
  if (state === "promoted-to-working-knowledge") {
    level = "well-supported";
    limitations.push("working knowledge: defeasible and reversible");
  }
  return claimConfidence(level, limitations);
}

export class Hypothesis {
  readonly id: HypothesisId;
  readonly claim: HypothesisClaim;
  readonly scope: HypothesisScope;
  readonly athleteRef: string | undefined;
  readonly purposeContextRef: string | undefined;
  readonly state: HypothesisLifecycleState;
  readonly confidence: ClaimConfidence;
  readonly limitations: readonly string[];
  readonly falsifiers: readonly Falsifier[];
  private readonly _evidence: readonly EvidenceCase[];
  private readonly _revisions: readonly HypothesisRevision[];

  private constructor(props: HypothesisProps) {
    this.id = props.id;
    this.claim = props.claim;
    this.scope = props.scope;
    this.athleteRef = props.athleteRef;
    this.purposeContextRef = props.purposeContextRef;
    this.state = props.state;
    this.confidence = props.confidence;
    this.limitations = Object.freeze([...props.limitations]);
    this.falsifiers = Object.freeze([...props.falsifiers]);
    this._evidence = Object.freeze([...props.evidence]);
    this._revisions = Object.freeze([...props.revisions]);
    Object.freeze(this);
  }

  static open(input: OpenHypothesisInput): Hypothesis {
    if (input.falsifiers.length === 0) {
      throw new Error("A Hypothesis must declare at least one falsifier (or a pending one with reason)");
    }
    const limitations = input.limitations ?? [];
    return new Hypothesis({
      id: input.id ?? newHypothesisId(),
      claim: input.claim,
      scope: input.scope,
      athleteRef: input.athleteRef,
      purposeContextRef: input.purposeContextRef,
      state: "proposed",
      confidence: input.confidence ?? claimConfidence("tentative", limitations),
      limitations,
      falsifiers: input.falsifiers,
      evidence: [],
      revisions: [],
    });
  }

  attachEvidence(input: AttachEvidenceInput): Hypothesis {
    if (!receivesEvidence(this.state)) {
      throw new Error(`Cannot attach evidence to a ${this.state} hypothesis`);
    }
    const evidenceCase = createEvidenceCase({
      signal: input.signal,
      direction: input.direction,
      reasoningNote: input.reasoningNote,
      at: input.at,
      ...(input.limitations !== undefined ? { limitations: input.limitations } : {}),
    });
    const hasDeclaredFalsifier = this.falsifiers.some((f) => f.status === "declared");
    const nextState = nextStateForEvidence(this.state, input.direction, hasDeclaredFalsifier);
    const evidence = [...this._evidence, evidenceCase];
    const confidence = deriveConfidence(evidence, nextState);
    const revisions =
      nextState === this.state
        ? this._revisions
        : [
            ...this._revisions,
            Object.freeze({
              at: input.at,
              from: this.state,
              to: nextState,
              cause: `evidence ${input.direction}: ${input.reasoningNote}`,
            }),
          ];
    return new Hypothesis({ ...this.toProps(), state: nextState, confidence, evidence, revisions });
  }

  transition(to: HypothesisLifecycleState, cause: string, at: Timestamp): Hypothesis {
    if (!canTransition(this.state, to)) {
      throw new Error(`Illegal transition: ${this.state} -> ${to}`);
    }
    if (typeof cause !== "string" || cause.length === 0) {
      throw new Error("A lifecycle transition requires an explicit cause");
    }
    const revision: HypothesisRevision = Object.freeze({ at, from: this.state, to, cause });
    const confidence =
      to === "promoted-to-working-knowledge"
        ? deriveConfidence(this._evidence, to)
        : to === "retired"
          ? deriveConfidence(this._evidence, to)
          : this.confidence;
    return new Hypothesis({
      ...this.toProps(),
      state: to,
      confidence,
      revisions: [...this._revisions, revision],
    });
  }

  promote(cause: string, at: Timestamp): Hypothesis {
    return this.transition("promoted-to-working-knowledge", cause, at);
  }

  retire(cause: string, at: Timestamp): Hypothesis {
    return this.transition("retired", cause, at);
  }

  get evidence(): readonly EvidenceCase[] {
    return this._evidence;
  }

  get revisions(): readonly HypothesisRevision[] {
    return this._revisions;
  }

  isActiveSupport(): boolean {
    return isActiveSupport(this.state);
  }

  private toProps(): HypothesisProps {
    return {
      id: this.id,
      claim: this.claim,
      scope: this.scope,
      athleteRef: this.athleteRef,
      purposeContextRef: this.purposeContextRef,
      state: this.state,
      confidence: this.confidence,
      limitations: this.limitations,
      falsifiers: this.falsifiers,
      evidence: this._evidence,
      revisions: this._revisions,
    };
  }
}
