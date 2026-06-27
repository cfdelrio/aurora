// Spec 004 UC5/UC6/UC7 — demotion, surprise, staleness; Mature demotes; history preserved.

import { test } from "node:test";
import assert from "node:assert/strict";

import { UnderstandingProfile } from "../index.ts";
import { dim, outcome, T } from "./helpers.ts";

function trustedProfile() {
  const d = dim();
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" })
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["heat"] }))
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["altitude"] }));
  return { d, p };
}

test("contradiction demotes one level, preserves history, and records a surprise at established level", () => {
  const { d, p } = trustedProfile();
  assert.equal(p.levelOf(d.key), "Trusted");

  const p2 = p.updateFromOutcome(outcome({ kind: "contradicted", dimension: d, conditions: ["heat"] }));
  assert.equal(p2.levelOf(d.key), "Working"); // demoted one
  const du = p2.dimension(d.key);
  assert.ok(du);
  assert.ok(du.surprises.length >= 1, "a contradiction at an established level is a surprise");
  assert.equal(du.surprises[0]?.kind, "negative");
  assert.ok(du.changes.length >= 1, "history preserved");
});

test("falsification demotes harder and preserves the demotion history", () => {
  const { d, p } = trustedProfile();
  const p2 = p.updateFromOutcome(outcome({ kind: "falsified", dimension: d, conditions: ["heat"] }));
  // Trusted -> two steps down -> Thin
  assert.equal(p2.levelOf(d.key), "Thin");
  const du = p2.dimension(d.key);
  assert.ok(du && du.changes.some((c) => c.reason === "falsification"));
});

test("Mature can demote", () => {
  const d = dim();
  // reach Trusted, get surprised (recording a surprise), then re-earn Trusted -> Mature
  let p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" })
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["heat"] }))
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["altitude"] }));
  assert.equal(p.levelOf(d.key), "Trusted");
  p = p.updateFromOutcome(outcome({ kind: "contradicted", dimension: d, conditions: ["heat"] })); // surprise recorded, demote to Working
  p = p
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["heat"] }))
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["altitude"] }));
  assert.equal(p.levelOf(d.key), "Mature"); // Trusted + a prior recovered surprise

  const p2 = p.updateFromOutcome(outcome({ kind: "falsified", dimension: d, conditions: ["heat"] }));
  assert.notEqual(p2.levelOf(d.key), "Mature"); // Mature is not permanent
});

test("marking stale lowers the safe voice ceiling and preserves history", () => {
  const { d, p } = trustedProfile();
  const before = p.assess(d.key);
  assert.ok(before);
  assert.equal(before.safeVoiceCeiling, "qualified"); // Trusted

  const p2 = p.markStale(d.key, "purpose-change", T("2026-02-01T00:00:00.000Z"));
  const after = p2.assess(d.key);
  assert.ok(after);
  assert.equal(after.staleness.status, "stale");
  assert.equal(after.safeVoiceCeiling, "tentative"); // lowered by staleness
  assert.ok(after.trace.length >= 1, "history/traceability preserved");
});
