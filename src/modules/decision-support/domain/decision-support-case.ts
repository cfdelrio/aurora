// decision-support domain: the DecisionSupportCase aggregate root.
//
// Guards the integrity of one unit of athlete-facing support. Opens from a DecisionOpportunity;
// produces NO terminal output before gates run; never owns AthleteDecision (only references it);
// owns no raw observations/signals/EvidenceCases/UnderstandingProfile; never authors claims;
// immutable-by-operation.

import type { UnderstandingAssessment } from "../../understanding/index.ts";
import type { DecisionSupportCaseId } from "./ids.ts";
import { newDecisionSupportCaseId } from "./ids.ts";
import type { DecisionOpportunity } from "./decision-opportunity.ts";
import type { PurposeContext } from "./purpose-alignment.ts";
import type { RiskAssessment } from "./risk-assessment.ts";
import type { CandidateSupport, TerminalOutput } from "./terminal-output.ts";
import type { TraceabilityVerificationResult } from "./traceability.ts";
import type { GateResult, DegradationReason } from "./gate-result.ts";
import type { SupportQuality, AthleteDecisionRef } from "./support-quality.ts";
import { supportQuality } from "./support-quality.ts";
import { selectTerminalOutput } from "./voice-selection-policy.ts";

export interface OpenCaseInput {
  readonly id?: DecisionSupportCaseId;
  readonly opportunity: DecisionOpportunity;
  readonly assessment: UnderstandingAssessment;
  readonly purpose: PurposeContext;
  readonly risk: RiskAssessment;
  readonly candidate: CandidateSupport;
  readonly trace: TraceabilityVerificationResult;
  readonly claimState: string;
}

interface CaseProps {
  readonly id: DecisionSupportCaseId;
  readonly opportunity: DecisionOpportunity;
  readonly assessment: UnderstandingAssessment;
  readonly purpose: PurposeContext;
  readonly risk: RiskAssessment;
  readonly candidate: CandidateSupport;
  readonly trace: TraceabilityVerificationResult;
  readonly claimState: string;
  readonly gateResults: readonly GateResult[];
  readonly degradations: readonly DegradationReason[];
  readonly selectedOutput: TerminalOutput | undefined;
  readonly supportQuality: SupportQuality | undefined;
  readonly athleteDecisionRef: AthleteDecisionRef | undefined;
}

/** Persistence shape (adapter contract; NOT the primary public domain API). Mirrors CaseProps. */
export type DecisionSupportCaseState = CaseProps;

export class DecisionSupportCase {
  readonly id: DecisionSupportCaseId;
  readonly opportunity: DecisionOpportunity;
  readonly assessment: UnderstandingAssessment;
  readonly purpose: PurposeContext;
  readonly risk: RiskAssessment;
  readonly candidate: CandidateSupport;
  readonly trace: TraceabilityVerificationResult;
  readonly claimState: string;
  readonly gateResults: readonly GateResult[];
  readonly degradations: readonly DegradationReason[];
  readonly selectedOutput: TerminalOutput | undefined;
  readonly supportQuality: SupportQuality | undefined;
  readonly athleteDecisionRef: AthleteDecisionRef | undefined;

  private constructor(props: CaseProps) {
    this.id = props.id;
    this.opportunity = props.opportunity;
    this.assessment = props.assessment;
    this.purpose = props.purpose;
    this.risk = props.risk;
    this.candidate = props.candidate;
    this.trace = props.trace;
    this.claimState = props.claimState;
    this.gateResults = Object.freeze([...props.gateResults]);
    this.degradations = Object.freeze([...props.degradations]);
    this.selectedOutput = props.selectedOutput;
    this.supportQuality = props.supportQuality;
    this.athleteDecisionRef = props.athleteDecisionRef;
    Object.freeze(this);
  }

  static open(input: OpenCaseInput): DecisionSupportCase {
    return new DecisionSupportCase({
      id: input.id ?? newDecisionSupportCaseId(),
      opportunity: input.opportunity,
      assessment: input.assessment,
      purpose: input.purpose,
      risk: input.risk,
      candidate: input.candidate,
      trace: input.trace,
      claimState: input.claimState,
      gateResults: [],
      degradations: [],
      selectedOutput: undefined, // NO output before gates run
      supportQuality: undefined,
      athleteDecisionRef: undefined,
    });
  }

  /** Runs the gates and the policy; returns a resolved case with a terminal output. */
  evaluate(): DecisionSupportCase {
    const result = selectTerminalOutput({
      assessment: this.assessment,
      purpose: this.purpose,
      risk: this.risk,
      candidate: this.candidate,
      trace: this.trace,
      claimState: this.claimState,
    });
    const quality = supportQuality(
      result.gateResults.filter((g) => g.verdict === "pass").map((g) => g.gate),
      this.trace.status,
      result.degradations.length > 0,
    );
    return new DecisionSupportCase({ ...this.toProps(), ...{
      gateResults: result.gateResults,
      degradations: result.degradations,
      selectedOutput: result.output,
      supportQuality: quality,
    } });
  }

  /** References the athlete's later decision. It is NOT owned; outcome never validates support. */
  recordAthleteDecisionRef(ref: AthleteDecisionRef): DecisionSupportCase {
    return new DecisionSupportCase({ ...this.toProps(), athleteDecisionRef: ref });
  }

  private toProps(): CaseProps {
    return {
      id: this.id,
      opportunity: this.opportunity,
      assessment: this.assessment,
      purpose: this.purpose,
      risk: this.risk,
      candidate: this.candidate,
      trace: this.trace,
      claimState: this.claimState,
      gateResults: this.gateResults,
      degradations: this.degradations,
      selectedOutput: this.selectedOutput,
      supportQuality: this.supportQuality,
      athleteDecisionRef: this.athleteDecisionRef,
    };
  }

  /** Persistence state export. Plain, serializable; exposes no mutable internal reference. */
  toState(): DecisionSupportCaseState {
    return Object.freeze(this.toProps());
  }

  /** Rebuild from persisted state. Does NOT re-run evaluate(); the selected output is stored. The
   *  case carries only an AthleteDecisionRef -- it never owns an AthleteDecision object. */
  static reconstitute(state: DecisionSupportCaseState): DecisionSupportCase {
    if (state.id === undefined) {
      throw new Error("Cannot reconstitute a DecisionSupportCase without an id");
    }
    if (state.opportunity === undefined) {
      throw new Error("Cannot reconstitute a DecisionSupportCase without a DecisionOpportunity");
    }
    if (typeof state.claimState !== "string") {
      throw new Error("Cannot reconstitute a DecisionSupportCase without a claimState");
    }
    if (state.assessment === undefined || state.purpose === undefined || state.trace === undefined) {
      throw new Error("Cannot reconstitute a DecisionSupportCase without assessment/purpose/trace");
    }
    return new DecisionSupportCase(state);
  }
}
