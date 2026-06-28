// understanding domain: ProjectionRefreshPolicy — a pure, deterministic decision.
//
// It DECIDES only (it does not recompute, edit, or delete anything). It is SELECTIVE: a trigger
// affects a projection only when its scope intersects the projection's source references. It is
// CONSERVATIVE under uncertainty (never `keep-current` when relatedness can't be ruled out), and it
// NEVER globally invalidates and NEVER invents traceability.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { ProjectionFreshness, ProjectionFreshnessStatus, StalenessReason } from "./projection-freshness.ts";
import { currentFreshness, projectionFreshness } from "./projection-freshness.ts";
import type { ProjectionTrace } from "./projection-source-ref.ts";
import { traceReferences } from "./projection-source-ref.ts";
import type { RefreshTrigger } from "./refresh-trigger.ts";

export type ProjectionRefreshDecisionKind =
  | "keep-current"
  | "mark-stale"
  | "mark-partial"
  | "mark-invalid"
  | "recompute-required"
  | "withhold-from-strong-output";

export interface ProjectionRefreshDecision {
  readonly kind: ProjectionRefreshDecisionKind;
  readonly reason: StalenessReason;
  readonly appliesTo?: string;
}

export interface ProjectionRefreshPolicyInput {
  readonly freshness: ProjectionFreshness;
  readonly trigger: RefreshTrigger;
  readonly sourceRefs: ProjectionTrace;
  /** the dimension this projection is about (for purpose/context selectivity) */
  readonly projectionDimensionKey?: string;
  /** whether the relevant source can still be resolved (default true) */
  readonly sourceAvailable?: boolean;
}

type Relatedness = "yes" | "no" | "unknown";

function relatedness(input: ProjectionRefreshPolicyInput): Relatedness {
  const { trigger, sourceRefs, projectionDimensionKey } = input;
  const scope = trigger.scope;
  switch (trigger.kind) {
    case "hypothesis-revised":
    case "hypothesis-falsified":
    case "new-contradictory-evidence": {
      const id = scope?.hypothesisId;
      if (id === undefined) return "unknown";
      return traceReferences(sourceRefs, "hypothesis", id) ? "yes" : "no";
    }
    case "observation-superseded": {
      const obsId = scope?.observationId;
      const setId = scope?.observationSetId;
      if (obsId === undefined && setId === undefined) return "unknown";
      const obsHit = obsId !== undefined && traceReferences(sourceRefs, "observation", obsId);
      const setHit = setId !== undefined && traceReferences(sourceRefs, "observation-set", setId);
      return obsHit || setHit ? "yes" : "no";
    }
    case "purpose-change":
    case "context-changed": {
      const dim = scope?.dimensionKey;
      const pvr = scope?.purposeVersionRef;
      if (dim === undefined && pvr === undefined) return "unknown";
      const dimHit = dim !== undefined && projectionDimensionKey !== undefined && dim === projectionDimensionKey;
      const pvrHit = pvr !== undefined && traceReferences(sourceRefs, "purpose-version", pvr);
      return dimHit || pvrHit ? "yes" : "no";
    }
    case "source-quality-changed":
    case "missing-source":
    case "projection-source-unavailable": {
      const obsId = scope?.observationId;
      const setId = scope?.observationSetId;
      if (obsId === undefined && setId === undefined) return "unknown";
      const hit =
        (obsId !== undefined && traceReferences(sourceRefs, "observation", obsId)) ||
        (setId !== undefined && traceReferences(sourceRefs, "observation-set", setId));
      return hit ? "yes" : "no";
    }
    case "time-decay":
      // Age is about THIS projection; if a time-decay trigger fires for it, it is related.
      return "yes";
  }
}

function severity(input: ProjectionRefreshPolicyInput): ProjectionRefreshDecisionKind {
  const available = input.sourceAvailable ?? true;
  switch (input.trigger.kind) {
    case "hypothesis-falsified":
    case "new-contradictory-evidence":
      return "mark-invalid";
    case "projection-source-unavailable":
      return "mark-invalid";
    case "hypothesis-revised":
      return available ? "mark-stale" : "mark-invalid";
    case "observation-superseded":
      return available ? "mark-stale" : "mark-invalid";
    case "source-quality-changed":
    case "missing-source":
      return "mark-partial";
    case "purpose-change":
    case "context-changed":
    case "time-decay":
      return "mark-stale";
  }
}

/** Decide what should happen to a projection given a trigger. Pure; constrains, never enables. */
export function projectionRefreshPolicy(
  input: ProjectionRefreshPolicyInput,
): ProjectionRefreshDecision {
  const reason = input.trigger.kind as StalenessReason; // kinds and reasons share the taxonomy
  const related = relatedness(input);
  if (related === "no") {
    return Object.freeze({ kind: "keep-current", reason });
  }
  // related === "yes" or "unknown" (conservative): constrain.
  return Object.freeze({ kind: severity(input), reason });
}

const DECISION_TO_STATUS: Partial<Record<ProjectionRefreshDecisionKind, ProjectionFreshnessStatus>> = {
  "mark-stale": "stale",
  "mark-partial": "partial",
  "mark-invalid": "invalid",
  "withhold-from-strong-output": "unknown",
};

/**
 * The freshness implied by a decision, or undefined for `keep-current` / `recompute-required`
 * (the latter means: re-run derivation from the profile, which yields a fresh `current`).
 */
export function freshnessFromDecision(
  decision: ProjectionRefreshDecision,
  since?: Timestamp,
): ProjectionFreshness | undefined {
  if (decision.kind === "keep-current") {
    return currentFreshness();
  }
  const status = DECISION_TO_STATUS[decision.kind];
  if (status === undefined) {
    return undefined; // recompute-required: caller recomputes from source
  }
  return projectionFreshness(status, [decision.reason], since);
}
