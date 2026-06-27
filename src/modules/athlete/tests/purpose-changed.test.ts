// Implementation 007 — PurposeChanged is a returned/derivable value (no event bus) that records
// the previous and new versions, time, source, and reason. It never rewrites the past.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Athlete, purpose, purposeChanged, purposeVersionRefOf } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function changed(): { a: Athlete; b: Athlete } {
  const a = Athlete.create({ identityRef: "athlete:1" }).declarePurpose(
    purpose({
      statement: "prepare for a July gran fondo",
      source: "athlete-declared",
      effectiveAt: T("2026-01-01T00:00:00.000Z"),
    }),
  );
  const b = a.changePurpose(
    purpose({
      statement: "recover from injury",
      source: "athlete-accepted",
      effectiveAt: T("2026-03-01T00:00:00.000Z"),
    }),
    "injury",
  );
  return { a, b };
}

test("PurposeChanged references both the previous and new versions", () => {
  const { b } = changed();
  const change = b.lastPurposeChange();
  assert.ok(change);
  assert.equal(change.previousVersion, 1);
  assert.equal(change.newVersion, 2);
  const v1 = b.purposeHistory()[0];
  const v2 = b.purposeHistory()[1];
  assert.ok(v1 && v2);
  assert.equal(change.previousRef, purposeVersionRefOf(v1));
  assert.equal(change.newRef, purposeVersionRefOf(v2));
});

test("PurposeChanged records source, time, and reason when present", () => {
  const { b } = changed();
  const change = b.lastPurposeChange();
  assert.ok(change);
  assert.equal(change.source, "athlete-accepted");
  assert.equal(change.at.iso, "2026-03-01T00:00:00.000Z");
  assert.equal(change.reason, "injury");
});

test("there is no PurposeChanged after only the first declaration", () => {
  const { a } = changed();
  assert.equal(a.lastPurposeChange(), undefined);
});

test("purposeChanged is a pure derivation over two versions (does not mutate either)", () => {
  const { b } = changed();
  const v1 = b.purposeHistory()[0];
  const v2 = b.purposeHistory()[1];
  assert.ok(v1 && v2);
  const change = purposeChanged(v1, v2);
  assert.equal(change.newVersion, 2);
  // versions remain frozen / unchanged
  assert.equal(v1.purpose.statement, "prepare for a July gran fondo");
  assert.equal(v2.purpose.statement, "recover from injury");
});
