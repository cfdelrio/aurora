// understanding domain: the pure update policy.
//
// Promotion happens ONLY by survived challenge across >=2 distinct relevant conditions.
// Repetition / evidence volume / claim confidence / population knowledge never promote.
// promoted-to-working-knowledge is NOT automatically Mature. Demotion preserves history; Mature
// can demote; surprise is first-class; staleness lowers the ceiling (via the assessment).

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { DimensionUnderstanding } from "./dimension-understanding.ts";
import type { ReasoningOutcome, TraceToHypothesisOutcome } from "./reasoning-outcome.ts";
import { traceToHypothesisOutcome } from "./reasoning-outcome.ts";
import type { UnderstandingChangeReason } from "./understanding-change.ts";
import { understandingChange } from "./understanding-change.ts";
import type { UnderstandingLevel } from "./understanding-level.ts";
import { demoteOne, higherOf } from "./understanding-level.ts";
import { distinctConditionCount, survivedChallenge } from "./survived-challenge.ts";
import type { Surprise } from "./surprise.ts";
import { surprise } from "./surprise.ts";
import { raiseFragility } from "./fragility.ts";
import { stale } from "./staleness.ts";

type DimensionDraft = Omit<DimensionUnderstanding, "changes">;

function commit(
  base: DimensionUnderstanding,
  draft: DimensionDraft,
  from: UnderstandingLevel,
  reason: UnderstandingChangeReason,
  at: Timestamp,
  trace?: TraceToHypothesisOutcome,
  note?: string,
): DimensionUnderstanding {
  const changes =
    draft.level === from
      ? base.changes
      : [
          ...base.changes,
          understandingChange({
            from,
            to: draft.level,
            reason,
            at,
            ...(trace !== undefined ? { trace } : {}),
            ...(note !== undefined ? { note } : {}),
          }),
        ];
  return Object.freeze({ ...draft, changes: Object.freeze(changes) });
}

export function applyOutcome(
  current: DimensionUnderstanding,
  outcome: ReasoningOutcome,
): DimensionUnderstanding {
  const trace = traceToHypothesisOutcome(outcome.hypothesisId, outcome.outcomeKind, outcome.at);
  const from = current.level;
  const traces = Object.freeze([...current.traces, trace]);

  switch (outcome.outcomeKind) {
    case "retired": {
      // neutral for understanding: the question stopped mattering. Record the trace only.
      return Object.freeze({ ...current, traces });
    }

    case "supported":
    case "promoted-to-working-knowledge": {
      let survivedChallenges = current.survivedChallenges;
      if (outcome.hadDeclaredFalsifier) {
        survivedChallenges = Object.freeze([
          ...current.survivedChallenges,
          survivedChallenge({
            trace,
            conditions: outcome.conditions,
            falsifierSurvived: true,
            at: outcome.at,
          }),
        ]);
      }
      const distinct = distinctConditionCount(survivedChallenges);

      // first contact -> Working; Trusted needs survived challenge across >=2 conditions;
      // Mature needs Trusted + a prior (recovered) surprise. promoted-to-working-knowledge does
      // NOT auto-Mature -- it follows the same rules.
      let level: UnderstandingLevel = higherOf(from, "Working");
      if (distinct >= 2) {
        level = higherOf(level, "Trusted");
        if (current.surprises.length >= 1) {
          level = "Mature";
        }
      }
      const reason: UnderstandingChangeReason = outcome.hadDeclaredFalsifier
        ? "survived-challenge"
        : "initial";

      const draft: DimensionDraft = {
        dimension: current.dimension,
        level,
        fragility: current.fragility,
        staleness: current.staleness,
        survivedChallenges,
        surprises: current.surprises,
        traces,
      };
      return commit(current, draft, from, reason, outcome.at, trace);
    }

    case "weakened": {
      const draft: DimensionDraft = {
        dimension: current.dimension,
        level: demoteOne(from),
        fragility: raiseFragility(current.fragility, "weakened by a hypothesis outcome"),
        staleness: current.staleness,
        survivedChallenges: current.survivedChallenges,
        surprises: current.surprises,
        traces,
      };
      return commit(current, draft, from, "contradiction", outcome.at, trace, "weakened");
    }

    case "contradicted":
    case "falsified": {
      const isFalsified = outcome.outcomeKind === "falsified";
      const surprises: readonly Surprise[] =
        from === "Working" || from === "Trusted" || from === "Mature"
          ? [
              ...current.surprises,
              surprise({
                kind: "negative",
                description: `${outcome.outcomeKind} at level ${from}`,
                trace,
                at: outcome.at,
              }),
            ]
          : current.surprises;
      const level = isFalsified ? demoteOne(demoteOne(from)) : demoteOne(from);
      const reason: UnderstandingChangeReason = isFalsified ? "falsification" : "contradiction";
      const draft: DimensionDraft = {
        dimension: current.dimension,
        level,
        fragility: raiseFragility(current.fragility, reason),
        staleness: current.staleness,
        survivedChallenges: current.survivedChallenges,
        surprises: Object.freeze(surprises),
        traces,
      };
      return commit(current, draft, from, reason, outcome.at, trace);
    }
  }
}

export function markStaleDimension(
  current: DimensionUnderstanding,
  reason: "staleness" | "purpose-change" | "constraint-change" | "context-shift",
  at: Timestamp,
): DimensionUnderstanding {
  const draft: DimensionDraft = {
    dimension: current.dimension,
    level: current.level, // staleness lowers the ceiling (via assessment), not necessarily the level
    fragility: raiseFragility(current.fragility, `stale: ${reason}`),
    staleness: stale(reason, at),
    survivedChallenges: current.survivedChallenges,
    surprises: current.surprises,
    traces: current.traces,
  };
  return commit(current, draft, current.level, reason, at, undefined, "marked stale");
}
