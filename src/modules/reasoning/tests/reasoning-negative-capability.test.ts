// THE DEFINING TESTS — Aurora reasons toward a defeasible claim without pretending it found truth.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as reasoningModule from "../index.ts";
import { Hypothesis } from "../index.ts";
import type { Signal } from "../../observation/index.ts";
import {
  contextualFrame,
  measuredObservation,
  ObservationSet,
  qualityComplete,
  signalRejection,
  traceToObservation,
} from "../../observation/index.ts";
import { provenance } from "../../../shared-kernel/provenance.ts";
import { T, aClaim, aScope, declaredFalsifiers } from "./helpers.ts";

const FORBIDDEN_SURFACE =
  /understanding|decision|recommend|warning|athletedecision|voice|impactassessment/i;

test("the reasoning surface exposes no understanding/decision/recommendation/voice symbol", () => {
  for (const name of Object.keys(reasoningModule)) {
    assert.equal(FORBIDDEN_SURFACE.test(name), false, `reasoning must not export '${name}'`);
  }
});

test("there is no standalone EvidenceCase constructor on the public surface", () => {
  const surface = reasoningModule as unknown as Record<string, unknown>;
  for (const name of ["createEvidenceCase", "evidenceCase", "EvidenceCase"]) {
    assert.equal(typeof surface[name], "undefined", `must not provide a constructor '${name}'`);
  }
});

test("a SignalRejection cannot become an EvidenceCase (type-gated; runtime-guarded)", () => {
  const set = ObservationSet.create({ occasion: "x" });
  const obs = measuredObservation({
    provenance: provenance({
      source: "device",
      captureTime: T("2026-01-01T07:00:00.000Z"),
      recordingTime: T("2026-01-01T07:05:00.000Z"),
      reference: "device:fit:r",
    }),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" },
  });
  const rejection = signalRejection({
    trace: traceToObservation(set.id, [obs]),
    frame: contextualFrame(),
    reason: "noise",
    quality: qualityComplete(),
  });

  const h = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() });
  // cast past the compile-time gate to prove the runtime guard also refuses it
  assert.throws(() =>
    h.attachEvidence({
      signal: rejection as unknown as Signal,
      direction: "supports",
      reasoningNote: "should be refused",
      at: T("2026-01-02T09:00:00.000Z"),
    }),
  );
});

test("no understanding / decision / recommendation object is produced by reasoning", () => {
  const surface = reasoningModule as unknown as Record<string, unknown>;
  for (const name of [
    "UnderstandingProfile",
    "DecisionSupportCase",
    "VoiceMode",
    "Recommendation",
    "Warning",
    "AthleteDecision",
    "ImpactAssessment",
  ]) {
    assert.equal(surface[name], undefined, `must not provide '${name}'`);
  }
});
