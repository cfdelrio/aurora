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

test("UI-001.4 CurrentState / Capacity / Trajectory are consolidated into one honest 'not-yet-modeled' section naming all three areas — never silent mocks, never repeated three times (Impl 045-D)", () => {
  const vm = assembleAthleteHome({ purposeView: { status: "unknown" }, assessments: [] });
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.equal(vm.notYetModeled.state, "not-yet-modeled");
  assert.equal(vm.notYetModeled.areas.length, 3);
  const labels = vm.notYetModeled.areas.map((a) => a.label);
  assert.ok(labels.some((l) => l.includes("hoy")));
  assert.ok(labels.some((l) => l.includes("capacidad")));
  assert.ok(labels.some((l) => l.includes("cambiando")));
  assert.ok(vm.notYetModeled.note.length > 0);
  // 045-D AC5: no internal domain-model name or repository path in athlete-facing copy
  for (const leak of ["CurrentState", "CapacityProfile", "ImpactAssessment", "docs/domain-modeling", ".md"]) {
    assert.equal(vm.notYetModeled.note.includes(leak), false, `note must not leak '${leak}'`);
  }
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

// --- Product Design Iteration 045-D — concrete storytelling acceptance criteria --------------------

test("UI-001.21 (AC1) the headline states the concrete interpretation itself — not a meta-statement about having one", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.ok(vm.headline.text.includes("tolerancia al trabajo sostenido"));
  assert.equal(vm.headline.text.includes("tiene una interpretación en curso"), false);
});

test("UI-001.22 (AC2) the attention section names the actual concrete observation, traceable to the evidence reasoningNote", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready" || vm.attention.state !== "support") return assert.fail("should be support");
  assert.equal(vm.attention.observation, "HR por encima del rango esperado junto a un reporte subjetivo de pesadez");
});

test("UI-001.23 (AC3) purpose relevance is visible and phrased as relevance, never as an instruction", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready" || vm.attention.state !== "support") return assert.fail("should be support");
  assert.ok(vm.attention.purposeRelevance !== undefined);
  assert.ok(vm.attention.purposeRelevance!.includes("200 mariposa"));
  for (const imperative of ["deberías", "tenés que", "hacé"]) {
    assert.equal(vm.attention.purposeRelevance!.toLowerCase().includes(imperative), false);
  }
});

// --- 045-E surgical pass — Finding 1 (voice) and Finding 2 (purpose relevance depth) ---------------

test("UI-001.27 (045-E Finding 1) the headline speaks directly to the athlete — never a detached third-person subject like 'este atleta'/'the athlete'", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready") return assert.fail("should be ready");
  assert.ok(vm.headline.text.includes("tu tolerancia al trabajo sostenido"));
  for (const detached of ["este atleta", "the athlete", "this athlete", "el atleta", "la atleta"]) {
    assert.equal(vm.headline.text.toLowerCase().includes(detached), false, `headline must not contain '${detached}'`);
  }
});

test("UI-001.28 (045-E Finding 2) purpose relevance connects the observation to the athlete's OWN preparation, not to Aurora's display policy", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready" || vm.attention.state !== "support") return assert.fail("should be support");
  const text = vm.attention.purposeRelevance!;
  // grounded in already-modeled fields: the hypothesis's own "threshold sessions" scope and the
  // declared purpose — not in DecisionOpportunity.whySupportMayHelp's display-policy language.
  assert.ok(text.includes("sesión de umbral") || text.includes("esfuerzo sostenido"));
  assert.ok(text.includes("200 mariposa"));
  assert.equal(text.includes("vale la pena mostrarse"), false, "must not be Aurora's own display-policy sentence");
  assert.equal(text.includes("no dirigirse"), false, "must not be Aurora's own display-policy sentence");
});

test("UI-001.24 (AC4) the concrete interpretation remains visibly defeasible — uncertainty stays explicit, never collapsed to fact", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready" || vm.attention.state !== "support") return assert.fail("should be support");
  assert.equal(vm.attention.uncertaintyVisible, true);
  assert.equal(vm.headline.epistemic, "inferred");
});

test("UI-001.25 (AC5/AC6) the trace summary is human-readable AND still traceable — no gate names, no enum syntax, but a real reason", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready" || vm.attention.state !== "support") return assert.fail("should be support");
  for (const leak of ["Gate:", "EvidenceGate", "UnderstandingGate", "PurposeGate", "RiskGate", "AgencyGate", "pass", "->"]) {
    assert.equal(vm.attention.traceSummary.includes(leak), false, `traceSummary must not leak '${leak}'`);
  }
  assert.ok(vm.attention.traceSummary.length > 20, "traceSummary must carry real content, not a stub");
  assert.equal(vm.attention.revisionCondition, "Esto podría cambiar si: una respuesta normal de HR en la próxima sesión.");
});

test("UI-001.26 (AC9) the understanding dimension label is human Spanish — never the raw internal English key", () => {
  const vm = sampleAthleteHomeViewModel();
  if (vm.state !== "ready" || vm.understanding.state !== "assessed") return assert.fail("should be assessed");
  assert.equal(vm.understanding.items[0]?.dimensionLabel, "tolerancia al trabajo sostenido");
  assert.equal(vm.understanding.items[0]?.reasons.some((r) => r.includes("survived-challenge")), false);
  assert.ok(vm.understanding.items[0]?.reasons[0]?.length ?? 0 > 10);
});
