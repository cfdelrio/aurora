// decision-support domain: the gates, as pure functions. Each returns a GateResult.
// (TraceabilityVerification produces a TraceabilityVerificationResult and lives in the adapter,
//  because it walks reasoning links; the gate-style consumers read its status.)

import type { UnderstandingAssessment } from "../../understanding/index.ts";
import type { GateResult } from "./gate-result.ts";
import { gateResult } from "./gate-result.ts";
import type { VoiceMode } from "./voice-mode.ts";
import { ceilingLadderRank, maxVoiceForCeiling } from "./voice-mode.ts";
import type { PurposeContext } from "./purpose-alignment.ts";
import type { RiskAssessment } from "./risk-assessment.ts";
import type { CandidateSupport, ProhibitedIntentMarker } from "./terminal-output.ts";

const PROHIBITED_MARKERS: readonly ProhibitedIntentMarker[] = [
  "command",
  "shame",
  "certainty-claim",
  "hidden-uncertainty",
  "decision-ownership",
];

/** Is the reasoning claim suitable for support? Driven by hypothesis lifecycle state. */
export function evidenceGate(input: { readonly claimState: string }): GateResult {
  switch (input.claimState) {
    case "supported":
    case "promoted-to-working-knowledge":
      return gateResult("EvidenceGate", "pass", `claim state ${input.claimState}`);
    case "weakened":
      return gateResult("EvidenceGate", "limit", "claim weakened");
    case "contradicted":
    case "falsified":
    case "retired":
      return gateResult("EvidenceGate", "fail", `claim ${input.claimState}`);
    default:
      // proposed / active -> not settled
      return gateResult("EvidenceGate", "needs-inquiry", `claim not settled (${input.claimState})`);
  }
}

/** Does the UnderstandingAssessment permit the requested voice? Enforces the ceiling. */
export function understandingGate(
  assessment: UnderstandingAssessment,
  requestedVoice: VoiceMode,
): GateResult {
  if (requestedVoice === "Warning") {
    return gateResult("UnderstandingGate", "pass", "warning is reachable via the risk path");
  }
  const maxV = maxVoiceForCeiling(assessment.safeVoiceCeiling);
  if (ceilingLadderRank(requestedVoice) <= ceilingLadderRank(maxV)) {
    return gateResult("UnderstandingGate", "pass", `ceiling=${assessment.safeVoiceCeiling}`);
  }
  return gateResult(
    "UnderstandingGate",
    "fail",
    `voice ${requestedVoice} exceeds safe voice ceiling ${assessment.safeVoiceCeiling}`,
  );
}

export function purposeGate(purpose: PurposeContext): GateResult {
  switch (purpose.status) {
    case "declared":
      return gateResult("PurposeGate", "pass", "purpose declared");
    case "unknown":
      return gateResult("PurposeGate", "needs-inquiry", "purpose unknown");
    case "ambiguous":
      return gateResult("PurposeGate", "needs-inquiry", "purpose ambiguous");
  }
}

/** Risk may escalate toward a cautionary Warning only -- never toward Recommendation. */
export function riskGate(risk: RiskAssessment): GateResult {
  if (risk.level === "high" || risk.level === "critical") {
    return gateResult("RiskGate", "caution-warning", `risk ${risk.level}: ${risk.kinds.join(",")}`);
  }
  return gateResult("RiskGate", "pass", `risk ${risk.level}`);
}

/** Rejects command/shame/certainty/hidden-uncertainty/decision-ownership intent. */
export function agencyGate(candidate: CandidateSupport): GateResult {
  const bad = candidate.markers.filter((m) => PROHIBITED_MARKERS.includes(m));
  if (bad.length > 0) {
    return gateResult("AgencyGate", "fail", `prohibited intent: ${bad.join(", ")}`);
  }
  return gateResult("AgencyGate", "pass", "agency preserved");
}
