// THE DEFINING TESTS — Aurora learns from what its hypotheses survived, never confusing
// confidence/repetition/population/volume with understanding, and never producing advice.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as understandingModule from "../index.ts";
import { UnderstandingProfile } from "../index.ts";
import { dim, outcome } from "./helpers.ts";

const FORBIDDEN_SURFACE = /decisionsupport|\bvoicemode\b|recommend|warning|inquiry|athletedecision/i;

test("the understanding surface exposes no decision/recommendation/warning/inquiry/voicemode symbol", () => {
  for (const name of Object.keys(understandingModule)) {
    assert.equal(FORBIDDEN_SURFACE.test(name), false, `understanding must not export '${name}'`);
  }
});

test("no decision/recommendation/voice constructor is provided", () => {
  const surface = understandingModule as unknown as Record<string, unknown>;
  for (const name of [
    "DecisionSupportCase",
    "VoiceMode",
    "Recommendation",
    "Warning",
    "Inquiry",
    "AthleteDecision",
    "ImpactAssessment",
  ]) {
    assert.equal(surface[name], undefined, `must not provide '${name}'`);
  }
});

test("a ReasoningOutcome carries no claim confidence (confidence cannot map to level)", () => {
  const o = outcome({ kind: "supported", dimension: dim() });
  const bag = o as unknown as Record<string, unknown>;
  for (const forbidden of ["confidence", "claimConfidence", "level"]) {
    assert.equal(bag[forbidden], undefined, `ReasoningOutcome must not carry '${forbidden}'`);
  }
});

test("population knowledge (no outcome) never promotes: an untouched profile stays Unknown", () => {
  const d = dim();
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" });
  // a prior/population expectation existing 'elsewhere' produces no ReasoningOutcome here
  assert.equal(p.levelOf(d.key), "Unknown");
});

test("the profile owns no athlete state/capacity and no global score", () => {
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    outcome({ kind: "supported", dimension: dim() }),
  );
  const bag = p as unknown as Record<string, unknown>;
  for (const forbidden of ["state", "capacity", "score", "globalScore", "fitness", "readiness"]) {
    assert.equal(bag[forbidden], undefined, `profile must not own '${forbidden}'`);
  }
});

test("the SafeVoiceCeiling vocabulary is not VoiceMode", () => {
  const a = UnderstandingProfile.initialize({ athleteRef: "athlete:1" })
    .updateFromOutcome(outcome({ kind: "supported", dimension: dim() }))
    .assess(dim().key);
  assert.ok(a);
  // ceiling uses understanding's own vocabulary, never decision-support voice names
  assert.ok(["none", "tentative", "qualified", "confident"].includes(a.safeVoiceCeiling));
  for (const voiceName of ["silence", "reflection", "framing", "warning", "recommendation"]) {
    assert.notEqual(a.safeVoiceCeiling as string, voiceName);
  }
});
