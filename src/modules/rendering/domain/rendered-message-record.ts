// rendering domain: RenderedMessageRecord — an append-only, auditable record of a rendered presentation
// artifact. It is NOT domain authority: it carries no Evidence/Observation/Understanding/AthleteDecision/
// DecisionSupport field and no domain-write handle. Persisting it does not make it true; reviewing it is
// about display safety, not reasoning. Immutable-by-operation: appendReview/markSupersededBy return a new
// record; review history is never overwritten.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { VoiceMode } from "../../decision-support/index.ts";
import type { RenderableKind } from "./renderable-domain-output.ts";
import type { RenderedMessage } from "./rendered-message.ts";
import type { RenderingFailure } from "./rendering-failure.ts";
import type { RenderedMessageRecordId } from "./ids.ts";
import { renderReview } from "./render-review.ts";
import type { RenderReview, RenderReviewDecision } from "./render-review.ts";

export type RenderingStatus = "rendered" | "failed";

export interface PreservedFlags {
  readonly uncertaintyPreserved: boolean;
  readonly limitationsPreserved: boolean;
  readonly traceabilityPreserved: boolean;
}

export interface RenderedMessageRecordState {
  readonly id: RenderedMessageRecordId;
  readonly sourceDomainOutputRef: string;
  readonly terminalOutputKind: RenderableKind;
  readonly voice?: VoiceMode;
  readonly renderingStatus: RenderingStatus;
  readonly text?: string; // present iff rendered
  readonly preserved?: PreservedFlags; // present iff rendered
  readonly warnings: readonly string[];
  readonly failures?: readonly RenderingFailure[]; // present iff failed
  readonly rendererKind: string;
  readonly createdAt: Timestamp;
  readonly revisedFrom?: RenderedMessageRecordId;
  readonly supersededBy?: RenderedMessageRecordId;
  readonly reviews: readonly RenderReview[];
}

const TERMINAL_KINDS: readonly RenderableKind[] = ["support", "inquiry", "withholding"];

function validTimestamp(t: unknown): t is Timestamp {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof (t as Timestamp).epochMillis === "number" &&
    Number.isFinite((t as Timestamp).epochMillis) &&
    typeof (t as Timestamp).iso === "string"
  );
}

export class RenderedMessageRecord {
  readonly id: RenderedMessageRecordId;
  readonly sourceDomainOutputRef: string;
  readonly terminalOutputKind: RenderableKind;
  readonly voice?: VoiceMode;
  readonly renderingStatus: RenderingStatus;
  readonly text?: string;
  readonly preserved?: PreservedFlags;
  readonly warnings: readonly string[];
  readonly failures?: readonly RenderingFailure[];
  readonly rendererKind: string;
  readonly createdAt: Timestamp;
  readonly revisedFrom?: RenderedMessageRecordId;
  readonly supersededBy?: RenderedMessageRecordId;
  private readonly _reviews: readonly RenderReview[];

  private constructor(props: RenderedMessageRecordState) {
    this.id = props.id;
    this.sourceDomainOutputRef = props.sourceDomainOutputRef;
    this.terminalOutputKind = props.terminalOutputKind;
    if (props.voice !== undefined) this.voice = props.voice;
    this.renderingStatus = props.renderingStatus;
    if (props.text !== undefined) this.text = props.text;
    if (props.preserved !== undefined) this.preserved = Object.freeze({ ...props.preserved });
    this.warnings = Object.freeze([...props.warnings]);
    if (props.failures !== undefined) this.failures = Object.freeze([...props.failures]);
    this.rendererKind = props.rendererKind;
    this.createdAt = props.createdAt;
    if (props.revisedFrom !== undefined) this.revisedFrom = props.revisedFrom;
    if (props.supersededBy !== undefined) this.supersededBy = props.supersededBy;
    this._reviews = Object.freeze([...props.reviews]);
    Object.freeze(this);
  }

  /** Build from a successful RenderedMessage. Initial review status is `not-reviewed`; not display-eligible. */
  static fromRenderedMessage(input: {
    readonly id: RenderedMessageRecordId;
    readonly message: RenderedMessage;
    readonly rendererKind: string;
    readonly createdAt: Timestamp;
    readonly revisedFrom?: RenderedMessageRecordId;
  }): RenderedMessageRecord {
    const m = input.message;
    return new RenderedMessageRecord({
      id: input.id,
      sourceDomainOutputRef: m.sourceRef,
      terminalOutputKind: m.kind,
      ...(m.voice !== undefined ? { voice: m.voice } : {}),
      renderingStatus: "rendered",
      text: m.text,
      preserved: {
        uncertaintyPreserved: m.uncertaintyPreserved,
        limitationsPreserved: m.limitationsPreserved,
        traceabilityPreserved: m.traceabilityPreserved,
      },
      warnings: m.warnings,
      rendererKind: input.rendererKind,
      createdAt: input.createdAt,
      ...(input.revisedFrom !== undefined ? { revisedFrom: input.revisedFrom } : {}),
      reviews: [],
    });
  }

  /** Build a failed attempt for audit. It has no displayable text and can never be display-eligible. */
  static fromFailedOutcome(input: {
    readonly id: RenderedMessageRecordId;
    readonly sourceDomainOutputRef: string;
    readonly terminalOutputKind: RenderableKind;
    readonly voice?: VoiceMode;
    readonly failures: readonly RenderingFailure[];
    readonly rendererKind: string;
    readonly createdAt: Timestamp;
  }): RenderedMessageRecord {
    if (!Array.isArray(input.failures) || input.failures.length === 0) {
      throw new Error("A failed RenderedMessageRecord requires at least one failure");
    }
    return new RenderedMessageRecord({
      id: input.id,
      sourceDomainOutputRef: input.sourceDomainOutputRef,
      terminalOutputKind: input.terminalOutputKind,
      ...(input.voice !== undefined ? { voice: input.voice } : {}),
      renderingStatus: "failed",
      warnings: [],
      failures: input.failures,
      rendererKind: input.rendererKind,
      createdAt: input.createdAt,
      reviews: [],
    });
  }

  get reviews(): readonly RenderReview[] {
    return this._reviews;
  }

  /** Append a review (immutable-by-operation). A failed record can never be approved for display. */
  appendReview(review: RenderReview): RenderedMessageRecord {
    const validated = renderReview(review); // rejects derived-only decisions + unknown reasons
    if (this.renderingStatus === "failed" && validated.decision === "approved-for-display") {
      throw new Error("A failed rendering attempt cannot be approved for display");
    }
    return new RenderedMessageRecord({ ...this.toState(), reviews: [...this._reviews, validated] });
  }

  /** Mark superseded by a later record (append-only; never self-referential). */
  markSupersededBy(by: RenderedMessageRecordId): RenderedMessageRecord {
    if (String(by) === String(this.id)) {
      throw new Error("A RenderedMessageRecord cannot supersede itself");
    }
    return new RenderedMessageRecord({ ...this.toState(), supersededBy: by });
  }

  /** Derived: `superseded` if superseded; else the latest appended decision; else `not-reviewed`. */
  currentReviewStatus(): RenderReviewDecision {
    if (this.supersededBy !== undefined) return "superseded";
    const last = this._reviews[this._reviews.length - 1];
    return last === undefined ? "not-reviewed" : last.decision;
  }

  toState(): RenderedMessageRecordState {
    return Object.freeze({
      id: this.id,
      sourceDomainOutputRef: this.sourceDomainOutputRef,
      terminalOutputKind: this.terminalOutputKind,
      ...(this.voice !== undefined ? { voice: this.voice } : {}),
      renderingStatus: this.renderingStatus,
      ...(this.text !== undefined ? { text: this.text } : {}),
      ...(this.preserved !== undefined ? { preserved: this.preserved } : {}),
      warnings: this.warnings,
      ...(this.failures !== undefined ? { failures: this.failures } : {}),
      rendererKind: this.rendererKind,
      createdAt: this.createdAt,
      ...(this.revisedFrom !== undefined ? { revisedFrom: this.revisedFrom } : {}),
      ...(this.supersededBy !== undefined ? { supersededBy: this.supersededBy } : {}),
      reviews: this._reviews,
    });
  }

  /** Rebuild from persisted state, re-validating the audit invariants. Invalid state is rejected. */
  static reconstitute(state: RenderedMessageRecordState): RenderedMessageRecord {
    if (typeof state.sourceDomainOutputRef !== "string" || state.sourceDomainOutputRef.length === 0) {
      throw new Error("Cannot reconstitute a RenderedMessageRecord without a sourceDomainOutputRef");
    }
    if (!TERMINAL_KINDS.includes(state.terminalOutputKind)) {
      throw new Error(`Invalid terminalOutputKind: ${String(state.terminalOutputKind)}`);
    }
    if (state.renderingStatus !== "rendered" && state.renderingStatus !== "failed") {
      throw new Error(`Invalid renderingStatus: ${String(state.renderingStatus)}`);
    }
    if (!validTimestamp(state.createdAt)) {
      throw new Error("Cannot reconstitute a RenderedMessageRecord without a valid createdAt");
    }
    if (state.renderingStatus === "rendered") {
      if (typeof state.text !== "string" || state.preserved === undefined) {
        throw new Error("A rendered RenderedMessageRecord requires text and preservation flags");
      }
    } else {
      if (!Array.isArray(state.failures) || state.failures.length === 0 || state.text !== undefined) {
        throw new Error("A failed RenderedMessageRecord requires failures and no text");
      }
    }
    if (state.supersededBy !== undefined && String(state.supersededBy) === String(state.id)) {
      throw new Error("supersededBy must not be self-referential");
    }
    if (state.revisedFrom !== undefined && String(state.revisedFrom) === String(state.id)) {
      throw new Error("revisedFrom must not be self-referential");
    }
    if (!Array.isArray(state.reviews)) {
      throw new Error("Cannot reconstitute a RenderedMessageRecord without a reviews array");
    }
    const reviews = state.reviews.map((r) => renderReview(r)); // re-validate each appended review
    if (state.renderingStatus === "failed" && reviews.some((r) => r.decision === "approved-for-display")) {
      throw new Error("A failed RenderedMessageRecord cannot carry an approved-for-display review");
    }
    return new RenderedMessageRecord({ ...state, reviews });
  }
}
