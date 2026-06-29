// application-orchestration application: offlineReflectionRuntime (Implementation 032R-A) — the first
// operator-mediated, offline/manual, athlete-facing reflection runtime. It composes the two PROVEN ends —
// faithful manual intake and validated render-only rendering — into a safe, inference-marked, athlete-facing
// reflection, with delivery WITHHELD and NO athlete decision created. It is a PURE application function over
// INJECTED collaborators: no executable script, no package command, no live provider, no real secret, no
// process-environment read, no auth/DB/UI/API, no deployment.
//
// BLOCKER + RESOLUTION (vs Tech Spec 032RA Decision 1/§11): the Impl 025 negative-capability guard forbids
// application-orchestration from importing any upstream domain module (observation/reasoning/understanding/
// athlete). Importing observation.ingestManualInput here would break that guard. Resolution: the manual
// intake step is INJECTED (deps.runManualIntake) and the command is GENERIC over the submission type, so this
// production file imports NO observation module. The caller (tests / future tooling) wires the real
// ingestManualInput into runManualIntake. This honors 032RA's intent (compose real manual intake + render-only
// orchestration over injected collaborators) without weakening any guard.
//
// SCOPED GAP (Tech Spec 032RA §2.3): there is no application service composing ObservationSet → reasoning →
// understanding → decision-support → RenderableDomainOutput. This slice does NOT invent it: the authoritative
// RenderingRequest (the reflection renderable) is supplied in the command; bridging it is a later slice.
//
// operator-mediated runtime ≠ operator smoke
// operator mediation ≠ athlete decision
// runtime output ≠ delivery success ≠ athlete decision
// validated draft ≠ recommendation quality
// provider output ≠ truth; reflection ≠ prescription
// AthleteDecision must be athlete-declared or athlete-reported — never created here.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type {
  RenderingRequest,
  RenderableKind,
  RenderedMessageRecordId,
  RenderedMessageRecordRepository,
  ProviderClientBoundary,
  ProviderClientConfig,
  ProviderSecretRef,
} from "../../rendering/index.ts";
import { newRenderedMessageRecordId } from "../../rendering/index.ts";
import { orchestrateRenderDeliver } from "./orchestrate-render-deliver.ts";
import type {
  ExplicitOrchestrationCommand,
  OrchestrationTiming,
  OrchestrationIds,
} from "./orchestration-command.ts";
import type { ExplicitOrchestrationDependencies } from "./orchestration-dependencies.ts";
import type { OrchestrationTrace } from "./orchestration-trace.ts";
import { admitExternalRenderable } from "./external-renderable-admission.ts";
import type { ExternalRenderableRejectionReason } from "./external-renderable-admission.ts";

/**
 * Operational marker that an operator invoked the runtime on the athlete's behalf. It is NOT a decision and
 * never produces one. Operator mediation ≠ athlete decision.
 */
export interface OperatorMediationMarker {
  readonly operatorRef: string;
  readonly mediatedAt: Timestamp;
}

/**
 * Safe, minimal outcome of the INJECTED manual-intake step (the caller adapts observation.ingestManualInput
 * to this shape). Carries only a safe id or closed reason codes — never raw observation content.
 */
export type ManualReflectionIntakeOutcome =
  | { readonly status: "accepted" | "partially-accepted"; readonly observationSetId: string }
  | { readonly status: "rejected"; readonly reasons: readonly string[] };

/** The injected manual-intake step. Generic over the submission so this module imports no observation type. */
export type ManualIntakeStep<TSubmission> = (submission: TSubmission) => ManualReflectionIntakeOutcome;

/** Closed status catalog (Tech Spec 032RA §6). delivered/delivery-failed/review-rejected/display-ineligible/
 *  partial-success are unreachable here (delivery, review and events are never selected). */
export type OfflineReflectionStatus =
  | "reflection-ready" // intake ok + render-only "rendered" → validated reflection; delivery withheld
  | "input-rejected" // injected intake returned "rejected" → fail-closed, no render
  | "renderable-inadmissible" // Tier 2 admission check rejected the renderable → fail-closed, no render (035-B)
  | "not-rendered" // orchestration "provider-not-rendered" (incl. validateDraft failure) → no record
  | "recording-failed" // orchestration "recording-failed" → safe stop
  | "unexpected-failure"; // any unexpected error → safe result, no raw content

export const OFFLINE_REFLECTION_STATUSES: readonly OfflineReflectionStatus[] = [
  "reflection-ready",
  "input-rejected",
  "renderable-inadmissible",
  "not-rendered",
  "recording-failed",
  "unexpected-failure",
];

/**
 * The safe athlete-facing reflection projected from the saved RenderedMessageRecord. It is the VALIDATED,
 * display-eligible product phrasing — never raw provider output, never hidden reasoning. `presentedAs` is
 * always "reflection": Aurora advises, it never asserts inference as fact.
 */
export interface SafeReflectionProjection {
  readonly text: string;
  readonly kind: RenderableKind;
  readonly voice?: string;
  readonly presentedAs: "reflection";
  readonly uncertaintyPreserved: boolean;
  readonly limitationsPreserved: boolean;
  readonly traceabilityPreserved: boolean;
  readonly validationPassed: true;
}

/** A safe prompt/ref INVITING a future athlete-declared/athlete-reported decision. It creates no decision. */
export interface DecisionCapturePrompt {
  readonly kind: "athlete-decision-invitation";
  readonly athleteRef: string;
  readonly acceptableSources: readonly ["athlete-declared", "athlete-reported"];
}

export interface OfflineReflectionRuntimeCommand<TSubmission> {
  /** the athlete's faithful manual training input (generic; passed to the injected intake step) */
  readonly submission: TSubmission;
  /** safe, non-sensitive subject ref — used only to address the decision-capture invitation */
  readonly athleteRef: string;
  /** authoritative reflection renderable (injected; the observation→renderable bridge is deferred, §2.3) */
  readonly request: RenderingRequest;
  /** operational marker that an operator invoked this on the athlete's behalf — NOT a decision */
  readonly operatorMediation: OperatorMediationMarker;
  /** injected timestamps — no Date.now() inside the runtime */
  readonly timing: OrchestrationTiming;
  /** optional deterministic ids; renderedMessageRecordId is derived if omitted */
  readonly ids?: OrchestrationIds;
}

export interface OfflineReflectionRuntimeDependencies<TSubmission> {
  /** INJECTED manual intake (caller wires observation.ingestManualInput). Keeps this module observation-free. */
  readonly runManualIntake: ManualIntakeStep<TSubmission>;
  /** render-only orchestration collaborators (no delivery sink, no audit repo, no event repo) */
  readonly client: ProviderClientBoundary;
  readonly config: ProviderClientConfig;
  readonly secret: ProviderSecretRef;
  readonly rendererKind: string;
  readonly providerAdapterKind: string;
  readonly renderedMessageRecordRepository: RenderedMessageRecordRepository;
}

export interface OfflineReflectionRuntimeOutcome {
  readonly status: OfflineReflectionStatus;
  readonly reflection?: SafeReflectionProjection; // present only on reflection-ready
  readonly deliveryWithheld: true; // always — this runtime never delivers
  readonly mediation: { readonly operatorRef: string }; // operational; never decision ownership
  readonly decisionCapture: DecisionCapturePrompt; // invites a future athlete-declared/reported decision
  readonly intake: { readonly status: ManualReflectionIntakeOutcome["status"] }; // safe summary only
  readonly admissionReason?: ExternalRenderableRejectionReason; // safe closed code; present only on renderable-inadmissible
  readonly trace: OrchestrationTrace; // ref-only, from orchestration (empty-ish when intake rejects)
  readonly rawRetained: false;
}

function invitation(athleteRef: string): DecisionCapturePrompt {
  return Object.freeze({
    kind: "athlete-decision-invitation",
    athleteRef,
    acceptableSources: Object.freeze(["athlete-declared", "athlete-reported"] as const),
  });
}

/**
 * Compose faithful manual intake + validated render-only rendering into a safe athlete-facing reflection.
 * Always resolves to a safe, closed outcome; delivery is withheld; no AthleteDecision is created.
 */
export async function offlineReflectionRuntime<TSubmission>(
  command: OfflineReflectionRuntimeCommand<TSubmission>,
  deps: OfflineReflectionRuntimeDependencies<TSubmission>,
): Promise<OfflineReflectionRuntimeOutcome> {
  const base = {
    deliveryWithheld: true as const,
    mediation: Object.freeze({ operatorRef: command.operatorMediation.operatorRef }),
    decisionCapture: invitation(command.athleteRef),
    rawRetained: false as const,
  };
  const emptyTrace: OrchestrationTrace = Object.freeze({ stoppedAt: "stopped" });

  try {
    // 1. Faithful manual intake (INJECTED). Rejection → fail-closed; no render attempted.
    const intake = deps.runManualIntake(command.submission);
    if (intake.status === "rejected") {
      return Object.freeze({
        ...base,
        status: "input-rejected",
        intake: { status: intake.status },
        trace: emptyTrace,
      });
    }

    // 2. Tier 2 admission check (Spec 035 / Impl 035-A) — structurally pre-screen the caller-supplied
    //    renderable BEFORE any rendering. Rejection → fail-closed: no orchestration, no provider, no
    //    validateDraft, no delivery; delivery stays withheld. admitted ≠ truth (downstream validateDraft and
    //    the caller's Tier 1 guarantee remain the other tiers).
    const admission = admitExternalRenderable(command.request);
    if (!admission.admitted) {
      return Object.freeze({
        ...base,
        status: "renderable-inadmissible",
        intake: { status: intake.status },
        ...(admission.reason !== undefined ? { admissionReason: admission.reason } : {}),
        trace: emptyTrace,
      });
    }

    // 3. Render-only orchestration over deterministic injected collaborators. NO delivery input + NO sink,
    //    NO review, NO audit repo, NO event repo, NO recordEvents → partial composition stops at "rendered".
    const recordId: RenderedMessageRecordId = command.ids?.renderedMessageRecordId ?? newRenderedMessageRecordId();
    const orchestrationCommand: ExplicitOrchestrationCommand = {
      request: command.request,
      timing: command.timing,
      ids: { ...(command.ids ?? {}), renderedMessageRecordId: recordId },
    };
    const orchestrationDeps: ExplicitOrchestrationDependencies = {
      client: deps.client,
      config: deps.config,
      secret: deps.secret,
      rendererKind: deps.rendererKind,
      providerAdapterKind: deps.providerAdapterKind,
      renderedMessageRecordRepository: deps.renderedMessageRecordRepository,
    };
    const outcome = await orchestrateRenderDeliver(orchestrationCommand, orchestrationDeps);
    const intakeSummary: { readonly status: ManualReflectionIntakeOutcome["status"] } = { status: intake.status };

    // 3. Map the closed orchestration outcome to a safe runtime status. The provider/validation fast-paths are
    //    distinct fail-closed stops; otherwise the reflection is keyed off the RENDERED record itself. Note:
    //    with no review selected, a successful render stops at `display-ineligible` (display eligibility gates
    //    DELIVERY, which we withhold) — the record is still rendered + validated, so it is reflection-ready.
    if (outcome.kind === "provider-not-rendered") {
      return Object.freeze({ ...base, status: "not-rendered", intake: intakeSummary, trace: outcome.trace });
    }
    if (outcome.kind === "recording-failed") {
      return Object.freeze({ ...base, status: "recording-failed", intake: intakeSummary, trace: outcome.trace });
    }
    const record = deps.renderedMessageRecordRepository.findById(recordId);
    if (record === undefined || record.renderingStatus !== "rendered" || record.text === undefined) {
      return Object.freeze({ ...base, status: "unexpected-failure", intake: intakeSummary, trace: outcome.trace });
    }
    const reflection: SafeReflectionProjection = Object.freeze({
      text: record.text,
      kind: record.terminalOutputKind,
      ...(record.voice !== undefined ? { voice: record.voice } : {}),
      presentedAs: "reflection",
      uncertaintyPreserved: record.preserved?.uncertaintyPreserved ?? false,
      limitationsPreserved: record.preserved?.limitationsPreserved ?? false,
      traceabilityPreserved: record.preserved?.traceabilityPreserved ?? false,
      validationPassed: true,
    });
    return Object.freeze({ ...base, status: "reflection-ready", reflection, intake: intakeSummary, trace: outcome.trace });
  } catch {
    return Object.freeze({ ...base, status: "unexpected-failure", intake: { status: "rejected" as const }, trace: emptyTrace });
  }
}
