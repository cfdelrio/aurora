// reasoning domain: lifecycle states, allowed manual transitions, and revisions.

import type { Timestamp } from "../../../shared-kernel/time.ts";

export type HypothesisLifecycleState =
  | "proposed"
  | "active"
  | "supported"
  | "weakened"
  | "contradicted"
  | "falsified"
  | "retired"
  | "promoted-to-working-knowledge";

export interface HypothesisRevision {
  readonly at: Timestamp;
  readonly from: HypothesisLifecycleState;
  readonly to: HypothesisLifecycleState;
  readonly cause: string;
}

// Allowed transitions for MANUAL transitions (transition/promote/retire).
// Evidence-driven state changes are governed by evidence rules in the aggregate, not this table.
const ALLOWED: Readonly<Record<HypothesisLifecycleState, readonly HypothesisLifecycleState[]>> =
  Object.freeze({
    proposed: ["active", "retired"],
    active: ["supported", "weakened", "contradicted", "falsified", "promoted-to-working-knowledge", "retired"],
    supported: ["weakened", "contradicted", "falsified", "promoted-to-working-knowledge", "retired"],
    weakened: ["supported", "contradicted", "falsified", "retired"],
    contradicted: ["weakened", "supported", "falsified", "retired"],
    falsified: [],
    retired: [],
    "promoted-to-working-knowledge": ["weakened", "contradicted", "falsified", "retired"],
  });

export function canTransition(
  from: HypothesisLifecycleState,
  to: HypothesisLifecycleState,
): boolean {
  return ALLOWED[from].includes(to);
}

/** Falsified and retired are terminal: they remain traceable but receive no new evidence. */
export function receivesEvidence(state: HypothesisLifecycleState): boolean {
  return state !== "falsified" && state !== "retired";
}

/** Clear "active support" states. Falsified and retired are never active support. */
export function isActiveSupport(state: HypothesisLifecycleState): boolean {
  return state === "supported" || state === "promoted-to-working-knowledge";
}
