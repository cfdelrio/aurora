// operator-runtime tests (Implementation 043-F2): the in-`src` caller-module runner. It validates the F1
// contract on an ALREADY-LOADED caller module, invokes the caller factory, and runs a session ONLY through
// runOperatorSession (injected here as a fake — no live DB/S3, no real runtime). No dynamic import here (that
// stays in the out-of-`src` executable, verified by a static guard).
//
//   caller module ≠ JSON command API · caller factory ≠ Aurora whole-core composer ·
//   runOperatorSession ≠ offlineReflectionRuntime direct call · OperatorSessionEnvelope ≠ raw outcome.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { timestamp } from "../../shared-kernel/time.ts";
import {
  runOperatorSessionFromCallerModule,
  type OperatorRuntimeBundle,
  type OperatorSessionModuleRunnerDeps,
} from "../deployment/operator-session-module-runner.ts";
import {
  InMemoryTrainingSessionRepository,
  InMemoryOperatorSessionRunRepository,
  InMemoryOperatorSessionEnvelopeRepository,
  InMemoryDecisionCaptureLinkRepository,
  FakeTrainingArtifactObjectStore,
  FakeRowStoreClient,
  FakeBlobStoreClient,
  trainingSessionRecord,
} from "../index.ts";
import type { TrainingSessionId, OperatorRunResult } from "../index.ts";
import type { OperatorSessionEnvelope } from "../../modules/application-orchestration/index.ts";

const T = (iso: string) => timestamp(iso);

function validRequest(): Record<string, unknown> {
  return {
    trainingSessionId: "training:1",
    athleteRef: "athlete:1",
    operatorRef: "operator:1",
    renderingRequest: { kind: "support-renderable" },
    runId: "run:1",
    envelopeRecordId: "envelope:1",
    decisionCaptureLinkId: "link:1",
    startedAt: T("2026-06-30T08:01:00.000Z"),
    completedAt: T("2026-06-30T08:01:05.000Z"),
    recordedAt: T("2026-06-30T08:01:06.000Z"),
  };
}

async function freshBundle(seedTraining: boolean): Promise<OperatorRuntimeBundle> {
  const trainingSessions = new InMemoryTrainingSessionRepository();
  if (seedTraining) {
    await trainingSessions.save(
      trainingSessionRecord({ id: "training:1" as TrainingSessionId, athleteRef: "athlete:1", source: "garmin", recordedAt: T("2026-06-30T08:00:00.000Z") }),
    );
  }
  return {
    rowStore: new FakeRowStoreClient(),
    blobStore: new FakeBlobStoreClient(),
    repositories: {
      trainingSessions,
      runs: new InMemoryOperatorSessionRunRepository(),
      envelopes: new InMemoryOperatorSessionEnvelopeRepository(),
      decisionLinks: new InMemoryDecisionCaptureLinkRepository(),
    },
    artifactStore: new FakeTrainingArtifactObjectStore(),
  };
}

function recordingRunner() {
  const calls: { command: unknown; deps: unknown }[] = [];
  const deps: OperatorSessionModuleRunnerDeps = {
    runOperatorSession: async (command, runDeps) => {
      calls.push({ command, deps: runDeps });
      const result: OperatorRunResult = {
        status: "completed",
        trainingSessionRef: command.trainingSessionId,
        runRef: command.runId,
        envelopeRecordRef: command.envelopeRecordId,
        decisionCaptureLinkRef: command.decisionCaptureLinkId,
        envelope: { status: "reflection-ready" } as unknown as OperatorSessionEnvelope,
      };
      return result;
    },
  };
  return { calls, deps };
}

// --- happy path -------------------------------------------------------------------------------------

test("1/7 valid module + factory → runs via runOperatorSession and returns safe refs (the caller supplies command/deps)", async () => {
  const bundle = await freshBundle(true);
  const runner = recordingRunner();
  let bundleSeen: unknown;
  const callerModule = {
    operatorSessionRequest: validRequest(),
    createOperatorSession: (b: unknown) => { bundleSeen = b; return { command: { marker: "caller-command" }, deps: { marker: "caller-deps" } }; },
  };
  const result = await runOperatorSessionFromCallerModule(callerModule, bundle, runner.deps);
  assert.equal(result.status, "completed");
  if (result.status !== "completed") return;
  assert.equal(result.trainingSessionRef, "training:1");
  assert.equal(result.runRef, "run:1");
  assert.equal(result.envelopeRecordRef, "envelope:1");
  assert.equal(result.decisionCaptureLinkRef, "link:1");
  assert.equal(result.sessionStatus, "reflection-ready");
  // runOperatorSession was the session-processing call, built from envelope ids + the caller's command/deps
  assert.equal(runner.calls.length, 1);
  const cmd = runner.calls[0]!.command as { runId: string; session: { command: unknown; deps: unknown } };
  assert.equal(cmd.runId, "run:1");
  assert.deepEqual(cmd.session.command, { marker: "caller-command" });
  assert.deepEqual(cmd.session.deps, { marker: "caller-deps" });
  assert.ok(bundleSeen, "the caller factory received the assembled bundle");
});

test("15/16 the run result is safe refs/status only — no reflection text / raw outcome", async () => {
  const bundle = await freshBundle(true);
  const runner = recordingRunner();
  const callerModule = { operatorSessionRequest: validRequest(), createOperatorSession: () => ({ command: {}, deps: {} }) };
  const result = await runOperatorSessionFromCallerModule(callerModule, bundle, runner.deps);
  const json = JSON.stringify(result).toLowerCase();
  for (const banned of ["reflection.text", "reflectiontext", "rawoutcome", "provideroutput", "hiddenreasoning", "bearer", "athletedecision"]) {
    assert.equal(json.includes(banned), false, `run result must not contain '${banned}'`);
  }
});

// --- safe failures ----------------------------------------------------------------------------------

test("2/3 invalid or missing request fails safely (before running)", async () => {
  const bundle = await freshBundle(true);
  const runner = recordingRunner();
  const noRequest = { createOperatorSession: () => ({ command: {}, deps: {} }) };
  assert.equal((await runOperatorSessionFromCallerModule(noRequest, bundle, runner.deps)).status, "invalid-request");
  const polluted = { operatorSessionRequest: { ...validRequest(), athleteDecision: { choice: "rest" } }, createOperatorSession: () => ({ command: {}, deps: {} }) };
  assert.equal((await runOperatorSessionFromCallerModule(polluted, bundle, runner.deps)).status, "invalid-request");
  assert.equal(runner.calls.length, 0, "no session runs on invalid request");
});

test("4 missing/invalid caller factory fails safely", async () => {
  const bundle = await freshBundle(true);
  const runner = recordingRunner();
  const noFactory = { operatorSessionRequest: validRequest() };
  assert.equal((await runOperatorSessionFromCallerModule(noFactory, bundle, runner.deps)).status, "invalid-factory");
  const badFactory = { operatorSessionRequest: validRequest(), createOperatorSession: "not-a-function" };
  assert.equal((await runOperatorSessionFromCallerModule(badFactory, bundle, runner.deps)).status, "invalid-factory");
  assert.equal(runner.calls.length, 0);
});

test("5 invalid factory result (missing command/deps) fails safely", async () => {
  const bundle = await freshBundle(true);
  const runner = recordingRunner();
  const badResult = { operatorSessionRequest: validRequest(), createOperatorSession: () => ({ command: {} }) };
  assert.equal((await runOperatorSessionFromCallerModule(badResult, bundle, runner.deps)).status, "invalid-factory-result");
  assert.equal(runner.calls.length, 0, "no session runs on invalid factory result");
});

test("6 missing training session fails safely BEFORE running or invoking the factory", async () => {
  const bundle = await freshBundle(false); // not seeded
  const runner = recordingRunner();
  let factoryCalled = false;
  const callerModule = { operatorSessionRequest: validRequest(), createOperatorSession: () => { factoryCalled = true; return { command: {}, deps: {} }; } };
  const result = await runOperatorSessionFromCallerModule(callerModule, bundle, runner.deps);
  assert.equal(result.status, "training-session-not-found");
  assert.equal(runner.calls.length, 0);
  assert.equal(factoryCalled, false, "factory must not be invoked when the training session is missing");
});

// --- static: dynamic import stays in the out-of-`src` executable, not the in-`src` runner --------------

test("the in-`src` runner does no dynamic import / env read / SDK / delivery (that stays out-of-`src`)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "..", "deployment", "operator-session-module-runner.ts"), "utf8");
  for (const forbidden of ["import(", "require(", "readFileSync", "@aws-sdk", 'from "pg"', "invokeOperatorSession(", "offlineReflectionRuntime(", "deliver(", "parseGarmin"]) {
    assert.equal(src.includes(forbidden), false, `runner must not contain '${forbidden}'`);
  }
  assert.equal(new RegExp("process" + "\\.env").test(src), false, "runner reads no process.env");
  // the only session-processing seam it uses is runOperatorSession
  assert.ok(src.includes("runOperatorSession"), "runner uses runOperatorSession");
});
