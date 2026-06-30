// operator-runtime application: the internal OPERATOR RUN SERVICE (Implementation 043-C3).
//
// An internal application service that coordinates the C1 repositories and runs ONE operator-mediated
// session through Aurora's single safe seam — invokeOperatorSession — then persists only the safe
// operator-runtime records. It is NOT a worker executable, NOT a CLI/API, NOT deployment, and — above
// all — NOT a whole-core composer: it assembles no Observation → Signal → Evidence → Hypothesis →
// Rendering, derives no renderable from Garmin artifacts, and constructs no RenderingRequest from raw
// content. The caller supplies a command + dependencies already compatible with invokeOperatorSession;
// this service composes nothing of the core.
//
//   operator run service ≠ worker executable ≠ CLI/API ≠ deployment ≠ whole-core composer ·
//   caller-supplied command ≠ production composition · invokeOperatorSession seam ≠ the underlying runtime ·
//   OperatorSessionEnvelope ≠ raw outcome · reflection-ready ≠ delivered · DecisionCaptureLink ≠ AthleteDecision ·
//   Garmin artifact ≠ truth · TrainingSessionRecord ≠ Evidence · storage success ≠ understanding ·
//   operator service success ≠ athlete decision · Aurora advises, the athlete decides.
//
// The service only ever holds the OperatorSessionEnvelope the seam returns — it never receives the raw
// OfflineReflectionRuntimeOutcome — so reflection.text, raw provider output, hidden reasoning, secrets,
// delivery ids/artifacts, eventRecordIds, and AthleteDecision are structurally unreachable here. Refs +
// timestamps are injected (no Date.now, no crypto here).

import { invokeOperatorSession } from "../../modules/application-orchestration/index.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
  OperatorSessionEnvelope,
} from "../../modules/application-orchestration/index.ts";
import type { Timestamp } from "../../shared-kernel/time.ts";

import type { TrainingSessionId } from "./training-session-record.ts";
import type { TrainingSessionRepository } from "./training-session-repository.ts";
import {
  operatorSessionRunRecord,
  type OperatorSessionRunId,
  type OperatorSessionRunRepository,
} from "./operator-session-run-repository.ts";
import {
  operatorSessionEnvelopeRecord,
  type OperatorSessionEnvelopeRecordId,
  type OperatorSessionEnvelopeRepository,
} from "./operator-session-envelope-repository.ts";
import {
  decisionCaptureLink,
  type DecisionCaptureLinkId,
  type DecisionCaptureLinkRepository,
} from "./decision-capture-link-repository.ts";

/** The safe invocation seam type — defaults to invokeOperatorSession; tests may inject a conforming fake. */
export type OperatorSessionInvoker = <T>(
  command: OfflineReflectionRuntimeCommand<T>,
  deps: OfflineReflectionRuntimeDependencies<T>,
) => Promise<OperatorSessionEnvelope>;

/** Collaborators the service coordinates — repository ports only (no core, no infra). */
export interface OperatorRunServiceDependencies {
  readonly trainingSessions: TrainingSessionRepository;
  readonly runs: OperatorSessionRunRepository;
  readonly envelopes: OperatorSessionEnvelopeRepository;
  readonly decisionLinks: DecisionCaptureLinkRepository;
  /** the run seam — defaults to invokeOperatorSession; never the underlying runtime */
  readonly invoke?: OperatorSessionInvoker;
}

/** A single operator run command. The session command/deps are caller-supplied (no core composition here). */
export interface OperatorRunCommand<TSubmission> {
  readonly trainingSessionId: TrainingSessionId;
  /** injected deterministic refs (no crypto in this layer) */
  readonly runId: OperatorSessionRunId;
  readonly envelopeRecordId: OperatorSessionEnvelopeRecordId;
  readonly decisionCaptureLinkId: DecisionCaptureLinkId;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly recordedAt: Timestamp;
  /** caller-assembled invocation — passed verbatim to the seam; the service composes none of it */
  readonly session: {
    readonly command: OfflineReflectionRuntimeCommand<TSubmission>;
    readonly deps: OfflineReflectionRuntimeDependencies<TSubmission>;
  };
}

export type OperatorRunResultStatus = "completed" | "training-session-not-found";

/** A safe service result: refs/ids + the safe OperatorSessionEnvelope — never the raw runtime outcome. */
export interface OperatorRunResult {
  readonly status: OperatorRunResultStatus;
  readonly trainingSessionRef: TrainingSessionId;
  readonly runRef?: OperatorSessionRunId;
  readonly envelopeRecordRef?: OperatorSessionEnvelopeRecordId;
  readonly decisionCaptureLinkRef?: DecisionCaptureLinkId;
  readonly envelope?: OperatorSessionEnvelope;
}

/**
 * Run one operator-mediated session and persist only safe operator-runtime records:
 *   1. load the TrainingSessionRecord (fail safely if missing — persist nothing);
 *   2. record a started OperatorSessionRunRecord;
 *   3. invoke the session ONLY through the seam (caller-supplied command/deps) → OperatorSessionEnvelope;
 *   4. persist the OperatorSessionEnvelopeRecord (envelope only, re-whitelisted by its factory);
 *   5. update the run record with the envelope status + a ref to the stored envelope;
 *   6. persist a DecisionCaptureLink ONLY when the envelope carries a decision-capture invitation/ref;
 *   7. return refs + the safe envelope (never the raw outcome).
 */
export async function runOperatorSession<TSubmission>(
  command: OperatorRunCommand<TSubmission>,
  deps: OperatorRunServiceDependencies,
): Promise<OperatorRunResult> {
  const trainingSession = await deps.trainingSessions.findById(command.trainingSessionId);
  if (trainingSession === undefined) {
    // safe rejected status — nothing is invoked or persisted
    return Object.freeze({ status: "training-session-not-found", trainingSessionRef: command.trainingSessionId });
  }

  const athleteRef = trainingSession.athleteRef;

  // 2. record the started run (status reflects an in-flight run until the envelope returns)
  await deps.runs.save(
    operatorSessionRunRecord({
      id: command.runId,
      athleteRef,
      trainingSessionId: command.trainingSessionId,
      status: "running",
      startedAt: command.startedAt,
    }),
  );

  // 3. run ONLY through the seam — the service never holds the raw runtime outcome
  const invoke = deps.invoke ?? invokeOperatorSession;
  const envelope = await invoke(command.session.command, command.session.deps);

  // 4. persist the safe envelope (the record factory re-whitelists field-by-field)
  const envelopeRecord = operatorSessionEnvelopeRecord({
    id: command.envelopeRecordId,
    runId: command.runId,
    athleteRef,
    envelope,
    recordedAt: command.recordedAt,
  });
  await deps.envelopes.save(envelopeRecord);

  // 5. update the run with the envelope status + completion + a ref to the stored envelope
  await deps.runs.save(
    operatorSessionRunRecord({
      id: command.runId,
      athleteRef,
      trainingSessionId: command.trainingSessionId,
      status: envelopeRecord.envelope.status,
      startedAt: command.startedAt,
      completedAt: command.completedAt,
      envelopeRecordId: command.envelopeRecordId,
    }),
  );

  // 6. a DecisionCaptureLink is created ONLY for a genuine decision-capture invitation/ref
  let decisionCaptureLinkRef: DecisionCaptureLinkId | undefined;
  if (envelopeRecord.envelope.decisionCapture?.kind === "athlete-decision-invitation") {
    await deps.decisionLinks.save(
      decisionCaptureLink({
        id: command.decisionCaptureLinkId,
        runId: command.runId,
        athleteRef,
        capture: envelopeRecord.envelope.decisionCapture,
        createdAt: command.recordedAt,
      }),
    );
    decisionCaptureLinkRef = command.decisionCaptureLinkId;
  }

  return Object.freeze({
    status: "completed",
    trainingSessionRef: command.trainingSessionId,
    runRef: command.runId,
    envelopeRecordRef: command.envelopeRecordId,
    ...(decisionCaptureLinkRef !== undefined ? { decisionCaptureLinkRef } : {}),
    envelope: envelopeRecord.envelope,
  });
}
