// Implementation 010 — Hypothesis round-trip: lifecycle, evidence trace, falsifiers, confidence survive.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  Hypothesis,
  InMemoryHypothesisRepository,
  falsifier,
  hypothesisClaim,
  hypothesisScope,
} from "../index.ts";
import type { HypothesisState } from "../index.ts";
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

const T = (iso: string) => timestamp(iso);

function aSignal() {
  const obs = measuredObservation({
    provenance: provenance({ source: "device", captureTime: T("2026-01-01T07:00:00.000Z"), recordingTime: T("2026-01-01T07:05:00.000Z"), reference: "device:hr" }),
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

function supportedHypothesis(): Hypothesis {
  return Hypothesis.open({
    claim: hypothesisClaim("block raised aerobic capacity", "impact"),
    scope: hypothesisScope({ statement: "6-week block" }),
    athleteRef: "athlete:1",
    falsifiers: [falsifier({ condition: "flat retest", status: "declared" })],
  }).attachEvidence({
    signal: aSignal(),
    direction: "supports",
    reasoningNote: "sustained effort beyond the usual",
    at: T("2026-01-02T09:00:00.000Z"),
  });
}

test("Hypothesis round-trips: state, evidence + trace, falsifiers, confidence survive", () => {
  const repo = new InMemoryHypothesisRepository();
  const h = supportedHypothesis();
  repo.save(h);

  const loaded = repo.findById(h.id);
  assert.ok(loaded);
  assert.equal(loaded.state, "supported");
  assert.equal(loaded.evidence.length, 1);
  assert.equal(loaded.evidence[0]?.direction, "supports");
  // traceability survives: evidence -> signal -> observation roots
  const trace = loaded.evidence[0]?.trace;
  assert.ok(trace && trace.observationIds.length >= 1);
  assert.ok(loaded.falsifiers.some((f) => f.status === "declared"));
  assert.equal(loaded.confidence.level, h.confidence.level);
  assert.equal(loaded.athleteRef, "athlete:1");
});

test("mutation isolation: two finds are independent", () => {
  const repo = new InMemoryHypothesisRepository();
  const h = supportedHypothesis();
  repo.save(h);
  const a = repo.findById(h.id);
  const b = repo.findById(h.id);
  assert.ok(a && b);
  assert.notEqual(a, b);
  assert.notEqual(a.evidence, b.evidence);
});

test("reconstitute rejects an unfalsifiable hypothesis (no falsifier)", () => {
  const h = supportedHypothesis();
  const bad = { ...h.toState(), falsifiers: [] } as unknown as HypothesisState;
  assert.throws(() => Hypothesis.reconstitute(bad));
});
