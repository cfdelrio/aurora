// reasoning domain — PUBLIC SURFACE.
// Exports hypothesis/evidence/lifecycle operations and types only.
// No understanding, decision, recommendation, voice, warning, or athlete-decision symbol.
// NOTE: `createEvidenceCase` is deliberately NOT exported — an EvidenceCase can only be created
// via Hypothesis.attachEvidence, so it cannot exist outside a Hypothesis.

export { hypothesisClaim, hypothesisScope } from "./hypothesis-claim.ts";
export type { HypothesisClaim, HypothesisScope, ClaimSubjectKind } from "./hypothesis-claim.ts";

export { falsifier } from "./falsifier.ts";
export type { Falsifier, FalsifierStatus } from "./falsifier.ts";

export { claimConfidence, CONFIDENCE_ORDER } from "./claim-confidence.ts";
export type { ClaimConfidence, ConfidenceLevel } from "./claim-confidence.ts";

export type { EvidenceDirection } from "./evidence-direction.ts";
export type { EvidenceCase, TraceToSignal } from "./evidence-case.ts";

export {
  canTransition,
  isActiveSupport,
  receivesEvidence,
} from "./hypothesis-lifecycle.ts";
export type { HypothesisLifecycleState, HypothesisRevision } from "./hypothesis-lifecycle.ts";

export { Hypothesis } from "./hypothesis.ts";
export type { OpenHypothesisInput, AttachEvidenceInput } from "./hypothesis.ts";

export type { HypothesisId, EvidenceCaseId } from "./ids.ts";
