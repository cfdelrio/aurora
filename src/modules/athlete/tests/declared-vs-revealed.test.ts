// Implementation 007 — DEFINING NEGATIVE TESTS: declared purpose is the athlete's; revealed
// behavior is a different thing and can never silently become a purpose.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Athlete, purpose, revealedPurposeSignal } from "../index.ts";
import type { PurposeSource } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

test("a purpose version can only be created from an athlete-sourced declaration", () => {
  // The only accepted sources are athlete-declared / athlete-accepted.
  const ok: PurposeSource[] = ["athlete-declared", "athlete-accepted"];
  for (const source of ok) {
    const p = purpose({ statement: "x", source, effectiveAt: T("2026-01-01T00:00:00.000Z") });
    assert.equal(p.source, source);
  }
  // An inferred/system source is not part of the type and is rejected at runtime if forced.
  assert.throws(() =>
    purpose({
      statement: "x",
      source: "inferred" as unknown as PurposeSource,
      effectiveAt: T("2026-01-01T00:00:00.000Z"),
    }),
  );
});

test("revealed behavior is not a Purpose and carries no path to change purpose", () => {
  const signal = revealedPurposeSignal("rides easy despite a race-prep purpose", T("2026-02-01T00:00:00.000Z"));
  // structurally: a RevealedPurposeSignal has no statement/source/status fields of a Purpose
  const bag = signal as unknown as Record<string, unknown>;
  assert.equal(bag["status"], undefined);
  assert.equal(bag["source"], undefined);
  assert.equal(bag["statement"], undefined);

  // and it cannot be passed where a Purpose is required (changePurpose takes a Purpose)
  const a = Athlete.create({ identityRef: "athlete:1" }).declarePurpose(
    purpose({ statement: "race prep", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }),
  );
  assert.throws(() => a.changePurpose(signal as unknown as ReturnType<typeof purpose>));
});

test("declared purpose is not replaced by behavior; the athlete must declare/accept a change", () => {
  const a = Athlete.create({ identityRef: "athlete:1" }).declarePurpose(
    purpose({ statement: "race prep", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }),
  );
  // a real change requires an athlete-sourced Purpose
  const b = a.changePurpose(
    purpose({ statement: "just enjoy riding", source: "athlete-accepted", effectiveAt: T("2026-02-01T00:00:00.000Z") }),
    "life-change",
  );
  assert.equal(b.currentPurpose()?.statement, "just enjoy riding");
  assert.equal(b.currentPurpose()?.source, "athlete-accepted");
});
