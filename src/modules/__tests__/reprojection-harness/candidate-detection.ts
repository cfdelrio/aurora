// Implementation 012 — candidate detection: a PURE map from occurrence history to targets to check.
// Event records IDENTIFY candidates and provide context; they NEVER execute, replay, rebuild an
// aggregate, mutate a repository, create a projection, or change Purpose/SupportQuality.

import type { DomainEventRecord, DomainEventType, EventPayloadRef } from "../../event-recording/index.ts";
import type { StalenessReason } from "../../understanding/index.ts";
import type { ReprojectionTarget } from "./reprojection.ts";

/** Event type → the freshness-limiting reason it implies for a derived view (if any). */
const EVENT_TRIGGER: Partial<Record<DomainEventType, StalenessReason>> = {
  PurposeChanged: "purpose-change",
  PurposeDeclared: "purpose-change",
  ObservationSuperseded: "observation-superseded",
  SignalRejected: "source-quality-changed",
  UnderstandingMarkedStale: "context-changed",
  ProjectionFreshnessChanged: "context-changed",
};

/** Event types that mean understanding MIGHT move — but only via the existing policy transition. */
const POLICY_TRANSITION_EVENTS: ReadonlySet<DomainEventType> = new Set<DomainEventType>([
  "EvidenceAttached",
  "HypothesisRevised",
  "HypothesisWeakened",
  "HypothesisContradicted",
  "HypothesisFalsified",
  "HypothesisRetired",
  "UnderstandingUpdated",
]);

export function eventTrigger(type: DomainEventType): StalenessReason | undefined {
  return EVENT_TRIGGER[type];
}

export function impliesPolicyTransition(type: DomainEventType): boolean {
  return POLICY_TRANSITION_EVENTS.has(type);
}

/** Every artifact id an event references (primary + sources + typed slots + payload + causation + freshness). */
export function eventRefIds(event: DomainEventRecord): readonly string[] {
  const ids: string[] = [event.traceability.primaryArtifactRef.id];
  for (const r of event.traceability.sourceRefs) ids.push(r.id);
  for (const r of [
    event.traceability.purposeVersionRef,
    event.traceability.hypothesisRef,
    event.traceability.observationSetRef,
    event.traceability.decisionSupportCaseRef,
    event.traceability.athleteDecisionRef,
  ]) {
    if (r !== undefined) ids.push(r.id);
  }
  if (event.traceability.projectionFreshness !== undefined) ids.push(event.traceability.projectionFreshness.ref.id);
  for (const p of event.payloadRefs) ids.push(p.id);
  if (event.causation?.causedByRef !== undefined) ids.push(event.causation.causedByRef.id);
  return ids;
}

function key(target: ReprojectionTarget): string {
  return `${target.kind}::${target.primaryRef.id}::${target.dimensionKey ?? ""}`;
}

/**
 * From occurrence history + the explicitly-known targets, return the de-duplicated set of targets
 * worth checking. A target is a candidate when an event references its primary artifact, or when an
 * event carries a freshness-limiting / policy-transition trigger relevant to a known target. This is
 * a PURE selection — it executes nothing and synthesizes no aggregate.
 */
export function detectCandidates(
  events: readonly DomainEventRecord[],
  known: readonly ReprojectionTarget[],
): readonly ReprojectionTarget[] {
  const out = new Map<string, ReprojectionTarget>();
  for (const t of known) out.set(key(t), t); // requested targets are always candidates

  // surface any known target an event references or triggers
  for (const t of known) {
    for (const e of events) {
      const ids = eventRefIds(e);
      const refsTarget = ids.includes(t.primaryRef.id);
      const carriesTrigger = eventTrigger(e.type) !== undefined || impliesPolicyTransition(e.type);
      if (refsTarget || carriesTrigger) out.set(key(t), t);
    }
  }
  return Object.freeze([...out.values()]);
}
