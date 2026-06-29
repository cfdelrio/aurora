// application-orchestration application: public surface. The one explicit composition function + its closed
// command / dependencies / result / trace types. No domain model, no repository, no persistence of its own.

export { orchestrateRenderDeliver } from "./orchestrate-render-deliver.ts";

export type {
  ExplicitOrchestrationCommand,
  OrchestrationTiming,
  OrchestrationIds,
  OrchestrationReviewInput,
  OrchestrationDeliveryInput,
} from "./orchestration-command.ts";
export type { ExplicitOrchestrationDependencies } from "./orchestration-dependencies.ts";
export { ORCHESTRATION_OUTCOME_KINDS } from "./orchestration-result.ts";
export type { OrchestrationOutcome, OrchestrationOutcomeKind } from "./orchestration-result.ts";
export { ORCHESTRATION_STAGES } from "./orchestration-trace.ts";
export type { OrchestrationStage, OrchestrationTrace } from "./orchestration-trace.ts";

// Operator-mediated offline reflection runtime (Impl 032R-A) — a pure composition function that wires
// faithful manual intake (INJECTED, generic — this module imports no observation) + render-only
// orchestration into a safe, inference-marked, athlete-facing reflection; delivery withheld; no
// AthleteDecision created. No script, no live provider, no real secret, no process-env, no auth/DB/UI/API.
export { offlineReflectionRuntime, OFFLINE_REFLECTION_STATUSES } from "./offline-reflection-runtime.ts";
export type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
  OfflineReflectionRuntimeOutcome,
  OfflineReflectionStatus,
  OperatorMediationMarker,
  ManualIntakeStep,
  ManualReflectionIntakeOutcome,
  SafeReflectionProjection,
  DecisionCapturePrompt,
} from "./offline-reflection-runtime.ts";

// External renderable admission check (Impl 035-A) — the Tier 2 structural pre-screen for caller-supplied
// renderables (Spec 035). Pure, synchronous; inspects only RenderingRequest/RenderableDomainOutput structure;
// admits or fails closed with a safe reason code. Not wired into offlineReflectionRuntime yet (035-B).
// admitted ≠ truth ≠ evidence-backed fact ≠ recommendation quality; admission check ≠ validateDraft.
export { admitExternalRenderable, EXTERNAL_RENDERABLE_ADMISSION_STATUSES } from "./external-renderable-admission.ts";
export type {
  ExternalRenderableAdmission,
  ExternalRenderableAdmissionStatus,
  ExternalRenderableRejectionReason,
} from "./external-renderable-admission.ts";
