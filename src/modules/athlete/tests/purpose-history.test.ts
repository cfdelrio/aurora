// Implementation 007 — PurposeHistory is append-only; the future lens changes, the past is preserved.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Athlete, purpose, purposeVersionRefOf } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function athleteWithFirstPurpose(): Athlete {
  return Athlete.create({ identityRef: "athlete:1" }).declarePurpose(
    purpose({
      statement: "prepare for a July gran fondo",
      source: "athlete-declared",
      effectiveAt: T("2026-01-01T00:00:00.000Z"),
    }),
  );
}

test("declaring an initial purpose creates the first PurposeVersion (version 1)", () => {
  const a = athleteWithFirstPurpose();
  assert.equal(a.purposeHistory().length, 1);
  const v1 = a.currentVersion();
  assert.ok(v1);
  assert.equal(v1.version, 1);
  assert.equal(v1.purpose.status, "declared");
  assert.equal(a.currentPurpose()?.statement, "prepare for a July gran fondo");
});

test("changing purpose appends a new PurposeVersion and preserves the previous one", () => {
  const a = athleteWithFirstPurpose();
  const b = a.changePurpose(
    purpose({
      statement: "recover from injury",
      source: "athlete-declared",
      effectiveAt: T("2026-03-01T00:00:00.000Z"),
    }),
    "injury",
  );
  assert.equal(b.purposeHistory().length, 2);
  // previous version remains, unchanged, still readable
  const v1 = b.purposeHistory()[0];
  const v2 = b.purposeHistory()[1];
  assert.equal(v1?.version, 1);
  assert.equal(v1?.purpose.statement, "prepare for a July gran fondo");
  assert.equal(v2?.version, 2);
  assert.equal(v2?.purpose.statement, "recover from injury");
  assert.ok(v2?.supersedesRef, "the new version records what it supersedes");
});

test("current purpose is derived from the latest active version", () => {
  const a = athleteWithFirstPurpose().changePurpose(
    purpose({
      statement: "explore gravel racing",
      source: "athlete-declared",
      effectiveAt: T("2026-04-01T00:00:00.000Z"),
    }),
    "exploration",
  );
  assert.equal(a.currentPurpose()?.statement, "explore gravel racing");
  assert.equal(a.currentVersion()?.version, 2);
});

test("purpose history cannot be overwritten through a normal update (append-only, immutable)", () => {
  const a = athleteWithFirstPurpose();
  const b = a.changePurpose(
    purpose({
      statement: "sustain consistency",
      source: "athlete-declared",
      effectiveAt: T("2026-05-01T00:00:00.000Z"),
    }),
  );
  // the original Athlete is unchanged (immutable-by-operation)
  assert.equal(a.purposeHistory().length, 1);
  assert.equal(a.currentPurpose()?.statement, "prepare for a July gran fondo");
  // the new Athlete added, never replaced
  assert.equal(b.purposeHistory().length, 2);
  // the history array is frozen
  assert.throws(() => {
    (b.purposeHistory() as unknown as { push: (x: unknown) => void }).push({});
  });
});

test("declaring twice is rejected; the first declaration is not silently overwritten", () => {
  const a = athleteWithFirstPurpose();
  assert.throws(
    () =>
      a.declarePurpose(
        purpose({
          statement: "something else",
          source: "athlete-declared",
          effectiveAt: T("2026-02-01T00:00:00.000Z"),
        }),
      ),
    /already declared/,
  );
});

test("a past version is resolvable by ref for as-of queries", () => {
  const a = athleteWithFirstPurpose();
  const first = a.currentVersion();
  assert.ok(first);
  const firstRef = purposeVersionRefOf(first);

  const b = a.changePurpose(
    purpose({
      statement: "new goal",
      source: "athlete-declared",
      effectiveAt: T("2026-06-01T00:00:00.000Z"),
    }),
  );
  const resolved = b.versionByRef(firstRef);
  assert.ok(resolved);
  assert.equal(resolved.version, 1);
  assert.equal(resolved.purpose.statement, "prepare for a July gran fondo");
});
