// Implementation 010 — ObservationSet round-trip through a port + in-memory adapter.
// Persistence preserves the domain object; it never becomes domain authority.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryObservationSetRepository,
  ObservationSet,
  measuredObservation,
  missingDataObservation,
  qualityComplete,
  subjectiveObservation,
} from "../index.ts";
import type { ObservationSetState } from "../index.ts";
import { provenance } from "../../../shared-kernel/provenance.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function prov(reference: string) {
  return provenance({
    source: "device",
    captureTime: T("2026-01-01T07:00:00.000Z"),
    recordingTime: T("2026-01-01T07:05:00.000Z"),
    reference,
  });
}

function buildSet(): ObservationSet {
  const measured = measuredObservation({
    provenance: prov("device:hr"),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 168, unit: "bpm" },
  });
  const subjective = subjectiveObservation({
    provenance: { source: "athlete-report", captureTime: T("2026-01-01T08:00:00.000Z"), recordingTime: T("2026-01-01T08:01:00.000Z"), reference: "report:1" },
    quality: qualityComplete(),
    words: "felt heavy",
  });
  const missing = missingDataObservation({
    provenance: prov("device:power"),
    quality: { status: "missing", reason: "power dropped" },
    expected: "power",
  });
  const replacement = measuredObservation({
    provenance: prov("device:hr-2"),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 170, unit: "bpm" },
  });
  return ObservationSet.create({ occasion: "ride", expected: ["heart-rate", "power"] })
    .add(measured)
    .add(subjective)
    .add(missing)
    .supersede(measured.id, replacement, "device recalibrated", T("2026-01-01T09:00:00.000Z"));
}

test("ObservationSet round-trips: id, observations, provenance/quality, active/superseded survive", () => {
  const repo = new InMemoryObservationSetRepository();
  const set = buildSet();
  repo.save(set);

  const loaded = repo.findById(set.id);
  assert.ok(loaded);
  assert.equal(String(loaded.id), String(set.id));
  assert.equal(loaded.occasion, "ride");
  assert.equal(loaded.observations.length, set.observations.length);
  // active vs superseded behavior preserved
  assert.equal(loaded.active().length, set.active().length);
  assert.equal(loaded.supersessions.length, 1);
  // provenance + quality survive
  const measured = loaded.active().find((o) => o.kind === "measured");
  assert.ok(measured);
  assert.ok(measured.provenance.reference.length > 0);
  assert.equal(measured.quality.status, "complete");
  // subjective + missing-data kinds survive
  assert.ok(loaded.observations.some((o) => o.kind === "subjective"));
  assert.ok(loaded.observations.some((o) => o.kind === "missing-data"));
});

test("exists reflects save; two finds return independent objects (mutation isolation)", () => {
  const repo = new InMemoryObservationSetRepository();
  const set = buildSet();
  assert.equal(repo.exists(set.id), false);
  repo.save(set);
  assert.equal(repo.exists(set.id), true);

  const a = repo.findById(set.id);
  const b = repo.findById(set.id);
  assert.ok(a && b);
  assert.notEqual(a, b); // independent instances
  // mutating a retrieved copy's exported state must not affect the store
  const stateA = a.toState() as unknown as { observations: unknown[] };
  // toState arrays are frozen; attempting to mutate throws, proving no live internal ref leaks
  assert.throws(() => (stateA.observations as unknown[]).push({}));
  const c = repo.findById(set.id);
  assert.ok(c);
  assert.equal(c.observations.length, set.observations.length);
});

test("reconstitute rejects invalid state (empty occasion)", () => {
  const bad = { id: "x", occasion: "", observations: [], supersessions: [], expected: [] } as unknown as ObservationSetState;
  assert.throws(() => ObservationSet.reconstitute(bad));
});
