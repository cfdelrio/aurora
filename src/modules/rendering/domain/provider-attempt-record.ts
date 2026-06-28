// rendering domain: ProviderAttemptRecord — an append-only, auditable record of ONE provider seam attempt
// (Impl 017). It is AUDITABILITY, NOT AUTHORITY: a safe summary of what happened — status + reasons + refs,
// with NO raw draft / prompt / chain-of-thought, no domain field, and no domain-write handle. It is not a
// RenderedMessage / RenderedMessageRecord / Evidence / Observation / Understanding / AthleteDecision /
// DecisionSupport. Built only through validated create/reconstitute; immutable (Object.freeze).

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { VoiceMode } from "../../decision-support/index.ts";
import type { RenderableKind } from "./renderable-domain-output.ts";
import { isProviderAttemptStatus } from "./provider-attempt-status.ts";
import type { ProviderAttemptStatus } from "./provider-attempt-status.ts";
import { isProviderFailure } from "./provider-failure.ts";
import type { ProviderFailure } from "./provider-failure.ts";
import { RENDERING_FAILURES } from "./rendering-failure.ts";
import type { RenderingFailure } from "./rendering-failure.ts";
import type { ProviderDraftSummary } from "./provider-draft-summary.ts";

declare const providerAttemptRecordIdBrand: unique symbol;
export type ProviderAttemptRecordId = string & { readonly [providerAttemptRecordIdBrand]: true };

export function providerAttemptRecordId(value: string): ProviderAttemptRecordId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("ProviderAttemptRecordId requires a non-empty string");
  }
  return value as ProviderAttemptRecordId;
}

export function newProviderAttemptRecordId(): ProviderAttemptRecordId {
  return crypto.randomUUID() as ProviderAttemptRecordId;
}

export interface ProviderAttemptRequestSummary {
  readonly style?: string;
  readonly locale?: string;
  readonly maxLength?: number;
}

export interface ProviderAttemptRecordState {
  readonly id: ProviderAttemptRecordId;
  readonly renderableOutputRef: string; // = renderable.sourceCaseRef
  readonly terminalOutputKind: RenderableKind;
  readonly voice?: VoiceMode; // domain-selected (read-only)
  readonly requestSummary: ProviderAttemptRequestSummary; // safe constraints only — no prompt/payload dump
  readonly providerAdapterKind: string;
  readonly status: ProviderAttemptStatus;
  readonly providerFailureReason?: ProviderFailure;
  readonly renderingFailureReasons?: readonly RenderingFailure[];
  readonly draftSummary: ProviderDraftSummary;
  readonly producedRenderedMessage: boolean;
  readonly requestedAt: Timestamp;
  readonly completedAt?: Timestamp;
  readonly createdAt: Timestamp;
}

const TERMINAL_KINDS: readonly RenderableKind[] = ["support", "inquiry", "withholding"];
const RECORD_KEYS: readonly string[] = [
  "id",
  "renderableOutputRef",
  "terminalOutputKind",
  "voice",
  "requestSummary",
  "providerAdapterKind",
  "status",
  "providerFailureReason",
  "renderingFailureReasons",
  "draftSummary",
  "producedRenderedMessage",
  "requestedAt",
  "completedAt",
  "createdAt",
];
const REQUEST_SUMMARY_KEYS: readonly string[] = ["style", "locale", "maxLength"];
const DRAFT_SUMMARY_KEYS: readonly string[] = [
  "draftProduced",
  "rawDraftRetained",
  "draftCharacterCount",
  "providerWarningCount",
  "validationFailureCount",
  "renderingFailureReasons",
  "providerFailureReason",
];

function validTimestamp(t: unknown): t is Timestamp {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof (t as Timestamp).epochMillis === "number" &&
    Number.isFinite((t as Timestamp).epochMillis) &&
    typeof (t as Timestamp).iso === "string"
  );
}

function assertNoExtraKeys(obj: object, allowed: readonly string[], where: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new Error(`ProviderAttemptRecord ${where} carries an unexpected key '${key}' (no raw draft / payload bag allowed)`);
    }
  }
}

function isRenderingFailure(value: unknown): value is RenderingFailure {
  return typeof value === "string" && (RENDERING_FAILURES as readonly string[]).includes(value);
}

function validate(state: ProviderAttemptRecordState): void {
  if (state === null || typeof state !== "object") throw new Error("ProviderAttemptRecord requires a state object");
  assertNoExtraKeys(state, RECORD_KEYS, "state");

  if (typeof state.id !== "string" || String(state.id).length === 0) throw new Error("ProviderAttemptRecord requires an id");
  if (typeof state.renderableOutputRef !== "string" || state.renderableOutputRef.length === 0) {
    throw new Error("ProviderAttemptRecord requires a renderableOutputRef");
  }
  if (!TERMINAL_KINDS.includes(state.terminalOutputKind)) {
    throw new Error(`Invalid terminalOutputKind: ${String(state.terminalOutputKind)}`);
  }
  if (!isProviderAttemptStatus(state.status)) {
    throw new Error(`Invalid ProviderAttemptStatus: ${String(state.status)}`);
  }
  if (typeof state.providerAdapterKind !== "string" || state.providerAdapterKind.length === 0) {
    throw new Error("ProviderAttemptRecord requires a providerAdapterKind");
  }
  if (typeof state.producedRenderedMessage !== "boolean") {
    throw new Error("ProviderAttemptRecord.producedRenderedMessage must be a boolean");
  }
  if (state.requestSummary === null || typeof state.requestSummary !== "object") {
    throw new Error("ProviderAttemptRecord requires a requestSummary");
  }
  assertNoExtraKeys(state.requestSummary, REQUEST_SUMMARY_KEYS, "requestSummary");

  // failure reasons
  if (state.providerFailureReason !== undefined && !isProviderFailure(state.providerFailureReason)) {
    throw new Error(`Invalid providerFailureReason: ${String(state.providerFailureReason)}`);
  }
  if (state.renderingFailureReasons !== undefined) {
    if (!Array.isArray(state.renderingFailureReasons) || !state.renderingFailureReasons.every(isRenderingFailure)) {
      throw new Error("renderingFailureReasons must be a list of known RenderingFailure values");
    }
  }

  // draft summary — safe, no raw content
  const ds = state.draftSummary;
  if (ds === null || typeof ds !== "object") throw new Error("ProviderAttemptRecord requires a draftSummary");
  assertNoExtraKeys(ds, DRAFT_SUMMARY_KEYS, "draftSummary");
  if (typeof ds.draftProduced !== "boolean") throw new Error("draftSummary.draftProduced must be a boolean");
  if ((ds as { rawDraftRetained: unknown }).rawDraftRetained !== false) {
    throw new Error("draftSummary.rawDraftRetained must be literal false (no raw draft retention)");
  }

  // timestamps
  if (!validTimestamp(state.requestedAt)) throw new Error("ProviderAttemptRecord requires a valid requestedAt");
  if (!validTimestamp(state.createdAt)) throw new Error("ProviderAttemptRecord requires a valid createdAt");
  if (state.completedAt !== undefined && !validTimestamp(state.completedAt)) {
    throw new Error("ProviderAttemptRecord.completedAt, when present, must be a valid timestamp");
  }

  // status ↔ flags coherence
  switch (state.status) {
    case "validation-passed":
      if (state.producedRenderedMessage !== true) throw new Error("validation-passed requires producedRenderedMessage === true");
      break;
    case "validation-failed":
      if (state.producedRenderedMessage !== false) throw new Error("validation-failed requires producedRenderedMessage === false");
      if (state.renderingFailureReasons === undefined || state.renderingFailureReasons.length === 0) {
        throw new Error("validation-failed requires at least one renderingFailureReason");
      }
      break;
    case "provider-failed":
      if (state.producedRenderedMessage !== false) throw new Error("provider-failed requires producedRenderedMessage === false");
      if (ds.draftProduced !== false) throw new Error("provider-failed requires draftSummary.draftProduced === false");
      if (state.providerFailureReason === undefined) throw new Error("provider-failed requires a providerFailureReason");
      break;
    case "unsafe-request-blocked":
      if (state.producedRenderedMessage !== false) throw new Error("unsafe-request-blocked requires producedRenderedMessage === false");
      if (ds.draftProduced !== false) throw new Error("unsafe-request-blocked requires draftSummary.draftProduced === false");
      break;
    case "requested":
    case "draft-produced":
      // reserved (not produced by the audit this slice); permitted on reconstitute but carry no message
      if (state.producedRenderedMessage !== false) throw new Error(`${state.status} requires producedRenderedMessage === false`);
      break;
  }
}

export class ProviderAttemptRecord {
  readonly id: ProviderAttemptRecordId;
  readonly renderableOutputRef: string;
  readonly terminalOutputKind: RenderableKind;
  readonly voice?: VoiceMode;
  readonly requestSummary: ProviderAttemptRequestSummary;
  readonly providerAdapterKind: string;
  readonly status: ProviderAttemptStatus;
  readonly providerFailureReason?: ProviderFailure;
  readonly renderingFailureReasons?: readonly RenderingFailure[];
  readonly draftSummary: ProviderDraftSummary;
  readonly producedRenderedMessage: boolean;
  readonly requestedAt: Timestamp;
  readonly completedAt?: Timestamp;
  readonly createdAt: Timestamp;

  private constructor(state: ProviderAttemptRecordState) {
    this.id = state.id;
    this.renderableOutputRef = state.renderableOutputRef;
    this.terminalOutputKind = state.terminalOutputKind;
    if (state.voice !== undefined) this.voice = state.voice;
    this.requestSummary = Object.freeze({ ...state.requestSummary });
    this.providerAdapterKind = state.providerAdapterKind;
    this.status = state.status;
    if (state.providerFailureReason !== undefined) this.providerFailureReason = state.providerFailureReason;
    if (state.renderingFailureReasons !== undefined) {
      this.renderingFailureReasons = Object.freeze([...state.renderingFailureReasons]);
    }
    this.draftSummary = Object.freeze({ ...state.draftSummary });
    this.producedRenderedMessage = state.producedRenderedMessage;
    this.requestedAt = state.requestedAt;
    if (state.completedAt !== undefined) this.completedAt = state.completedAt;
    this.createdAt = state.createdAt;
    Object.freeze(this);
  }

  /** The only builder. Validates the full audit invariant set (§7). */
  static create(state: ProviderAttemptRecordState): ProviderAttemptRecord {
    validate(state);
    return new ProviderAttemptRecord(state);
  }

  toState(): ProviderAttemptRecordState {
    return Object.freeze({
      id: this.id,
      renderableOutputRef: this.renderableOutputRef,
      terminalOutputKind: this.terminalOutputKind,
      ...(this.voice !== undefined ? { voice: this.voice } : {}),
      requestSummary: this.requestSummary,
      providerAdapterKind: this.providerAdapterKind,
      status: this.status,
      ...(this.providerFailureReason !== undefined ? { providerFailureReason: this.providerFailureReason } : {}),
      ...(this.renderingFailureReasons !== undefined ? { renderingFailureReasons: this.renderingFailureReasons } : {}),
      draftSummary: this.draftSummary,
      producedRenderedMessage: this.producedRenderedMessage,
      requestedAt: this.requestedAt,
      ...(this.completedAt !== undefined ? { completedAt: this.completedAt } : {}),
      createdAt: this.createdAt,
    });
  }

  /** Rebuild from persisted state, re-validating every audit invariant. Invalid state is rejected. */
  static reconstitute(state: ProviderAttemptRecordState): ProviderAttemptRecord {
    validate(state);
    return new ProviderAttemptRecord(state);
  }
}
