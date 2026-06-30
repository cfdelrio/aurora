// operator-runtime tests (Implementation 043-F1): the safe operator session input contract — the request
// envelope + caller-factory type + PURE validators. No module loading, no execution, no env/file/IO. The honest
// carrier for function-bearing deps is a caller factory; JSON/stdin/CLI cannot be that carrier.
//
//   OperatorSessionRequestEnvelope ≠ OfflineReflectionRuntimeCommand ≠ whole-core composer ≠ Garmin parser ·
//   caller-supplied RenderingRequest ≠ recommendation-quality proof · TrainingSessionRecord reference ≠ Evidence.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { timestamp } from "../../shared-kernel/time.ts";
import {
  validateOperatorSessionRequestEnvelope,
  validateOperatorSessionCallerFactory,
  validateOperatorSessionCallerFactoryResult,
} from "../index.ts";

const T = (iso: string) => timestamp(iso);

function validEnvelope(): Record<string, unknown> {
  return {
    trainingSessionId: "training:1",
    athleteRef: "athlete:1",
    operatorRef: "operator:1",
    renderingRequest: { kind: "support-renderable" }, // caller-supplied; presence only — not quality-judged here
    runId: "run:1",
    envelopeRecordId: "envelope:1",
    decisionCaptureLinkId: "link:1",
    startedAt: T("2026-06-30T08:01:00.000Z"),
    completedAt: T("2026-06-30T08:01:05.000Z"),
    recordedAt: T("2026-06-30T08:01:06.000Z"),
  };
}

// --- request envelope -------------------------------------------------------------------------------

test("1/2 a valid request envelope is accepted; it references a TrainingSessionRecord but is not Evidence", () => {
  const result = validateOperatorSessionRequestEnvelope(validEnvelope());
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(String(result.request.trainingSessionId), "training:1");
  const json = JSON.stringify(result.request).toLowerCase();
  for (const notDomain of ["evidence", "observationset", "observation", "signal"]) {
    assert.equal(json.includes(notDomain), false, `envelope must not carry '${notDomain}'`);
  }
});

test("3/4 a caller-supplied renderingRequest is required, and its validation is presence-only (not recommendation quality)", () => {
  const missing = { ...validEnvelope() };
  delete missing["renderingRequest"];
  assert.equal(validateOperatorSessionRequestEnvelope(missing).status, "invalid");
  // a minimal renderingRequest object is accepted — the contract does not judge quality/admissibility here
  const minimal = validateOperatorSessionRequestEnvelope({ ...validEnvelope(), renderingRequest: {} });
  assert.equal(minimal.status, "ok");
});

test("5-10 the envelope rejects raw Garmin payload / parsed metrics / Evidence/ObservationSet/Signal / AthleteDecision / delivery / live-provider+secret", () => {
  const cases: Record<string, unknown>[] = [
    { ...validEnvelope(), rawPayload: " FIT garmin-binary" },
    { ...validEnvelope(), garminMetrics: { hr: 152 } },
    { ...validEnvelope(), evidence: {} },
    { ...validEnvelope(), observationSet: {} },
    { ...validEnvelope(), signal: {} },
    { ...validEnvelope(), athleteDecision: { choice: "rest" } },
    { ...validEnvelope(), delivery: { target: "sink" } },
    { ...validEnvelope(), liveProvider: { endpoint: "https://x" } },
    { ...validEnvelope(), secret: "Bearer sk-123" },
  ];
  for (const c of cases) {
    const result = validateOperatorSessionRequestEnvelope(c);
    assert.equal(result.status, "invalid", `envelope must reject ${Object.keys(c).filter((k) => !(k in validEnvelope())).join(",")}`);
  }
});

test("envelope rejects missing required ids / timestamps", () => {
  const noRun = { ...validEnvelope() };
  delete noRun["runId"];
  assert.equal(validateOperatorSessionRequestEnvelope(noRun).status, "invalid");
  assert.equal(validateOperatorSessionRequestEnvelope({ ...validEnvelope(), startedAt: "nope" }).status, "invalid");
  assert.equal(validateOperatorSessionRequestEnvelope(null).status, "invalid");
});

// --- caller factory + result -----------------------------------------------------------------------

test("11/12/25 the caller factory validator accepts a function and rejects non-functions (JSON/stdin/CLI cannot be the carrier)", () => {
  assert.equal(validateOperatorSessionCallerFactory(() => ({ command: {}, deps: {} })).status, "ok");
  assert.equal(validateOperatorSessionCallerFactory(async () => ({ command: {}, deps: {} })).status, "ok");
  // a JSON string or plain object is NOT an acceptable factory — the function-bearing contract rejects it
  for (const notFn of ['{"command":{}}', { command: {}, deps: {} }, 42, null, undefined]) {
    assert.equal(validateOperatorSessionCallerFactory(notFn).status, "invalid");
  }
});

test("13/14/15 the factory result validator accepts {command,deps} and rejects missing command or deps", () => {
  assert.equal(validateOperatorSessionCallerFactoryResult({ command: {}, deps: {} }).status, "ok");
  assert.equal(validateOperatorSessionCallerFactoryResult({ deps: {} }).status, "invalid");
  assert.equal(validateOperatorSessionCallerFactoryResult({ command: {} }).status, "invalid");
  assert.equal(validateOperatorSessionCallerFactoryResult("not-an-object").status, "invalid");
});

test("16/17/18 validators are pure: synchronous, and they never invoke the factory or any runtime/session seam", () => {
  let called = false;
  const factory = () => { called = true; throw new Error("the validator must not call the factory"); };
  const shape = validateOperatorSessionCallerFactory(factory);
  assert.equal(shape.status, "ok");
  assert.equal(called, false, "validateOperatorSessionCallerFactory must not invoke the factory");
  // synchronous result objects (not Promises)
  assert.equal(validateOperatorSessionRequestEnvelope(validEnvelope()) instanceof Promise, false);
  assert.equal(validateOperatorSessionCallerFactoryResult({ command: {}, deps: {} }) instanceof Promise, false);
});

// --- static purity / boundary ----------------------------------------------------------------------

test("19-23 the contract module loads no module, reads no env/file, parses no Garmin, delivers nothing, creates no AthleteDecision", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "..", "application", "operator-session-request.ts"), "utf8");
  // literal-substring bans (no regex, so parens are safe)
  for (const forbidden of [
    "import(", "require(", "readFileSync", "writeFileSync", "createRequire", "fetch(",
    "runOperatorSession(", "invokeOperatorSession(", "offlineReflectionRuntime(",
    "parseFit", "parseTcx", "parseGarmin", "deliver(", "new AthleteDecision",
  ]) {
    assert.equal(src.includes(forbidden), false, `contract module must not contain '${forbidden}'`);
  }
  assert.equal(new RegExp("process" + "\\.env").test(src), false, "contract module must read no process.env");
});

test("24 the executable remains assemble-only (F1 changes no executable behavior)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const exe = readFileSync(join(here, "..", "..", "..", "scripts", "operator-runtime-executable.mjs"), "utf8");
  assert.ok(exe.includes("session execution requires caller-supplied command/deps"), "executable stays assemble-only");
  assert.equal(exe.includes("runOperatorSession("), false, "executable calls no session runner");
});
