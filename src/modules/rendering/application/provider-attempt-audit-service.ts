// rendering application: auditProviderAttempt — the OBSERVE-ONLY audit of a provider seam attempt. It is a
// pure mapping from an already-computed ProviderRenderOutcome (Impl 017) to a safe ProviderAttemptRecord.
// It does NOT call requestProviderRendering / ProviderAdapter / validateDraft, persists nothing itself,
// retains no raw draft, appends no event, and mutates nothing. It records what happened, never the draft.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import {
  ProviderAttemptRecord,
  newProviderAttemptRecordId,
} from "../domain/index.ts";
import type {
  ProviderAttemptRecordId,
  ProviderAttemptRequestSummary,
  ProviderDraftSummary,
  ProviderAttemptStatus,
  ProviderFailure,
  RenderingFailure,
  RenderingRequest,
} from "../domain/index.ts";
import type { ProviderRenderOutcome } from "./provider-rendering-service.ts";

export interface AuditProviderAttemptInput {
  readonly request: RenderingRequest; // authoritative; for the renderable ref + safe summary
  readonly outcome: ProviderRenderOutcome; // observed (already computed by the caller)
  readonly providerAdapterKind: string; // e.g. provider.kind
  readonly requestedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly createdAt: Timestamp;
  readonly id?: ProviderAttemptRecordId;
}

// failures that mean the request was rejected BEFORE any provider call (provider was not called)
const UNSAFE_REQUEST_REASONS: readonly ProviderFailure[] = [
  "unsupported-style",
  "unsupported-locale",
  "unsafe-provider-request",
];

/** Pure mapping: observe a ProviderRenderOutcome, build a safe ProviderAttemptRecord. Calls no provider. */
export function auditProviderAttempt(input: AuditProviderAttemptInput): ProviderAttemptRecord {
  const { request, outcome, providerAdapterKind, requestedAt, completedAt, createdAt } = input;
  const r = request.renderable;
  const id = input.id ?? newProviderAttemptRecordId();

  const requestSummary: ProviderAttemptRequestSummary = Object.freeze({
    ...(request.style !== undefined ? { style: request.style } : {}),
    ...(request.locale !== undefined ? { locale: request.locale } : {}),
    ...(request.maxLength !== undefined ? { maxLength: request.maxLength } : {}),
  });

  const base = {
    id,
    renderableOutputRef: r.sourceCaseRef,
    terminalOutputKind: r.kind,
    ...(r.voice !== undefined ? { voice: r.voice } : {}),
    requestSummary,
    providerAdapterKind,
    requestedAt,
    completedAt,
    createdAt,
  };

  // 1. rendered → validation-passed (a validated RenderedMessage was produced; its text is NOT stored)
  if (outcome.status === "rendered") {
    const draftSummary: ProviderDraftSummary = Object.freeze({
      draftProduced: true,
      rawDraftRetained: false,
      providerWarningCount: outcome.providerWarnings.length,
    });
    return ProviderAttemptRecord.create({
      ...base,
      status: "validation-passed",
      draftSummary,
      producedRenderedMessage: true,
    });
  }

  // failed branch
  const failure: ProviderFailure = outcome.failure;

  // 2. validation failure (draft existed, validator refused it)
  if (failure === "provider-output-failed-validation") {
    const renderingFailureReasons: readonly RenderingFailure[] = Object.freeze([...(outcome.renderingFailures ?? [])]);
    const draftSummary: ProviderDraftSummary = Object.freeze({
      draftProduced: true,
      rawDraftRetained: false,
      validationFailureCount: renderingFailureReasons.length,
      renderingFailureReasons,
    });
    return ProviderAttemptRecord.create({
      ...base,
      status: "validation-failed",
      renderingFailureReasons,
      draftSummary,
      producedRenderedMessage: false,
    });
  }

  // 3. unsafe request blocked before the provider call
  const status: ProviderAttemptStatus = UNSAFE_REQUEST_REASONS.includes(failure)
    ? "unsafe-request-blocked"
    : "provider-failed"; // 4. provider returned a failure (no usable draft)

  const draftSummary: ProviderDraftSummary = Object.freeze({
    draftProduced: false,
    rawDraftRetained: false,
    providerFailureReason: failure,
  });
  return ProviderAttemptRecord.create({
    ...base,
    status,
    providerFailureReason: failure,
    draftSummary,
    producedRenderedMessage: false,
  });
}
