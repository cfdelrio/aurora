// decision-support domain: VoiceSelectionPolicy.
//
// Deterministic, auditable, table-driven. Chooses the MAXIMUM RESPONSIBLE voice -- never the most
// persuasive. Claim confidence is NOT an input. Risk can only raise toward a cautionary Warning.
// Recommendation requires SafeVoiceCeiling=confident + complete traceability + all gates pass.

import type { UnderstandingAssessment } from "../../understanding/index.ts";
import type { GateResult } from "./gate-result.ts";
import { degradationReason } from "./gate-result.ts";
import type { DegradationReason } from "./gate-result.ts";
import type { VoiceMode } from "./voice-mode.ts";
import { lowerInCeilingLadder, maxVoiceForCeiling } from "./voice-mode.ts";
import type { PurposeContext } from "./purpose-alignment.ts";
import type { RiskAssessment } from "./risk-assessment.ts";
import type { CandidateSupport, SupportIntent, TerminalOutput } from "./terminal-output.ts";
import { decisionSupport, inquiry, withholding } from "./terminal-output.ts";
import type { TraceabilityVerificationResult } from "./traceability.ts";
import { agencyGate, evidenceGate, purposeGate, riskGate, understandingGate } from "./gates.ts";

export interface VoiceSelectionInputs {
  readonly assessment: UnderstandingAssessment;
  readonly purpose: PurposeContext;
  readonly risk: RiskAssessment;
  readonly candidate: CandidateSupport;
  readonly trace: TraceabilityVerificationResult;
  readonly claimState: string;
}

export interface VoiceSelectionResult {
  readonly output: TerminalOutput;
  readonly gateResults: readonly GateResult[];
  readonly degradations: readonly DegradationReason[];
}

function intentForVoice(voice: VoiceMode): SupportIntent {
  switch (voice) {
    case "Reflection":
      return "reflect";
    case "Framing":
      return "frame";
    case "Warning":
      return "warn";
    case "Recommendation":
      return "recommend";
    case "Silence":
      throw new Error("Silence has no support intent (it is realized as Withholding)");
  }
}

export function selectTerminalOutput(inputs: VoiceSelectionInputs): VoiceSelectionResult {
  const degradations: DegradationReason[] = [];

  const ceilingMax = maxVoiceForCeiling(inputs.assessment.safeVoiceCeiling);
  const eg = evidenceGate({ claimState: inputs.claimState });
  const ug = understandingGate(inputs.assessment, ceilingMax);
  const pg = purposeGate(inputs.purpose);
  const rg = riskGate(inputs.risk);
  const ag = agencyGate(inputs.candidate);
  const gateResults: readonly GateResult[] = Object.freeze([eg, ug, pg, rg, ag]);
  const trace = inputs.trace;

  const done = (output: TerminalOutput): VoiceSelectionResult =>
    Object.freeze({ output, gateResults, degradations: Object.freeze([...degradations]) });

  // Hard stops -> non-support outputs.
  if (ag.verdict === "fail") {
    return done(withholding(`agency could not be preserved: ${ag.reason}`));
  }
  if (pg.verdict === "needs-inquiry") {
    return done(inquiry("What are you training for right now?", "a declared purpose", [pg.reason]));
  }
  if (eg.verdict === "needs-inquiry") {
    return done(inquiry("Can you tell me more about this session?", "context for an unsettled claim", [eg.reason]));
  }
  if (eg.verdict === "fail") {
    return done(withholding(`no usable claim to support: ${eg.reason}`));
  }
  if (trace.status === "missing" || trace.status === "invalid") {
    return done(withholding(`traceability ${trace.status}: ${trace.reason}`));
  }

  // Start from the ceiling-permitted maximum (never Warning).
  let voice: VoiceMode = ceilingMax;

  // Weakened claim lowers one step.
  if (eg.verdict === "limit") {
    const lo = lowerInCeilingLadder(voice);
    if (lo !== voice) {
      degradations.push(degradationReason(voice, lo, eg.reason, "EvidenceGate"));
      voice = lo;
    }
  }

  // Recommendation requires complete traceability.
  if (voice === "Recommendation" && trace.status !== "complete") {
    degradations.push(degradationReason("Recommendation", "Framing", `traceability ${trace.status}`, "TraceabilityVerification"));
    voice = "Framing";
  }

  // Risk caution path: raise to Warning (toward caution); never to Recommendation.
  if (rg.verdict === "caution-warning") {
    if (voice === "Recommendation") {
      degradations.push(degradationReason("Recommendation", "Warning", rg.reason, "RiskGate"));
    }
    voice = "Warning";
  }

  // Final Recommendation guard: confident ceiling + complete trace + all gates pass.
  if (voice === "Recommendation") {
    const allPass =
      eg.verdict === "pass" &&
      ug.verdict === "pass" &&
      pg.verdict === "pass" &&
      rg.verdict === "pass" &&
      ag.verdict === "pass";
    const ok =
      inputs.assessment.safeVoiceCeiling === "confident" && trace.status === "complete" && allPass;
    if (!ok) {
      degradations.push(degradationReason("Recommendation", "Framing", "recommendation preconditions unmet", "VoiceSelectionPolicy"));
      voice = "Framing";
    }
  }

  if (voice === "Silence") {
    return done(withholding("ceiling permits no responsible assertion"));
  }

  const reasons = gateResults.map((g) => `${g.gate}:${g.verdict}`);
  return done(
    decisionSupport({
      voice,
      intent: intentForVoice(voice),
      uncertaintyVisible: inputs.candidate.uncertaintyVisible,
      trace,
      reasons,
    }),
  );
}
