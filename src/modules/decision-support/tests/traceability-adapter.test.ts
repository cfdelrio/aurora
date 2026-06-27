// Spec 005 — TraceabilityVerification verifies over real reasoning links (does not author them).

import { test } from "node:test";
import assert from "node:assert/strict";

import { verifyTraceability, claimStateOf } from "../index.ts";
import { Hypothesis, falsifier, hypothesisClaim, hypothesisScope } from "../../reasoning/index.ts";
import {
  ObservationSet,
  contextualFrame,
  measuredObservation,
  qualityComplete,
  signal,
  traceToObservation,
} from "../../observation/index.ts";
import { provenance } from "../../../shared-kernel/provenance.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

function aSignal() {
  const obs = measuredObservation({
    provenance: provenance({
      source: "device",
      captureTime: timestamp("2026-01-01T07:00:00.000Z"),
      recordingTime: timestamp("2026-01-01T07:05:00.000Z"),
      reference: "device:fit:1",
    }),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
  });
  const set = ObservationSet.create({ occasion: "ride" }).add(obs);
  return signal({
    trace: traceToObservation(set.id, [obs]),
    frame: contextualFrame(),
    questionTopic: "deviation:heart-rate",
    direction: "above-expected",
    salience: "notable",
    quality: obs.quality,
    source: [obs.provenance.source],
  });
}

test("a hypothesis with linked evidence verifies as complete traceability", () => {
  const h = Hypothesis.open({
    claim: hypothesisClaim("block raised aerobic capacity", "impact"),
    scope: hypothesisScope({ statement: "6-week block" }),
    athleteRef: "athlete:1",
    falsifiers: [falsifier({ condition: "flat retest", status: "declared" })],
  }).attachEvidence({
    signal: aSignal(),
    direction: "supports",
    reasoningNote: "sustained effort beyond the usual",
    at: timestamp("2026-01-02T09:00:00.000Z"),
  });

  const result = verifyTraceability(h);
  assert.equal(result.status, "complete");
  assert.ok(result.resolvedTo && result.resolvedTo.observationIds.length >= 1);
  assert.equal(claimStateOf(h), "supported");
});

test("a hypothesis with no evidence verifies as missing traceability", () => {
  const h = Hypothesis.open({
    claim: hypothesisClaim("x", "impact"),
    scope: hypothesisScope({ statement: "y" }),
    athleteRef: "athlete:1",
    falsifiers: [falsifier({ condition: "z", status: "declared" })],
  });
  assert.equal(verifyTraceability(h).status, "missing");
});
