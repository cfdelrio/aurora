// Implementation 012 — recompute adapter for UnderstandingAssessment targets.
// Recomputation goes ONLY through the owning module's existing functions (produceUnderstandingAssessment
// + the Impl 008 freshness helpers). The harness coordinates, it does not reason: it never derives a
// level, never applies a transition, never updates the profile, never writes anything.

import { produceUnderstandingAssessment, applyFreshness } from "../../understanding/index.ts";
import { projectionFreshness, currentFreshness } from "../../understanding/index.ts";
import type {
  UnderstandingAssessment,
  UnderstandingProfileId,
  ProjectionFreshness,
  ProjectionFreshnessStatus,
  ProjectionSourceRef,
  StalenessReason,
} from "../../understanding/index.ts";
import type { DomainEventRecord } from "../../event-recording/index.ts";
import type {
  ReprojectionFinding,
  ReprojectionResult,
  ReprojectionTarget,
  SafeActionCategory,
  TraceabilityStatus,
  ExistingView,
  UnderstandingProfileReadAccess,
} from "./reprojection.ts";
import { eventRefIds, eventTrigger, impliesPolicyTransition } from "./candidate-detection.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";

const FRESHNESS_RANK: Readonly<Record<ProjectionFreshnessStatus, number>> = {
  current: 0,
  stale: 1,
  partial: 2,
  invalid: 3,
  unknown: 3,
};

/** Pick the MORE CAUTIOUS of two freshnesses (recompute may only equal or lower; never promote). */
function moreCautious(a: ProjectionFreshness, b: ProjectionFreshness): ProjectionFreshness {
  return FRESHNESS_RANK[b.status] > FRESHNESS_RANK[a.status] ? b : a;
}

/** A reason that removes/contradicts a depended-on source is invalidating; the rest are stale. */
function statusForReason(reason: StalenessReason): ProjectionFreshnessStatus {
  return reason === "observation-superseded" ||
    reason === "hypothesis-falsified" ||
    reason === "projection-source-unavailable"
    ? "invalid"
    : "stale";
}

interface EventFreshness {
  readonly freshness: ProjectionFreshness;
  readonly policyTransition: boolean;
  readonly supersededFound: boolean;
}

/** Derive freshness from the events relevant to this target/assessment (selective by source-ref intersection). */
function freshnessFromEvents(
  base: UnderstandingAssessment,
  target: ReprojectionTarget,
  events: readonly DomainEventRecord[],
): EventFreshness {
  const sourceIds = new Set((base.sourceRefs?.refs ?? []).map((r) => r.id));
  const reasons: StalenessReason[] = [];
  let worst: ProjectionFreshness = currentFreshness();
  let policyTransition = false;
  let supersededFound = false;

  for (const e of events) {
    const ids = eventRefIds(e);
    const refsTarget = ids.includes(target.primaryRef.id);
    const sharesSource = ids.some((id) => sourceIds.has(id));
    if (!refsTarget && !sharesSource) continue; // not relevant to this target

    if (impliesPolicyTransition(e.type)) policyTransition = true;
    const reason = eventTrigger(e.type);
    if (reason !== undefined) {
      reasons.push(reason);
      if (reason === "observation-superseded") supersededFound = true;
      worst = moreCautious(worst, projectionFreshness(statusForReason(reason), [reason]));
    }
  }

  // never promote: combine with the base view's own freshness, keeping the more cautious.
  const combined = moreCautious(base.freshness ?? currentFreshness(), worst);
  return { freshness: combined, policyTransition, supersededFound };
}

function statusFinding(status: ProjectionFreshnessStatus): ReprojectionFinding | undefined {
  switch (status) {
    case "current":
      return undefined;
    case "stale":
      return "stale";
    case "partial":
      return "partial";
    case "invalid":
    case "unknown":
      return "invalid";
  }
}

function traceabilityOf(base: UnderstandingAssessment): { status: TraceabilityStatus; refs: readonly ProjectionSourceRef[] } {
  const refs = base.sourceRefs?.refs ?? [];
  if (refs.length > 0) return { status: "verified", refs };
  // no source refs: incomplete if there is still a reasoning trace, missing otherwise.
  return { status: base.trace.length > 0 ? "incomplete" : "missing", refs };
}

function diff(existing: UnderstandingAssessment, recomputed: UnderstandingAssessment): readonly string[] {
  const out: string[] = [];
  if (existing.level !== recomputed.level) out.push(`level ${existing.level} -> ${recomputed.level}`);
  if (existing.safeVoiceCeiling !== recomputed.safeVoiceCeiling)
    out.push(`safeVoiceCeiling ${existing.safeVoiceCeiling} -> ${recomputed.safeVoiceCeiling}`);
  const ef = existing.freshness?.status ?? "current";
  const rf = recomputed.freshness?.status ?? "current";
  if (ef !== rf) out.push(`freshness ${ef} -> ${rf}`);
  return Object.freeze(out);
}

function safeActionFor(findings: readonly ReprojectionFinding[]): SafeActionCategory {
  if (findings.includes("requires-policy-transition")) return "requires-policy-transition";
  if (
    findings.some((f) =>
      (["stale", "partial", "invalid", "missing-traceability", "source-superseded"] as ReprojectionFinding[]).includes(f),
    )
  )
    return "constrain-voice";
  if (findings.some((f) => (["changed", "manual-review-required", "missing-source", "event-record-only"] as ReprojectionFinding[]).includes(f)))
    return "manual-review";
  return "none";
}

function freeze(result: ReprojectionResult): ReprojectionResult {
  return Object.freeze(result);
}

export function reprojectUnderstandingAssessment(
  target: ReprojectionTarget,
  profiles: UnderstandingProfileReadAccess | undefined,
  events: readonly DomainEventRecord[],
  existingViews: readonly ExistingView[],
  at: Timestamp | undefined,
): ReprojectionResult {
  const findings: ReprojectionFinding[] = [];
  const limitations: string[] = [];

  const profile = profiles?.findById(target.primaryRef.id as unknown as UnderstandingProfileId);
  if (profile === undefined) {
    // event-record-only when an event references it but no aggregate state is available; else missing-source.
    const fromEvent = events.some((e) => eventRefIds(e).includes(target.primaryRef.id));
    findings.push(fromEvent ? "event-record-only" : "missing-source");
    limitations.push("source aggregate not available; NOT synthesized from events");
    return freeze({
      target,
      sourceRefs: Object.freeze([]),
      traceability: "missing",
      findings: Object.freeze(findings),
      limitations: Object.freeze(limitations),
      safeAction: safeActionFor(findings),
    });
  }

  if (target.dimensionKey === undefined) {
    findings.push("missing-source");
    limitations.push("target has no dimensionKey");
    return freeze({
      target,
      sourceRefs: Object.freeze([]),
      traceability: "missing",
      findings: Object.freeze(findings),
      limitations: Object.freeze(limitations),
      safeAction: safeActionFor(findings),
    });
  }

  const base = produceUnderstandingAssessment({ profile, dimensionKey: target.dimensionKey, ...(at !== undefined ? { at } : {}) });
  if (base === undefined) {
    findings.push("missing-source");
    limitations.push(`dimension '${target.dimensionKey}' not present in profile`);
    return freeze({
      target,
      sourceRefs: Object.freeze([]),
      traceability: "missing",
      findings: Object.freeze(findings),
      limitations: Object.freeze(limitations),
      safeAction: safeActionFor(findings),
    });
  }

  // The artifact under review is the existing stored view when provided (it may carry incomplete refs);
  // otherwise the freshly recomputed base. Traceability is reported for that audited artifact.
  const existing = existingViews.find(
    (v) => v.target.kind === target.kind && v.target.primaryRef.id === target.primaryRef.id && v.target.dimensionKey === target.dimensionKey,
  )?.view;
  const audited = existing ?? base;
  const trace = traceabilityOf(audited);
  if (trace.status !== "verified") {
    findings.push("missing-traceability");
    limitations.push(`traceability ${trace.status}: downstream voice must be constrained`);
  }

  const ef = freshnessFromEvents(base, target, events);
  // For a view with no/incomplete traceability, freshness is at least 'partial' (limited usability).
  const freshness =
    trace.status === "verified" ? ef.freshness : moreCautious(ef.freshness, projectionFreshness("partial", ["missing-source"]));

  // applyFreshness recomputes the clamped ceiling from a freshness-free base — a NEW view; the profile is untouched.
  const recomputed = applyFreshness(base, freshness);

  const sf = statusFinding(freshness.status);
  if (sf !== undefined) findings.push(sf);
  if (ef.supersededFound) findings.push("source-superseded");
  if (ef.policyTransition) {
    findings.push("requires-policy-transition");
    limitations.push("new reasoning outcomes may move understanding; a policy transition is required (not applied here)");
  }

  let differences: readonly string[] | undefined;
  if (existing !== undefined) {
    differences = diff(existing, recomputed);
    findings.push(differences.length > 0 ? "changed" : "unchanged");
  }

  return freeze({
    target,
    recomputed,
    freshness,
    sourceRefs: Object.freeze([...(base.sourceRefs?.refs ?? [])]),
    traceability: trace.status,
    ...(differences !== undefined ? { differences } : {}),
    findings: Object.freeze(findings),
    limitations: Object.freeze(limitations),
    safeAction: safeActionFor(findings),
  });
}
