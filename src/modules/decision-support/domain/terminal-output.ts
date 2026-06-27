// decision-support domain: the three terminal outputs.
//
// DecisionSupport may use a VoiceMode (never Silence -- Silence is realized as Withholding).
// Inquiry is NOT a VoiceMode (no `voice` field). Withholding is responsible silence with a reason.
// Agency is enforced structurally: a DecisionSupport REQUIRES preservesAgency: true (literal).

import type { VoiceMode } from "./voice-mode.ts";
import type { TraceabilityVerificationResult } from "./traceability.ts";

export type SupportIntent = "reflect" | "frame" | "warn" | "recommend";

/** Structured intent metadata used to enforce agency without natural-language generation. */
export type ProhibitedIntentMarker =
  | "command"
  | "shame"
  | "certainty-claim"
  | "hidden-uncertainty"
  | "decision-ownership";

export interface CandidateSupport {
  readonly intent: SupportIntent;
  readonly markers: readonly ProhibitedIntentMarker[];
  readonly uncertaintyVisible: boolean;
}

export interface DecisionSupport {
  readonly outcome: "support";
  readonly voice: VoiceMode;
  readonly intent: SupportIntent;
  readonly preservesAgency: true;
  readonly uncertaintyVisible: boolean;
  readonly trace: TraceabilityVerificationResult;
  readonly reasons: readonly string[];
}

export interface Inquiry {
  readonly outcome: "inquiry";
  readonly question: string;
  readonly whatNeeded: string;
  readonly reasons: readonly string[];
}

export interface Withholding {
  readonly outcome: "withholding";
  readonly reason: string;
}

export type TerminalOutput = DecisionSupport | Inquiry | Withholding;

export function decisionSupport(input: {
  readonly voice: VoiceMode;
  readonly intent: SupportIntent;
  readonly uncertaintyVisible: boolean;
  readonly trace: TraceabilityVerificationResult;
  readonly reasons: readonly string[];
}): DecisionSupport {
  if (input.voice === "Silence") {
    throw new Error("Silence is realized as Withholding, not DecisionSupport");
  }
  return Object.freeze({
    outcome: "support",
    voice: input.voice,
    intent: input.intent,
    preservesAgency: true,
    uncertaintyVisible: input.uncertaintyVisible,
    trace: input.trace,
    reasons: Object.freeze([...input.reasons]),
  });
}

export function inquiry(
  question: string,
  whatNeeded: string,
  reasons: readonly string[] = [],
): Inquiry {
  if (typeof question !== "string" || question.length === 0) {
    throw new Error("Inquiry requires a question");
  }
  return Object.freeze({
    outcome: "inquiry",
    question,
    whatNeeded,
    reasons: Object.freeze([...reasons]),
  });
}

export function withholding(reason: string): Withholding {
  if (typeof reason !== "string" || reason.length === 0) {
    throw new Error("Withholding requires an auditable reason");
  }
  return Object.freeze({ outcome: "withholding", reason });
}
