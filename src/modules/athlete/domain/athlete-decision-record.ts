// athlete domain: AthleteDecisionRecord — an append-only log of an athlete's decisions.
//
// Append-only: a correction AMENDS or SUPERSEDES (a new entry referencing the prior), never
// overwrites. The original remains auditable. Immutable-by-operation: every method returns a NEW
// record sharing prior history.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { AthleteDecision } from "./athlete-decision.ts";
import type { AthleteDecisionId } from "./athlete-decision-id.ts";

export interface AthleteDecisionAmendment {
  readonly supersedesId: AthleteDecisionId;
  readonly replacement: AthleteDecision;
  readonly reason: string;
  readonly at: Timestamp;
}

export function athleteDecisionAmendment(
  supersedesId: AthleteDecisionId,
  replacement: AthleteDecision,
  reason: string,
  at: Timestamp,
): AthleteDecisionAmendment {
  if (typeof reason !== "string" || reason.length === 0) {
    throw new Error("An AthleteDecisionAmendment requires a non-empty reason");
  }
  if (replacement.id === supersedesId) {
    throw new Error("An amendment's replacement must be a distinct decision, not the original");
  }
  return Object.freeze({ supersedesId, replacement, reason, at });
}

/** Persistence shape (adapter contract; NOT the primary public domain API). */
export interface AthleteDecisionRecordState {
  readonly athleteRef: string;
  readonly decisions: readonly AthleteDecision[];
  readonly amendments: readonly AthleteDecisionAmendment[];
}

export class AthleteDecisionRecord {
  readonly athleteRef: string;
  private readonly _decisions: readonly AthleteDecision[];
  private readonly _amendments: readonly AthleteDecisionAmendment[];

  private constructor(
    athleteRef: string,
    decisions: readonly AthleteDecision[],
    amendments: readonly AthleteDecisionAmendment[],
  ) {
    this.athleteRef = athleteRef;
    this._decisions = Object.freeze([...decisions]);
    this._amendments = Object.freeze([...amendments]);
    Object.freeze(this);
  }

  static empty(athleteRef: string): AthleteDecisionRecord {
    if (typeof athleteRef !== "string" || athleteRef.length === 0) {
      throw new Error("An AthleteDecisionRecord requires an athleteRef");
    }
    return new AthleteDecisionRecord(athleteRef, [], []);
  }

  /** Append a new decision. Returns a new record; nothing existing is mutated. */
  record(decision: AthleteDecision): AthleteDecisionRecord {
    if (decision.athleteRef !== this.athleteRef) {
      throw new Error("A decision must belong to the record's athlete");
    }
    return new AthleteDecisionRecord(
      this.athleteRef,
      [...this._decisions, decision],
      this._amendments,
    );
  }

  /**
   * Supersede a prior decision with a correction. The original REMAINS in history; an amendment
   * record (with reason + time) is appended, and the replacement is appended as a new decision.
   */
  amend(amendment: AthleteDecisionAmendment): AthleteDecisionRecord {
    const original = this._decisions.find((d) => d.id === amendment.supersedesId);
    if (original === undefined) {
      throw new Error(`Cannot amend unknown decision: ${String(amendment.supersedesId)}`);
    }
    return new AthleteDecisionRecord(
      this.athleteRef,
      [...this._decisions, amendment.replacement],
      [...this._amendments, amendment],
    );
  }

  /** Full history, including superseded decisions. */
  get decisions(): readonly AthleteDecision[] {
    return this._decisions;
  }

  get amendments(): readonly AthleteDecisionAmendment[] {
    return this._amendments;
  }

  byId(id: AthleteDecisionId): AthleteDecision | undefined {
    return this._decisions.find((d) => d.id === id);
  }

  /** Ids that have been superseded by an amendment (history retained, not active). */
  supersededIds(): readonly AthleteDecisionId[] {
    return Object.freeze(this._amendments.map((a) => a.supersedesId));
  }

  /** Active (not superseded) decisions. */
  active(): readonly AthleteDecision[] {
    const superseded = new Set(this._amendments.map((a) => a.supersedesId));
    return this._decisions.filter((d) => !superseded.has(d.id));
  }

  /** Persistence state export. Plain, serializable; exposes no mutable internal reference. */
  toState(): AthleteDecisionRecordState {
    return Object.freeze({
      athleteRef: this.athleteRef,
      decisions: this._decisions,
      amendments: this._amendments,
    });
  }

  /** Rebuild from persisted state, preserving append-only history and amendment ordering. Each
   *  decision must belong to this athlete and carry a well-formed choice (no obedience/score field). */
  static reconstitute(state: AthleteDecisionRecordState): AthleteDecisionRecord {
    if (typeof state.athleteRef !== "string" || state.athleteRef.length === 0) {
      throw new Error("Cannot reconstitute an AthleteDecisionRecord without an athleteRef");
    }
    if (!Array.isArray(state.decisions) || !Array.isArray(state.amendments)) {
      throw new Error("Cannot reconstitute an AthleteDecisionRecord without decisions/amendments arrays");
    }
    const ids = new Set<string>();
    for (const d of state.decisions) {
      if (d === null || typeof d !== "object" || d.athleteRef !== state.athleteRef) {
        throw new Error("Cannot reconstitute: a decision must belong to the record's athlete");
      }
      if (d.choice === undefined || typeof d.choice.action !== "string" || d.choice.action.length === 0) {
        throw new Error("Cannot reconstitute: a decision must carry a well-formed choice");
      }
      ids.add(String(d.id));
    }
    for (const a of state.amendments) {
      if (!ids.has(String(a.supersedesId))) {
        throw new Error("Cannot reconstitute: an amendment must reference an existing decision");
      }
    }
    return new AthleteDecisionRecord(state.athleteRef, state.decisions, state.amendments);
  }
}
