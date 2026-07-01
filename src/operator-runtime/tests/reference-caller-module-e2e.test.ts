// operator-runtime tests (Implementation 043-F3): end-to-end wiring proof. It dynamic-imports the REAL
// out-of-`src` reference caller module fixture (via a variable specifier, so tsc leaves it untyped and no
// tsconfig/test-glob change is needed) and drives the full F2 runner path with in-memory repositories + the
// REAL runOperatorSession → invokeOperatorSession → runtime. Deterministic fakes; no live DB/S3, no live
// provider, delivery withheld.
//
//   run proof ≠ delivery ≠ AthleteDecision · OperatorSessionEnvelope ≠ raw outcome · delivery withheld ≠ delivery failure ·
//   caller composes command/deps · Aurora validates + runs; Aurora never presents inference as fact.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { timestamp } from "../../shared-kernel/time.ts";
import { runOperatorSessionFromCallerModule, type OperatorRuntimeBundle } from "../deployment/operator-session-module-runner.ts";
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
import type { TrainingSessionId, OperatorSessionRunId } from "../index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const FIXTURE_PATH = join(repoRoot, "fixtures", "operator-runtime", "reference-caller-module.mjs");

const ALLOWED_ENVELOPE_KEYS = new Set([
  "status", "deliveryWithheld", "rawRetained", "reflectionRef", "reflectionFlags",
  "decisionCapture", "admissionReason", "safeReason", "intakeStatus", "mediation", "traceSummary",
]);

async function bundleWithSeededTraining(): Promise<OperatorRuntimeBundle> {
  const trainingSessions = new InMemoryTrainingSessionRepository();
  await trainingSessions.save(
    trainingSessionRecord({ id: "training:ref-1" as TrainingSessionId, athleteRef: "athlete:ref-1", source: "garmin", recordedAt: timestamp("2026-09-04T09:00:00.000Z") }),
  );
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

// --- end-to-end run through the real chain ---------------------------------------------------------

test("7-14 the real reference caller module runs end-to-end via the F2 runner + real runOperatorSession (no live DB/S3/provider)", async () => {
  // variable specifier → tsc treats the import as untyped (any); the real .mjs fixture loads at runtime
  const spec = pathToFileURL(FIXTURE_PATH).href;
  const callerModule = await import(spec);

  const bundle = await bundleWithSeededTraining();
  const result = await runOperatorSessionFromCallerModule(callerModule, bundle);

  assert.equal(result.status, "completed");
  if (result.status !== "completed") return;

  // 8/9/10 — run + envelope + decision link persisted through the in-memory repositories
  const run = await bundle.repositories.runs.findById("run:ref-1" as OperatorSessionRunId);
  assert.ok(run, "an OperatorSessionRunRecord was persisted");
  assert.deepEqual((await bundle.repositories.envelopes.findByRun("run:ref-1" as OperatorSessionRunId)).map((r) => String(r.id)), ["envelope:ref-1"]);
  assert.deepEqual((await bundle.repositories.decisionLinks.findByRun("run:ref-1" as OperatorSessionRunId)).map((r) => String(r.id)), ["link:ref-1"]);

  // 11/12 — persisted envelope is safe (whitelist) and delivery is withheld
  const stored = await bundle.repositories.envelopes.findById("envelope:ref-1" as never);
  assert.ok(stored);
  for (const key of Object.keys(stored.envelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `stored envelope leaked key '${key}'`);
  }
  assert.equal(stored.envelope.deliveryWithheld, true);
  assert.equal(stored.envelope.rawRetained, false);

  // 11/13/14/15 — nothing unsafe / no AthleteDecision / no derived domain object / no raw outcome anywhere
  const json = (JSON.stringify(result) + JSON.stringify(stored) + JSON.stringify(run)).toLowerCase();
  for (const banned of [
    "reflection.text", "reflectiontext", "rawoutcome", "provideroutput", "hiddenreasoning", "chain-of-thought",
    "bearer", "sk-secret", "deliveryid", "deliveredartifact", "eventrecordids", "athletedecision",
    "evidence", "observationset", "signal",
  ]) {
    assert.equal(json.includes(banned), false, `end-to-end result/records must not contain '${banned}'`);
  }
});

// --- static guard over the out-of-`src` reference fixture ------------------------------------------

test("1-6 the reference fixture has exactly the approved exports and no forbidden imports/behavior", () => {
  const src = readFileSync(FIXTURE_PATH, "utf8");
  // 1/2 — approved exports: a request envelope const + a caller factory FUNCTION (not JSON-only data)
  assert.ok(/export\s+const\s+operatorSessionRequest\b/.test(src), "must export operatorSessionRequest");
  assert.ok(/export\s+(async\s+)?function\s+createOperatorSession\b/.test(src), "must export a createOperatorSession function");
  // 3/4/5/6 — no Garmin parse / delivery / live-provider / core-internal / direct runtime imports
  const importSpecs = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1] ?? "");
  for (const spec of importSpecs) {
    assert.equal(/\/modules\/(observation|reasoning|understanding|decision-support)\//.test(spec), false, `fixture must not import a core-internal module: ${spec}`);
    assert.equal(/\/(delivery)\//.test(spec), false, `fixture must not import delivery: ${spec}`);
    assert.equal(/operator-run-service|operator-session-invocation|offline-reflection-runtime/.test(spec), false, `fixture must not import the runner/seam/runtime: ${spec}`);
  }
  for (const forbidden of ["parseFit", "parseTcx", "parseGarmin", "live-provider", "deliver(", "invokeOperatorSession(", "offlineReflectionRuntime(", "new AthleteDecision", new RegExp("process" + "\\.env").source]) {
    assert.equal(src.includes(forbidden), false, `fixture must not contain '${forbidden}'`);
  }
});

test("16-19 fixture is not under scripts/ ; scripts allowlist stays exactly two; no new package script; executable stays assemble-only default", () => {
  // the fixture lives under fixtures/, not scripts/
  assert.equal(FIXTURE_PATH.includes("/scripts/"), false, "fixture must not live under scripts/");
  assert.ok(FIXTURE_PATH.includes("/fixtures/"), "fixture lives under fixtures/");
  // scripts/ remains exactly the two approved scripts
  assert.deepEqual(readdirSync(join(repoRoot, "scripts")).sort(), ["operator-live-smoke.mjs", "operator-runtime-executable.mjs"]);
  // no package script references the fixture; deps unchanged
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as { scripts?: Record<string, string>; dependencies?: Record<string, string> };
  for (const cmd of Object.values(pkg.scripts ?? {})) {
    assert.equal(/reference-caller-module|fixtures\//.test(cmd), false, `no package script may run the fixture: ${cmd}`);
  }
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["@aws-sdk/client-s3", "pg"], "no new dependency added");
});
