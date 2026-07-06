// UI-001 — Athlete Home view-model assembly tests.
// The assembler is a PURE mapping from real domain outputs to presentation state. These tests
// prove: declared vs. inferred stays visibly separated; missing domain models are stated honestly
// (never mocked); every terminal-output kind renders to a distinct attention state.

import { test } from "node:test";
import assert from "node:assert/strict";

import { assembleAthleteHome } from "../view-model/assemble-athlete-home.ts";
import { sampleAthleteHomeViewModel } from "../sample/athlete-home-sample-scenario.ts";

test("UI-001.1 a declared purpose maps to a 'declared' direction carrying the athlete's exact statement and the 'declared' epistemic marker", () => {
  const vm = assembleAthleteHome({
    purposeView: { status: "declared", statement: "Preparar el 200 mariposa" },
    assessments: [],
  });
  assert.equal(vm.state, "ready");
  if (vm.state !== "ready") return;
  assert.deepEqual(vm.direction, {
    state: "declared",
    statement: "Preparar el 200 mariposa",
    epistemic: "declared",
  });
});

test("UI-001.2 an unknown purpose maps to an honest 'unknown' direction — never a guessed statement", () => {
  const vm = assembleAthleteHome({ purposeView: { status: "unknown" }, assessments: [] });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.direction.state, "unknown");
  assert.equal("statement" in vm.direction, false);
});

test("UI-001.3 an ambiguous purpose stays first-class ambiguous — declared by the athlete, not resolved by Aurora", () => {
  const vm = assembleAthleteHome({
    purposeView: { status: "ambiguous", statement: "quizás aguas abiertas" },
    assessments: [],
  });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.direction.state, "ambiguous");
  assert.equal(vm.direction.epistemic, "declared");
});

test("UI-001.4 CurrentState / Capacity / Trajectory are honest 'not-yet-modeled' sections naming the exact missing domain model — never silent mocks", () => {
  const vm = assembleAthleteHome({ purposeView: { status: "unknown" }, assessments: [] });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.currentState.state, "not-yet-modeled");
  assert.ok(vm.currentState.whatIsMissing.includes("CurrentState"));
  assert.equal(vm.capacity.state, "not-yet-modeled");
  assert.ok(vm.capacity.whatIsMissing.includes("CapacityProfile"));
  assert.equal(vm.trajectory.state, "not-yet-modeled");
  assert.ok(vm.trajectory.whatIsMissing.includes("ImpactAssessment"));
});

test("UI-001.5 zero assessments map to an honest 'no-dimensions' understanding state (insufficient evidence, said plainly)", () => {
  const vm = assembleAthleteHome({ purposeView: { status: "unknown" }, assessments: [] });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.understanding.state, "no-dimensions");
});

test("UI-001.6 no terminal output maps to attention 'none' — Aurora does not manufacture something to say", () => {
  const vm = assembleAthleteHome({ purposeView: { status: "unknown" }, assessments: [] });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.attention.state, "none");
});

test("UI-001.7 a Withholding terminal output surfaces as responsible silence WITH its reason — never hidden, never converted into advice", () => {
  const vm = assembleAthleteHome({
    purposeView: { status: "declared", statement: "x" },
    assessments: [],
    terminalOutput: { outcome: "withholding", reason: "evidencia insuficiente para hablar" },
  });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.attention.state, "withholding");
  if (vm.attention.state !== "withholding") return;
  assert.equal(vm.attention.reason, "evidencia insuficiente para hablar");
  assert.equal(vm.attention.epistemic, "inferred");
});

test("UI-001.8 an Inquiry terminal output maps to a question — a request for the athlete's knowledge, not a directive", () => {
  const vm = assembleAthleteHome({
    purposeView: { status: "declared", statement: "x" },
    assessments: [],
    terminalOutput: {
      outcome: "inquiry",
      question: "¿Cómo dormiste esta semana?",
      whatNeeded: "contexto de recuperación",
      reasons: [],
    },
  });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.attention.state, "inquiry");
  if (vm.attention.state !== "inquiry") return;
  assert.equal(vm.attention.question, "¿Cómo dormiste esta semana?");
});

test("UI-001.9 the sample scenario drives the REAL domain chain end to end and lands on Reflection — the gates, not the UI, chose the voice", () => {
  const vm = sampleAthleteHomeViewModel();
  assert.equal(vm.state, "ready");
  if (vm.state !== "ready") return;
  assert.equal(vm.direction.state, "declared");
  assert.equal(vm.attention.state, "support");
  if (vm.attention.state !== "support") return;
  assert.equal(vm.attention.voice, "Reflection");
  assert.equal(vm.attention.uncertaintyVisible, true);
  assert.equal(vm.understanding.state, "assessed");
  if (vm.understanding.state !== "assessed") return;
  assert.equal(vm.understanding.items[0]?.level, "Working");
  assert.equal(vm.understanding.items[0]?.epistemic, "inferred");
});

test("UI-001.10 every inference-bearing item carries the 'inferred' epistemic marker; the declared purpose never does", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.direction.state === "declared" && vm.direction.epistemic, "declared");
  if (vm.understanding.state === "assessed") {
    for (const item of vm.understanding.items) assert.equal(item.epistemic, "inferred");
  }
  if (vm.attention.state === "support") assert.equal(vm.attention.epistemic, "inferred");
  assert.equal(vm.headline.epistemic, "inferred");
});
