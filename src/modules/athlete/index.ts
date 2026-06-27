// athlete module — PUBLIC SURFACE (Purpose-first slice).
// Aurora's upstream context of meaning. Owns the athlete's declared, versioned, append-only
// Purpose and nothing inferred. It imports only shared-kernel; it never imports observation,
// reasoning, understanding, or decision-support. Other modules consume purpose references or a
// purpose snapshot via the application/harness layer -- Athlete never reaches downstream.

export * from "./domain/index.ts";
export { declarePurpose, changePurpose } from "./application/purpose-coordinator.ts";
export type { DeclarePurposeInput, ChangePurposeInput } from "./application/purpose-coordinator.ts";
export { recordAthleteDecision, amendAthleteDecision } from "./application/decision-coordinator.ts";
export type { RecordDecisionInput, AmendDecisionInput } from "./application/decision-coordinator.ts";
