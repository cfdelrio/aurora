// understanding domain: the UnderstandingProfile aggregate root.
//
// Per-dimension, never global; consumes only ReasoningOutcome (not raw observations/signals/
// EvidenceCases); owns no athlete state/capacity; immutable-by-operation; history never deleted.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { UnderstandingProfileId } from "./ids.ts";
import { newUnderstandingProfileId } from "./ids.ts";
import type { DimensionUnderstanding } from "./dimension-understanding.ts";
import { initialDimensionUnderstanding } from "./dimension-understanding.ts";
import type { ReasoningOutcome } from "./reasoning-outcome.ts";
import { applyOutcome, markStaleDimension } from "./update-policy.ts";
import type { UnderstandingLevel } from "./understanding-level.ts";
import type { UnderstandingAssessment } from "./understanding-assessment.ts";
import { deriveSafeVoiceCeiling } from "./understanding-assessment.ts";

export type StaleReason = "staleness" | "purpose-change" | "constraint-change" | "context-shift";

export interface InitializeProfileInput {
  readonly id?: UnderstandingProfileId;
  readonly athleteRef: string;
}

export class UnderstandingProfile {
  readonly id: UnderstandingProfileId;
  readonly athleteRef: string;
  private readonly _dimensions: ReadonlyMap<string, DimensionUnderstanding>;

  private constructor(
    id: UnderstandingProfileId,
    athleteRef: string,
    dimensions: ReadonlyMap<string, DimensionUnderstanding>,
  ) {
    this.id = id;
    this.athleteRef = athleteRef;
    this._dimensions = dimensions;
    Object.freeze(this);
  }

  static initialize(input: InitializeProfileInput): UnderstandingProfile {
    if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
      throw new Error("UnderstandingProfile requires an athleteRef");
    }
    return new UnderstandingProfile(
      input.id ?? newUnderstandingProfileId(),
      input.athleteRef,
      new Map(),
    );
  }

  updateFromOutcome(outcome: ReasoningOutcome): UnderstandingProfile {
    const key = outcome.dimension.key;
    const existing = this._dimensions.get(key) ?? initialDimensionUnderstanding(outcome.dimension);
    const updated = applyOutcome(existing, outcome);
    const next = new Map(this._dimensions);
    next.set(key, updated);
    return new UnderstandingProfile(this.id, this.athleteRef, next);
  }

  markStale(dimensionKey: string, reason: StaleReason, at: Timestamp): UnderstandingProfile {
    const existing = this._dimensions.get(dimensionKey);
    if (existing === undefined) {
      throw new Error(`Cannot mark unknown dimension stale: ${dimensionKey}`);
    }
    const updated = markStaleDimension(existing, reason, at);
    const next = new Map(this._dimensions);
    next.set(dimensionKey, updated);
    return new UnderstandingProfile(this.id, this.athleteRef, next);
  }

  /** Level of a dimension; Unknown if never observed. */
  levelOf(dimensionKey: string): UnderstandingLevel {
    return this._dimensions.get(dimensionKey)?.level ?? "Unknown";
  }

  dimension(dimensionKey: string): DimensionUnderstanding | undefined {
    return this._dimensions.get(dimensionKey);
  }

  dimensionKeys(): readonly string[] {
    return Object.freeze([...this._dimensions.keys()]);
  }

  /** A read-only assessment for a dimension. Never recommends, never selects a voice. */
  assess(dimensionKey: string): UnderstandingAssessment | undefined {
    const d = this._dimensions.get(dimensionKey);
    if (d === undefined) {
      return undefined;
    }
    const reasons = [
      ...d.changes.map((c) => `${c.reason}: ${c.from} -> ${c.to}`),
      ...d.fragility.reasons.map((r) => `fragility: ${r}`),
      ...(d.staleness.status === "stale" && d.staleness.reason !== undefined
        ? [`stale: ${d.staleness.reason}`]
        : []),
    ];
    return Object.freeze({
      dimension: d.dimension,
      level: d.level,
      fragility: d.fragility,
      staleness: d.staleness,
      safeVoiceCeiling: deriveSafeVoiceCeiling(d.level, d.fragility, d.staleness),
      reasons: Object.freeze(reasons),
      trace: d.traces,
    });
  }
}
