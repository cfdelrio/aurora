// athlete domain: the Athlete aggregate root (thin, Purpose-first slice).
//
// Owns ONLY the *given* — for this slice, the athlete's declared PurposeHistory (append-only).
// It does NOT own inferred state, capacity, readiness, fatigue, understanding, or decisions
// (Athlete Aggregate, governing idea). Immutable-by-operation: every change returns a NEW Athlete
// sharing prior history. Purpose history is never overwritten; the future lens changes, the past
// is preserved.

import type { AthleteId, PurposeVersionId } from "./ids.ts";
import { newAthleteId, newPurposeVersionId } from "./ids.ts";
import type { Purpose, PurposeChangeReason } from "./purpose.ts";
import type { PurposeVersion, PurposeVersionRef } from "./purpose-version.ts";
import { purposeVersion, purposeVersionRefOf } from "./purpose-version.ts";
import type { PurposeChanged } from "./purpose-changed.ts";
import { purposeChanged } from "./purpose-changed.ts";

export interface CreateAthleteInput {
  readonly id?: AthleteId;
  /** an opaque identity handle; full AthleteIdentity is out of scope for this slice */
  readonly identityRef: string;
}

const VALID_STATUS: readonly Purpose["status"][] = ["declared", "unknown", "ambiguous"];
const VALID_SOURCE: readonly Purpose["source"][] = ["athlete-declared", "athlete-accepted"];

/** A runtime guard: only a well-formed, athlete-sourced Purpose may enter the history. This makes
 *  "revealed behavior (or any non-purpose value) becomes a purpose" fail even if types are bypassed. */
function requireValidPurpose(p: Purpose): Purpose {
  if (p === null || typeof p !== "object" || !VALID_STATUS.includes(p.status)) {
    throw new Error("Athlete only accepts a well-formed Purpose value");
  }
  if (!VALID_SOURCE.includes(p.source)) {
    throw new Error("Purpose must be athlete-sourced (declared or accepted); inference is forbidden");
  }
  if (p.status === "declared" && (typeof p.statement !== "string" || p.statement.length === 0)) {
    throw new Error("A declared Purpose requires a non-empty statement");
  }
  return p;
}

/** A neutral view of the current purpose, free of any decision-support vocabulary. */
export interface CurrentPurposeView {
  readonly status: "declared" | "unknown" | "ambiguous";
  readonly statement?: string;
}

interface AthleteProps {
  readonly id: AthleteId;
  readonly identityRef: string;
  readonly history: readonly PurposeVersion[];
}

/** Persistence shape (adapter contract; NOT the primary public domain API). */
export interface AthleteState {
  readonly id: AthleteId;
  readonly identityRef: string;
  readonly history: readonly PurposeVersion[];
}

export class Athlete {
  readonly id: AthleteId;
  readonly identityRef: string;
  private readonly _history: readonly PurposeVersion[];

  private constructor(props: AthleteProps) {
    this.id = props.id;
    this.identityRef = props.identityRef;
    this._history = Object.freeze([...props.history]);
    Object.freeze(this);
  }

  static create(input: CreateAthleteInput): Athlete {
    if (typeof input.identityRef !== "string" || input.identityRef.length === 0) {
      throw new Error("Athlete requires an identityRef");
    }
    return new Athlete({
      id: input.id ?? newAthleteId(),
      identityRef: input.identityRef,
      history: [],
    });
  }

  /** Declare the first purpose. Only valid when no purpose has been declared yet. */
  declarePurpose(purpose: Purpose, versionId?: PurposeVersionId): Athlete {
    if (this._history.length > 0) {
      throw new Error("Purpose already declared; use changePurpose to append a new version");
    }
    const v = purposeVersion({
      id: versionId ?? newPurposeVersionId(),
      purpose: requireValidPurpose(purpose),
      version: 1,
    });
    return new Athlete({ ...this.toProps(), history: [v] });
  }

  /**
   * Append a new purpose version. Requires an existing current purpose. The prior version is
   * preserved (append-only); nothing is overwritten. The new version records what it supersedes.
   */
  changePurpose(
    purpose: Purpose,
    reason?: PurposeChangeReason,
    versionId?: PurposeVersionId,
  ): Athlete {
    const current = this.currentVersion();
    if (current === undefined) {
      throw new Error("No purpose declared yet; use declarePurpose for the first version");
    }
    const v = purposeVersion({
      id: versionId ?? newPurposeVersionId(),
      purpose: requireValidPurpose(purpose),
      version: current.version + 1,
      supersedesRef: purposeVersionRefOf(current),
      ...(reason !== undefined ? { reason } : { reason: "unspecified" }),
    });
    return new Athlete({ ...this.toProps(), history: [...this._history, v] });
  }

  /** Full append-only history (oldest first). */
  purposeHistory(): readonly PurposeVersion[] {
    return this._history;
  }

  /** The latest (current) version, or undefined if none declared. */
  currentVersion(): PurposeVersion | undefined {
    return this._history.length === 0 ? undefined : this._history[this._history.length - 1];
  }

  /** The current purpose value, or undefined if none declared. */
  currentPurpose(): Purpose | undefined {
    return this.currentVersion()?.purpose;
  }

  /** Resolve a past version by its ref (for historical/as-of queries). */
  versionByRef(ref: PurposeVersionRef): PurposeVersion | undefined {
    return this._history.find((v) => purposeVersionRefOf(v) === ref);
  }

  /** The most recent change outcome (undefined until a second version exists). */
  lastPurposeChange(): PurposeChanged | undefined {
    if (this._history.length < 2) {
      return undefined;
    }
    const prev = this._history[this._history.length - 2];
    const next = this._history[this._history.length - 1];
    if (prev === undefined || next === undefined) {
      return undefined;
    }
    return purposeChanged(prev, next);
  }

  /** A neutral view for adapters; "unknown" when no purpose has been declared. */
  currentPurposeView(): CurrentPurposeView {
    const p = this.currentPurpose();
    if (p === undefined) {
      return Object.freeze({ status: "unknown" });
    }
    return Object.freeze(
      p.statement === undefined
        ? { status: p.status }
        : { status: p.status, statement: p.statement },
    );
  }

  private toProps(): AthleteProps {
    return { id: this.id, identityRef: this.identityRef, history: this._history };
  }

  /** Persistence state export. Plain, serializable; exposes no mutable internal reference. */
  toState(): AthleteState {
    return Object.freeze({ id: this.id, identityRef: this.identityRef, history: this._history });
  }

  /** Rebuild from persisted state, re-validating each purpose version (athlete-sourced, well-formed)
   *  and the append-only ordering. Reconstitution owns nothing inferred; only the given. */
  static reconstitute(state: AthleteState): Athlete {
    if (typeof state.identityRef !== "string" || state.identityRef.length === 0) {
      throw new Error("Cannot reconstitute an Athlete without an identityRef");
    }
    if (!Array.isArray(state.history)) {
      throw new Error("Cannot reconstitute an Athlete without a purpose history array");
    }
    let expectedVersion = 1;
    for (const v of state.history) {
      if (v === null || typeof v !== "object" || !Number.isInteger(v.version)) {
        throw new Error("Cannot reconstitute an Athlete with a malformed PurposeVersion");
      }
      if (v.version !== expectedVersion) {
        throw new Error("Cannot reconstitute an Athlete: purpose history must be contiguous and ordered");
      }
      requireValidPurpose(v.purpose);
      expectedVersion += 1;
    }
    return new Athlete({ id: state.id, identityRef: state.identityRef, history: state.history });
  }
}
