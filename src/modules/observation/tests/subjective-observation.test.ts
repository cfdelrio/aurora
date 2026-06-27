// Spec 001 UC2 — athlete self-report enters as SubjectiveObservation, verbatim.

import { test } from "node:test";
import assert from "node:assert/strict";

import { recordObservationSet, subjectiveObservation, qualityComplete } from "../index.ts";
import { athleteProvenance } from "./helpers.ts";

test("preserves the athlete's words verbatim", () => {
  const words = "I felt unusually heavy and something in my shoulder didn't feel right.";
  const obs = subjectiveObservation({
    provenance: athleteProvenance(),
    quality: qualityComplete("athlete-reported"),
    words,
  });

  assert.equal(obs.kind, "subjective");
  assert.equal(obs.words, words);
  assert.equal(obs.provenance.source, "athlete-report");
});

test("self-report is neither marked true/confirmed nor discarded as noise", () => {
  const obs = subjectiveObservation({
    provenance: athleteProvenance(),
    quality: qualityComplete("athlete-reported"),
    words: "I felt ready despite the data.",
  });

  // no truth/confirmation field exists
  const bag = obs as unknown as Record<string, unknown>;
  assert.equal(bag["confirmed"], undefined);
  assert.equal(bag["isTrue"], undefined);
  // it is retained, carrying quality (not discarded)
  assert.equal(obs.quality.status, "complete");
});

test("one report may yield multiple subjective observations, each attributed", () => {
  const set = recordObservationSet({
    occasion: "2026-01-01-report",
    observations: [
      {
        kind: "subjective",
        provenance: athleteProvenance(),
        quality: qualityComplete("athlete-reported"),
        words: "My shoulder hurt.",
      },
      {
        kind: "subjective",
        provenance: athleteProvenance(),
        quality: qualityComplete("athlete-reported"),
        words: "I slept badly.",
      },
    ],
  });

  const subjective = set.active().filter((o) => o.kind === "subjective");
  assert.equal(subjective.length, 2);
  for (const o of subjective) {
    assert.equal(o.provenance.source, "athlete-report");
  }
});

test("an inquiry response retains a link back to the prompting question", () => {
  const obs = subjectiveObservation({
    provenance: athleteProvenance(),
    quality: qualityComplete("athlete-reported"),
    words: "I stopped because something felt wrong.",
    inquiryRef: "inquiry:why-stopped:001",
  });
  assert.equal(obs.inquiryRef, "inquiry:why-stopped:001");
});
