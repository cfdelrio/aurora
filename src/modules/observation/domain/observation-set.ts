// observation domain: the ObservationSet aggregate.
//
// The consistency boundary for everything observed about one occasion. It guarantees:
//  - provenance/quality travel with every observation,
//  - observations are immutable and append-only (superseded, never overwritten),
//  - "as-of" history is reconstructable (what was known at the time),
//  - incompleteness is explicit,
//  - source conflicts are exposed, never resolved.
//
// The aggregate is immutable-by-operation: every mutating-looking method returns a NEW
// ObservationSet sharing the prior history. Nothing existing is ever mutated.

import type { ObservationId, ObservationSetId } from "../../../shared-kernel/ids.ts";
import { newObservationSetId } from "../../../shared-kernel/ids.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";
import { earliest, latest, timestampLeq } from "../../../shared-kernel/time.ts";
import type { Observation } from "./observation.ts";

export interface SupersessionRecord {
  readonly originalId: ObservationId;
  readonly replacementId: ObservationId;
  readonly reason: string;
  readonly at: Timestamp;
}

export interface Completeness {
  readonly complete: boolean;
  /** what is expected-and-absent: from missing-data observations and any declared expectations */
  readonly missing: readonly string[];
}

export interface TimeRange {
  readonly from: Timestamp;
  readonly to: Timestamp;
}

export interface ObservationSetCreateInput {
  readonly id?: ObservationSetId;
  readonly occasion: string;
  /** declared expected measurement quantities for this occasion (optional) */
  readonly expected?: readonly string[];
}

/** Persistence shape (adapter contract; NOT the primary public domain API). */
export interface ObservationSetState {
  readonly id: ObservationSetId;
  readonly occasion: string;
  readonly observations: readonly Observation[];
  readonly supersessions: readonly SupersessionRecord[];
  readonly expected: readonly string[];
}

export class ObservationSet {
  readonly id: ObservationSetId;
  readonly occasion: string;
  private readonly _observations: readonly Observation[];
  private readonly _supersessions: readonly SupersessionRecord[];
  private readonly _expected: readonly string[];

  private constructor(
    id: ObservationSetId,
    occasion: string,
    observations: readonly Observation[],
    supersessions: readonly SupersessionRecord[],
    expected: readonly string[],
  ) {
    this.id = id;
    this.occasion = occasion;
    this._observations = Object.freeze([...observations]);
    this._supersessions = Object.freeze([...supersessions]);
    this._expected = Object.freeze([...expected]);
    Object.freeze(this);
  }

  static create(input: ObservationSetCreateInput): ObservationSet {
    if (typeof input.occasion !== "string" || input.occasion.length === 0) {
      throw new Error("ObservationSet requires a non-empty occasion identity");
    }
    return new ObservationSet(
      input.id ?? newObservationSetId(),
      input.occasion,
      [],
      [],
      input.expected ?? [],
    );
  }

  /** Persistence state export. Plain, serializable; exposes no mutable internal reference. */
  toState(): ObservationSetState {
    return Object.freeze({
      id: this.id,
      occasion: this.occasion,
      observations: this._observations,
      supersessions: this._supersessions,
      expected: this._expected,
    });
  }

  /** Rebuild from persisted state, validating invariants. Never a raw, unvalidated field bag. */
  static reconstitute(state: ObservationSetState): ObservationSet {
    if (typeof state.occasion !== "string" || state.occasion.length === 0) {
      throw new Error("Cannot reconstitute an ObservationSet without a non-empty occasion");
    }
    if (!Array.isArray(state.observations)) {
      throw new Error("Cannot reconstitute an ObservationSet without an observations array");
    }
    for (const o of state.observations) {
      if (
        o === null ||
        typeof o !== "object" ||
        o.provenance === undefined ||
        typeof o.provenance.reference !== "string" ||
        o.provenance.reference.length === 0 ||
        o.quality === undefined
      ) {
        throw new Error("Cannot reconstitute an ObservationSet with an observation missing provenance/quality");
      }
    }
    return new ObservationSet(
      state.id,
      state.occasion,
      state.observations,
      state.supersessions ?? [],
      state.expected ?? [],
    );
  }

  /** Append an observation. Returns a new set; nothing existing is mutated. */
  add(observation: Observation): ObservationSet {
    return new ObservationSet(
      this.id,
      this.occasion,
      [...this._observations, observation],
      this._supersessions,
      this._expected,
    );
  }

  /**
   * Supersede an existing observation with a replacement. The original REMAINS in history.
   * A supersession record (with reason + time) is appended. Nothing is overwritten.
   */
  supersede(
    originalId: ObservationId,
    replacement: Observation,
    reason: string,
    at: Timestamp,
  ): ObservationSet {
    const original = this._observations.find((o) => o.id === originalId);
    if (original === undefined) {
      throw new Error(`Cannot supersede unknown observation: ${String(originalId)}`);
    }
    if (replacement.id === originalId) {
      throw new Error("A replacement must be a distinct observation, not the original");
    }
    if (typeof reason !== "string" || reason.length === 0) {
      throw new Error("Supersession requires a non-empty reason");
    }
    const record: SupersessionRecord = Object.freeze({
      originalId,
      replacementId: replacement.id,
      reason,
      at,
    });
    return new ObservationSet(
      this.id,
      this.occasion,
      [...this._observations, replacement],
      [...this._supersessions, record],
      this._expected,
    );
  }

  /** Full history, including superseded observations. */
  get observations(): readonly Observation[] {
    return this._observations;
  }

  get supersessions(): readonly SupersessionRecord[] {
    return this._supersessions;
  }

  /** Currently active observations (those not superseded). */
  active(): readonly Observation[] {
    const superseded = new Set(this._supersessions.map((s) => s.originalId));
    return this._observations.filter((o) => !superseded.has(o.id));
  }

  /**
   * What was active "as of" a moment: observations recorded by `t` and not yet
   * superseded by `t`. This is how downstream traceability explains what was known then.
   */
  activeAsOf(t: Timestamp): readonly Observation[] {
    const supersededByT = new Set(
      this._supersessions.filter((s) => timestampLeq(s.at, t)).map((s) => s.originalId),
    );
    return this._observations.filter(
      (o) => timestampLeq(o.provenance.recordingTime, t) && !supersededByT.has(o.id),
    );
  }

  /** Incompleteness is always explicit. */
  completeness(): Completeness {
    const presentQuantities = new Set(
      this.active()
        .filter((o) => o.kind === "measured")
        .map((o) => o.measurement.quantity),
    );
    const missingFromExpected = this._expected.filter((q) => !presentQuantities.has(q));
    const missingFromObservations = this.active()
      .filter((o) => o.kind === "missing-data")
      .map((o) => o.expected);
    const missing = [...new Set([...missingFromExpected, ...missingFromObservations])];
    return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing) });
  }

  /** Source conflicts are exposed, never resolved here. */
  sourceConflicts(): readonly Observation[] {
    return this.active().filter((o) => o.quality.status === "source-conflicted");
  }

  timeRange(): TimeRange | undefined {
    const captures = this._observations.map((o) => o.provenance.captureTime);
    const from = earliest(captures);
    const to = latest(captures);
    if (from === undefined || to === undefined) {
      return undefined;
    }
    return Object.freeze({ from, to });
  }
}
