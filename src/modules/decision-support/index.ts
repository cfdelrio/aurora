// decision-support module — PUBLIC SURFACE.
// Turns reasoning + understanding into the maximum responsible athlete-facing output -- or Inquiry,
// or Withholding -- gated by evidence, traceability, understanding, purpose, risk, and agency.
// It consumes reasoning/understanding (read-only); upstream modules never import it. It owns the
// integrity of support, never the athlete's decision.

export * from "./domain/index.ts";
export { verifyTraceability, claimStateOf } from "./application/traceability-adapter.ts";
export {
  openDecisionSupportCase,
  evaluateDecisionSupportCase,
  recordAthleteDecisionRef,
} from "./application/decision-support-coordinator.ts";
export type {
  EvaluateInput,
  RecordAthleteDecisionInput,
} from "./application/decision-support-coordinator.ts";
export type { DecisionSupportCaseRepository } from "./application/decision-support-case-repository.ts";
export { InMemoryDecisionSupportCaseRepository } from "./application/in-memory-decision-support-case-repository.ts";
