// event-recording domain: the CLOSED catalog of domain event/outcome types. No arbitrary strings.
// The catalog is metadata only (no functions, no effects); it lets a record validate its own
// producing module, category, required primary-artifact kind, and minimum required refs.

import type { DomainEventCategory } from "./domain-event-category.ts";
import type { ProducingModule } from "./producing-module.ts";
import type { EventArtifactKind } from "./event-payload-ref.ts";

export type DomainEventType =
  // observation
  | "ObservationSetRecorded"
  | "ObservationSuperseded"
  | "SignalDetected"
  | "SignalRejected"
  // reasoning
  | "HypothesisOpened"
  | "EvidenceAttached"
  | "HypothesisRevised"
  | "HypothesisWeakened"
  | "HypothesisContradicted"
  | "HypothesisFalsified"
  | "HypothesisRetired"
  // understanding
  | "UnderstandingUpdated"
  | "UnderstandingMarkedStale"
  | "UnderstandingAssessmentProjected"
  | "ProjectionFreshnessChanged"
  // decision-support
  | "DecisionOpportunityOpened"
  | "DecisionSupportCaseOpened"
  | "DecisionSupportEvaluated"
  | "TerminalOutputSelected"
  | "DecisionSupportWithheld"
  | "AthleteDecisionRefRecorded"
  // athlete
  | "PurposeDeclared"
  | "PurposeChanged"
  | "AthleteDecisionRecorded"
  | "AthleteDecisionAmended"
  | "AthleteDecisionSuperseded"
  // rendering (output-out: provider / rendering / review / display) — Impl 024
  | "ProviderAttemptRecorded"
  | "ProviderDraftValidationFailed"
  | "ProviderDraftValidationPassed"
  | "RenderedMessageRecorded"
  | "RenderReviewRecorded"
  | "DisplayEligibilityDerived"
  // delivery (output-out: exposure) — Impl 024
  | "DeliveryRequestRecorded"
  | "DeliveryOutcomeRecorded";

export interface DomainEventCatalogEntry {
  readonly module: ProducingModule;
  readonly category: DomainEventCategory;
  /** the required kind of the envelope's primary artifact ref */
  readonly primaryKind: EventArtifactKind;
  /** ref kinds that MUST appear (in payload refs, source refs, or typed envelope slots) beyond the primary */
  readonly requiredRefKinds: readonly EventArtifactKind[];
  /** the record must carry a projection-freshness marker */
  readonly requiresFreshness?: boolean;
  /** the primary artifact ref's `role` must be one of these (e.g. terminal-output kind) */
  readonly requiredPrimaryRole?: readonly string[];
  /** the record must carry an actor of this kind */
  readonly requiredActorKind?: "athlete";
  readonly notes?: string;
}

// The closed catalog. Adding an event type is a deliberate edit here (+ a test).
export const DOMAIN_EVENT_CATALOG: Readonly<Record<DomainEventType, DomainEventCatalogEntry>> = Object.freeze({
  // observation -----------------------------------------------------------------------------------
  ObservationSetRecorded: { module: "observation", category: "occurrence", primaryKind: "ObservationSet", requiredRefKinds: [], notes: "provenance is born here; downstream trace starts here" },
  ObservationSuperseded: { module: "observation", category: "outcome", primaryKind: "ObservationSet", requiredRefKinds: ["ObservationSet"], notes: "original retained; refresh trigger" },
  SignalDetected: { module: "observation", category: "occurrence", primaryKind: "Signal", requiredRefKinds: ["ObservationSet", "Observation"], notes: "a signal exists, not yet evidence" },
  SignalRejected: { module: "observation", category: "outcome", primaryKind: "SignalRejection", requiredRefKinds: ["Observation"], notes: "auditable rejection, not an absence" },
  // reasoning -------------------------------------------------------------------------------------
  HypothesisOpened: { module: "reasoning", category: "occurrence", primaryKind: "Hypothesis", requiredRefKinds: ["PurposeVersion"], notes: "a raw, untested claim" },
  EvidenceAttached: { module: "reasoning", category: "occurrence", primaryKind: "Hypothesis", requiredRefKinds: ["EvidenceCase", "Signal"], notes: "mid-lifecycle attachment" },
  HypothesisRevised: { module: "reasoning", category: "outcome", primaryKind: "Hypothesis", requiredRefKinds: ["EvidenceCase"], notes: "revision recorded with cause" },
  HypothesisWeakened: { module: "reasoning", category: "outcome", primaryKind: "Hypothesis", requiredRefKinds: ["EvidenceCase"] },
  HypothesisContradicted: { module: "reasoning", category: "outcome", primaryKind: "Hypothesis", requiredRefKinds: ["EvidenceCase"] },
  HypothesisFalsified: { module: "reasoning", category: "outcome", primaryKind: "Hypothesis", requiredRefKinds: ["EvidenceCase"], notes: "falsified != deleted" },
  HypothesisRetired: { module: "reasoning", category: "outcome", primaryKind: "Hypothesis", requiredRefKinds: [], notes: "retired, retained for trace" },
  // understanding ---------------------------------------------------------------------------------
  UnderstandingUpdated: { module: "understanding", category: "outcome", primaryKind: "UnderstandingProfile", requiredRefKinds: ["UnderstandingDimension"], notes: "from a tested outcome only" },
  UnderstandingMarkedStale: { module: "understanding", category: "outcome", primaryKind: "UnderstandingProfile", requiredRefKinds: ["UnderstandingDimension"], notes: "selective staleness; reason carried; mutates nothing" },
  UnderstandingAssessmentProjected: { module: "understanding", category: "occurrence", primaryKind: "UnderstandingAssessment", requiredRefKinds: [], requiresFreshness: true, notes: "a freshness-bound view was produced" },
  ProjectionFreshnessChanged: { module: "understanding", category: "outcome", primaryKind: "UnderstandingAssessment", requiredRefKinds: [], requiresFreshness: true, notes: "carries freshness; cannot assert current" },
  // decision-support ------------------------------------------------------------------------------
  DecisionOpportunityOpened: { module: "decision-support", category: "occurrence", primaryKind: "DecisionOpportunity", requiredRefKinds: [], notes: "a candidate moment" },
  DecisionSupportCaseOpened: { module: "decision-support", category: "occurrence", primaryKind: "DecisionSupportCase", requiredRefKinds: ["DecisionOpportunity"] },
  DecisionSupportEvaluated: { module: "decision-support", category: "outcome", primaryKind: "DecisionSupportCase", requiredRefKinds: [], notes: "gates ran (internal-leaning)" },
  TerminalOutputSelected: { module: "decision-support", category: "outcome", primaryKind: "DecisionSupportCase", requiredRefKinds: [], requiredPrimaryRole: ["support", "inquiry", "withholding"], notes: "what Aurora showed; never an AthleteDecision" },
  DecisionSupportWithheld: { module: "decision-support", category: "outcome", primaryKind: "DecisionSupportCase", requiredRefKinds: [], notes: "responsible silence, auditable" },
  AthleteDecisionRefRecorded: { module: "decision-support", category: "occurrence", primaryKind: "DecisionSupportCase", requiredRefKinds: ["AthleteDecision"], notes: "case references, never owns, the decision" },
  // athlete ---------------------------------------------------------------------------------------
  PurposeDeclared: { module: "athlete", category: "outcome", primaryKind: "Athlete", requiredRefKinds: ["PurposeVersion"], notes: "append-only version born" },
  PurposeChanged: { module: "athlete", category: "outcome", primaryKind: "Athlete", requiredRefKinds: ["PurposeVersion"], notes: "append-only; refresh trigger; never inferred identity" },
  AthleteDecisionRecorded: { module: "athlete", category: "outcome", primaryKind: "AthleteDecision", requiredRefKinds: [], requiredActorKind: "athlete", notes: "athlete-owned; no obedience/outcome-correctness" },
  AthleteDecisionAmended: { module: "athlete", category: "outcome", primaryKind: "AthleteDecision", requiredRefKinds: ["AthleteDecision"], notes: "append-only correction; original retained" },
  AthleteDecisionSuperseded: { module: "athlete", category: "outcome", primaryKind: "AthleteDecision", requiredRefKinds: ["AthleteDecision"], notes: "append-only; original retained" },
  // rendering (output-out) — Impl 024. Provider events are produced by `rendering` (provider lives inside it);
  // the id'd primary is the raw-free ProviderAttemptRecord, composed AFTER the rendering provider-attempt audit. Ref-only; inert.
  ProviderAttemptRecorded: { module: "rendering", category: "occurrence", primaryKind: "ProviderAttemptRecord", requiredRefKinds: [], notes: "a provider attempt happened; no raw draft/prompt/payload/secret" },
  ProviderDraftValidationFailed: { module: "rendering", category: "outcome", primaryKind: "ProviderAttemptRecord", requiredRefKinds: [], notes: "draft refused by validateDraft; no rendered-message record; not a domain failure" },
  ProviderDraftValidationPassed: { module: "rendering", category: "outcome", primaryKind: "ProviderAttemptRecord", requiredRefKinds: [], notes: "draft validated; not evidence, not recommendation quality" },
  RenderedMessageRecorded: { module: "rendering", category: "occurrence", primaryKind: "RenderedMessageRecord", requiredRefKinds: [], notes: "validated presentation artifact persisted; no raw unvalidated draft" },
  RenderReviewRecorded: { module: "rendering", category: "outcome", primaryKind: "RenderReview", requiredRefKinds: ["RenderedMessageRecord"], notes: "display-safety review; decision/reason via role; triggers no display/delivery" },
  DisplayEligibilityDerived: { module: "rendering", category: "occurrence", primaryKind: "RenderedMessageRecord", requiredRefKinds: [], notes: "eligibility is a derived value (no id) — carried as the primary ref's role; triggers no delivery" },
  // delivery (output-out: exposure) — Impl 024. Exposure audit; never evidence, never an athlete decision.
  DeliveryRequestRecorded: { module: "delivery", category: "occurrence", primaryKind: "DeliveryRequest", requiredRefKinds: ["RenderedMessageRecord"], notes: "a delivery was requested for a display-eligible record" },
  DeliveryOutcomeRecorded: { module: "delivery", category: "outcome", primaryKind: "DeliveryRecord", requiredRefKinds: ["DeliveryRequest"], notes: "exposure outcome; no auto-retry; implies no athlete reception/decision" },
});

export function isDomainEventType(value: unknown): value is DomainEventType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DOMAIN_EVENT_CATALOG, value);
}

export function catalogEntry(type: DomainEventType): DomainEventCatalogEntry {
  return DOMAIN_EVENT_CATALOG[type];
}
