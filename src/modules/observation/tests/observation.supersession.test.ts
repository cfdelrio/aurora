// Spec 001 UC5 — supersession preserves the original and supports "as-of" reconstruction.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ObservationSet, measuredObservation, qualityComplete } from "../index.ts";
import { deviceProvenance, ts } from "./helpers.ts";

function hrAt(magnitude: number, recordingIso: string) {
  return measuredObservation({
    provenance: deviceProvenance({ recordingTime: ts(recordingIso) }),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude, unit: "bpm" },
  });
}

test("supersession keeps the original and records a reason; nothing is overwritten", () => {
  const original = hrAt(210, "2026-01-01T07:05:00.000Z");
  const corrected = hrAt(156, "2026-01-02T09:00:00.000Z");

  const set = ObservationSet.create({ occasion: "ride" })
    .add(original)
    .supersede(original.id, corrected, "device artifact corrected on re-sync", ts("2026-01-02T09:00:00.000Z"));

  // full history retains BOTH
  assert.equal(set.observations.length, 2);
  assert.ok(set.observations.some((o) => o.id === original.id));

  // original is no longer active; correction is
  const active = set.active();
  assert.equal(active.length, 1);
  assert.equal(active[0]?.id, corrected.id);

  // a supersession record with reason exists
  assert.equal(set.supersessions.length, 1);
  assert.equal(set.supersessions[0]?.reason, "device artifact corrected on re-sync");
});

test("as-of reconstruction explains what was known at the time", () => {
  const original = hrAt(210, "2026-01-01T07:05:00.000Z");
  const corrected = hrAt(156, "2026-01-02T09:00:00.000Z");

  const set = ObservationSet.create({ occasion: "ride" })
    .add(original)
    .supersede(original.id, corrected, "corrected", ts("2026-01-02T09:00:00.000Z"));

  // As of Jan 1, only the original was known and active.
  const asOfJan1 = set.activeAsOf(ts("2026-01-01T12:00:00.000Z"));
  assert.equal(asOfJan1.length, 1);
  assert.equal(asOfJan1[0]?.id, original.id);

  // As of Jan 3, the correction is active and the original is superseded.
  const asOfJan3 = set.activeAsOf(ts("2026-01-03T00:00:00.000Z"));
  assert.equal(asOfJan3.length, 1);
  assert.equal(asOfJan3[0]?.id, corrected.id);
});

test("superseding an unknown observation is refused", () => {
  const corrected = hrAt(156, "2026-01-02T09:00:00.000Z");
  const set = ObservationSet.create({ occasion: "ride" });
  assert.throws(() =>
    set.supersede(corrected.id, corrected, "n/a", ts("2026-01-02T09:00:00.000Z")),
  );
});

test("operations return new sets; the prior set is unchanged", () => {
  const a = ObservationSet.create({ occasion: "ride" });
  const b = a.add(hrAt(150, "2026-01-01T07:05:00.000Z"));
  assert.equal(a.observations.length, 0);
  assert.equal(b.observations.length, 1);
});
