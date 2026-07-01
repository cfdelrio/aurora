// operator-runtime application: RECORD ↔ ROW mappers (Implementation 043-D1).
//
// Pure, zero-dependency, vendor-neutral mappings between operational records and flat storage rows, so a
// future concrete metadata adapter (D2) maps records without inventing its own (drift-prone) shape. Every
// row is built by WHITELIST — the input is never spread — and the envelope is re-projected through the ONE
// shared redaction source (whitelistOperatorSessionEnvelope), so no unsafe field can reach a row:
//
//   storage row ≠ Evidence · OperatorSessionEnvelope row ≠ raw outcome · DecisionCaptureLink row ≠ AthleteDecision ·
//   schema mapping ≠ a schema-change script · storage success ≠ understanding ≠ delivery · Aurora advises, the athlete decides.

import { timestamp } from "../../shared-kernel/time.ts";
import type {
  OperatorSessionEnvelope,
  OperatorSessionDecisionCapture,
} from "../../modules/application-orchestration/index.ts";

import type { StorageRow } from "./operator-runtime-row-store.ts";
import {
  trainingSessionRecord,
  trainingSessionRawArtifactRef,
  type TrainingSessionId,
  type TrainingSessionRecord,
  type TrainingSessionSource,
} from "./training-session-record.ts";
import {
  operatorSessionRunRecord,
  type OperatorSessionRunId,
  type OperatorSessionRunRecord,
} from "./operator-session-run-repository.ts";
import {
  operatorSessionEnvelopeRecord,
  whitelistOperatorSessionEnvelope,
  type OperatorSessionEnvelopeRecord,
  type OperatorSessionEnvelopeRecordId,
} from "./operator-session-envelope-repository.ts";
import {
  decisionCaptureLink,
  type DecisionCaptureLink,
  type DecisionCaptureLinkId,
} from "./decision-capture-link-repository.ts";

// --- row shapes (flat scalar columns; null for absent) ---------------------------------------------

export interface TrainingSessionRow extends StorageRow {
  readonly id: string;
  readonly athlete_ref: string;
  readonly source: string;
  readonly artifact_source: string | null;
  readonly artifact_reference: string | null;
  readonly artifact_media_type: string | null;
  readonly artifact_captured_at_iso: string | null;
  readonly label: string | null;
  readonly captured_at_iso: string | null;
  readonly recorded_at_iso: string;
}

export interface OperatorSessionRunRow extends StorageRow {
  readonly id: string;
  readonly athlete_ref: string;
  readonly training_session_id: string;
  readonly status: string;
  readonly started_at_iso: string;
  readonly completed_at_iso: string | null;
  readonly envelope_record_id: string | null;
}

export interface OperatorSessionEnvelopeRow extends StorageRow {
  readonly id: string;
  readonly run_id: string;
  readonly athlete_ref: string;
  /** the whitelisted OperatorSessionEnvelope as JSON — never the raw outcome */
  readonly envelope_json: string;
  readonly recorded_at_iso: string;
}

export interface DecisionCaptureLinkRow extends StorageRow {
  readonly id: string;
  readonly run_id: string;
  readonly athlete_ref: string;
  readonly capture_kind: string;
  readonly capture_athlete_ref: string;
  readonly capture_sources_json: string;
  readonly created_at_iso: string;
}

// --- column readers --------------------------------------------------------------------------------

function reqStr(row: StorageRow, col: string): string {
  const v = row[col];
  if (typeof v !== "string") throw new Error(`row column '${col}' must be a string`);
  return v;
}
function optStr(row: StorageRow, col: string): string | undefined {
  const v = row[col];
  return typeof v === "string" ? v : undefined;
}

// --- TrainingSessionRecord ↔ row -------------------------------------------------------------------

export function trainingSessionToRow(record: TrainingSessionRecord): TrainingSessionRow {
  return {
    id: String(record.id),
    athlete_ref: record.athleteRef,
    source: record.source,
    artifact_source: record.artifact !== undefined ? record.artifact.source : null,
    artifact_reference: record.artifact !== undefined ? record.artifact.reference : null,
    artifact_media_type: record.artifact?.mediaType ?? null,
    artifact_captured_at_iso: record.artifact?.capturedAt !== undefined ? record.artifact.capturedAt.iso : null,
    label: record.label ?? null,
    captured_at_iso: record.capturedAt !== undefined ? record.capturedAt.iso : null,
    recorded_at_iso: record.recordedAt.iso,
  };
}

export function rowToTrainingSession(row: StorageRow): TrainingSessionRecord {
  const artifactReference = optStr(row, "artifact_reference");
  const artifact =
    artifactReference !== undefined
      ? trainingSessionRawArtifactRef({
          source: reqStr(row, "artifact_source") as TrainingSessionSource,
          reference: artifactReference,
          ...(optStr(row, "artifact_media_type") !== undefined ? { mediaType: reqStr(row, "artifact_media_type") } : {}),
          ...(optStr(row, "artifact_captured_at_iso") !== undefined ? { capturedAt: timestamp(reqStr(row, "artifact_captured_at_iso")) } : {}),
        })
      : undefined;
  return trainingSessionRecord({
    id: reqStr(row, "id") as TrainingSessionId,
    athleteRef: reqStr(row, "athlete_ref"),
    source: reqStr(row, "source") as TrainingSessionSource,
    ...(artifact !== undefined ? { artifact } : {}),
    ...(optStr(row, "label") !== undefined ? { label: reqStr(row, "label") } : {}),
    ...(optStr(row, "captured_at_iso") !== undefined ? { capturedAt: timestamp(reqStr(row, "captured_at_iso")) } : {}),
    recordedAt: timestamp(reqStr(row, "recorded_at_iso")),
  });
}

// --- OperatorSessionRunRecord ↔ row ----------------------------------------------------------------

export function operatorSessionRunToRow(record: OperatorSessionRunRecord): OperatorSessionRunRow {
  return {
    id: String(record.id),
    athlete_ref: record.athleteRef,
    training_session_id: String(record.trainingSessionId),
    status: record.status,
    started_at_iso: record.startedAt.iso,
    completed_at_iso: record.completedAt !== undefined ? record.completedAt.iso : null,
    envelope_record_id: record.envelopeRecordId !== undefined ? String(record.envelopeRecordId) : null,
  };
}

export function rowToOperatorSessionRun(row: StorageRow): OperatorSessionRunRecord {
  return operatorSessionRunRecord({
    id: reqStr(row, "id") as OperatorSessionRunId,
    athleteRef: reqStr(row, "athlete_ref"),
    trainingSessionId: reqStr(row, "training_session_id") as TrainingSessionId,
    status: reqStr(row, "status"),
    startedAt: timestamp(reqStr(row, "started_at_iso")),
    ...(optStr(row, "completed_at_iso") !== undefined ? { completedAt: timestamp(reqStr(row, "completed_at_iso")) } : {}),
    ...(optStr(row, "envelope_record_id") !== undefined ? { envelopeRecordId: reqStr(row, "envelope_record_id") as OperatorSessionEnvelopeRecordId } : {}),
  });
}

// --- OperatorSessionEnvelopeRecord ↔ row -----------------------------------------------------------

export function operatorSessionEnvelopeToRow(record: OperatorSessionEnvelopeRecord): OperatorSessionEnvelopeRow {
  // re-whitelist before serializing — no unsafe field can ride along into the JSON column
  const safe = whitelistOperatorSessionEnvelope(record.envelope);
  return {
    id: String(record.id),
    run_id: String(record.runId),
    athlete_ref: record.athleteRef,
    envelope_json: JSON.stringify(safe),
    recorded_at_iso: record.recordedAt.iso,
  };
}

export function rowToOperatorSessionEnvelope(row: StorageRow): OperatorSessionEnvelopeRecord {
  const parsed = JSON.parse(reqStr(row, "envelope_json")) as OperatorSessionEnvelope;
  // the record factory re-whitelists again on construction (defense in depth)
  return operatorSessionEnvelopeRecord({
    id: reqStr(row, "id") as OperatorSessionEnvelopeRecordId,
    runId: reqStr(row, "run_id") as OperatorSessionRunId,
    athleteRef: reqStr(row, "athlete_ref"),
    envelope: parsed,
    recordedAt: timestamp(reqStr(row, "recorded_at_iso")),
  });
}

// --- DecisionCaptureLink ↔ row ---------------------------------------------------------------------

export function decisionCaptureLinkToRow(record: DecisionCaptureLink): DecisionCaptureLinkRow {
  return {
    id: String(record.id),
    run_id: String(record.runId),
    athlete_ref: record.athleteRef,
    capture_kind: record.capture.kind,
    capture_athlete_ref: record.capture.athleteRef,
    capture_sources_json: JSON.stringify(record.capture.acceptableSources),
    created_at_iso: record.createdAt.iso,
  };
}

export function rowToDecisionCaptureLink(row: StorageRow): DecisionCaptureLink {
  const capture = {
    kind: reqStr(row, "capture_kind"),
    athleteRef: reqStr(row, "capture_athlete_ref"),
    acceptableSources: JSON.parse(reqStr(row, "capture_sources_json")) as unknown,
  } as unknown as OperatorSessionDecisionCapture;
  // decisionCaptureLink refuses any non-invitation capture and whitelists the fields it keeps
  return decisionCaptureLink({
    id: reqStr(row, "id") as DecisionCaptureLinkId,
    runId: reqStr(row, "run_id") as OperatorSessionRunId,
    athleteRef: reqStr(row, "athlete_ref"),
    capture,
    createdAt: timestamp(reqStr(row, "created_at_iso")),
  });
}
