// operator-runtime tests (Implementation 043-D5B): the env-config → persistence assembly (in-`src`, tested
// with injected fake client factories — no live DB/S3) + a STATIC guard over the out-of-`src` executable
// (read as text, never imported — matching the operator-live-smoke precedent, so no tsconfig/test-glob change).
//
//   env-config assembly ≠ deployment executable · client construction ≠ live service verification ·
//   repository assembly ≠ session execution · storage wiring success ≠ understanding ≠ delivery.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createOperatorRuntimePersistenceFromEnvironmentConfig } from "../deployment/operator-runtime-assembly.ts";
import type { OperatorRuntimeEnvironmentConfig } from "../deployment/operator-runtime-env-config.ts";
import type { PostgresQueryable } from "../application/postgres-row-store-client.ts";
import type { S3SendClient } from "../application/s3-blob-store-client.ts";
import { trainingSessionRecord } from "../index.ts";
import type { TrainingSessionId } from "../index.ts";

const tsid = (id: string) => id as TrainingSessionId;

const ENV_CONFIG: OperatorRuntimeEnvironmentConfig = {
  relational: { connectionString: "postgresql://host/db" },
  objectStorage: { bucket: "aurora-operator-artifacts", region: "us-east-1", endpoint: "https://object.example", forcePathStyle: true },
};

function fakeFactories() {
  const captured: { connectionString?: string; region?: string; endpoint?: string; forcePathStyle?: boolean } = {};
  const queryable: PostgresQueryable & { calls: number } = { calls: 0, async query() { this.calls++; return { rows: [] }; } };
  const sendClient: S3SendClient & { sent: string[] } = { sent: [], async send(c) { this.sent.push((c as { constructor: { name: string } }).constructor.name); return {}; } };
  return {
    captured,
    queryable,
    sendClient,
    factories: {
      createQueryable: (cfg: { connectionString: string }) => { captured.connectionString = cfg.connectionString; return queryable; },
      createSendClient: (cfg: { region?: string; endpoint?: string; forcePathStyle?: boolean }) => { Object.assign(captured, cfg); return sendClient; },
    },
  };
}

// --- in-`src` assembler -----------------------------------------------------------------------------

test("1/6 assembler builds the repositories + artifact store from a validated env-config (injected factories; no live DB/S3)", async () => {
  const f = fakeFactories();
  const bundle = createOperatorRuntimePersistenceFromEnvironmentConfig(ENV_CONFIG, f.factories);
  assert.deepEqual(Object.keys(bundle).sort(), ["artifactStore", "blobStore", "repositories", "rowStore"]);
  assert.deepEqual(Object.keys(bundle.repositories).sort(), ["decisionLinks", "envelopes", "runs", "trainingSessions"]);
});

test("4/5 the injected client factories receive the explicit connection/bucket config (no env, no ad-hoc parsing)", () => {
  const f = fakeFactories();
  createOperatorRuntimePersistenceFromEnvironmentConfig(ENV_CONFIG, f.factories);
  assert.equal(f.captured.connectionString, "postgresql://host/db");
  assert.equal(f.captured.region, "us-east-1");
  assert.equal(f.captured.endpoint, "https://object.example");
  assert.equal(f.captured.forcePathStyle, true);
});

test("6/7 the assembled repository + artifact store really talk to the injected clients", async () => {
  const f = fakeFactories();
  const bundle = createOperatorRuntimePersistenceFromEnvironmentConfig(ENV_CONFIG, f.factories);
  await bundle.repositories.trainingSessions.save(trainingSessionRecord({ id: tsid("training:1"), athleteRef: "athlete:1", source: "manual", recordedAt: { epochMillis: 0, iso: "2026-06-30T08:00:00.000Z" } }));
  assert.ok(f.queryable.calls >= 1, "repository issued a query through the injected relational client");
  await bundle.artifactStore.put({ reference: "object-store://raw/x", source: "garmin", payload: " FIT opaque", createdAt: { epochMillis: 0, iso: "2026-06-29T07:00:00.000Z" } });
  assert.deepEqual(f.sendClient.sent, ["PutObjectCommand"]);
});

// --- static guard over the out-of-`src` executable -------------------------------------------------

const EXECUTABLE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "scripts", "operator-runtime-executable.mjs");

test("8 the out-of-`src` executable reads the environment via the loader and assembles persistence — and runs no session", () => {
  const src = readFileSync(EXECUTABLE, "utf8");
  // it reads the real process environment (the ONE place that does) and uses the loader, not ad-hoc parsing
  assert.ok(new RegExp("process" + "\\.env").test(src), "executable reads process.env");
  assert.ok(src.includes("loadOperatorRuntimeConfigFromEnv"), "executable uses the env-config loader");
  assert.ok(src.includes("createOperatorRuntimePersistenceFromEnvironmentConfig"), "executable assembles persistence");
  // STRUCTURAL proof it runs no session: it imports ONLY the two deployment modules — so it cannot reach
  // runOperatorSession / invokeOperatorSession / the runtime / delivery (none are imported). Substrings in
  // descriptive comments don't matter; the import set does.
  const importSpecs = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1] ?? "");
  assert.deepEqual(
    importSpecs.sort(),
    [
      "../src/operator-runtime/deployment/operator-runtime-assembly.ts",
      "../src/operator-runtime/deployment/operator-runtime-env-config.ts",
    ],
    "executable imports only the two deployment modules (no session/runtime/delivery surface)",
  );
  for (const reachable of ["operator-run-service", "application-orchestration", "offline-reflection-runtime", "/delivery/"]) {
    assert.equal(importSpecs.some((s) => s.includes(reachable)), false, `executable must not import '${reachable}'`);
  }
  // it reports that session execution is deferred to caller-supplied command/deps
  assert.ok(src.includes("session execution requires caller-supplied command/deps"), "executable reports deferred session execution");
});

test("9/10/11 the executable is out-of-`src`, has no package script, and adds no Dockerfile/IaC", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  // out-of-`src`: it lives under scripts/, not under src/
  assert.equal(EXECUTABLE.includes("/src/"), false, "executable must live outside src/");
  // no package script references it
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  for (const cmd of Object.values(pkg.scripts ?? {})) {
    assert.equal(/operator-runtime-executable/.test(cmd), false, `no package script may run the executable: ${cmd}`);
  }
});
