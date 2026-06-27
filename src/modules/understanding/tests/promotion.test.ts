// Spec 004 UC3/UC4 — promotion only by survived challenge across >=2 conditions; not by repetition.

import { test } from "node:test";
import assert from "node:assert/strict";

import { UnderstandingProfile } from "../index.ts";
import { dim, outcome } from "./helpers.ts";

test("a supported outcome reaches Working (cautious), not beyond", () => {
  const d = dim();
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    outcome({ kind: "supported", dimension: d, conditions: ["c1"] }),
  );
  assert.equal(p.levelOf(d.key), "Working");
});

test("survived challenge across >=2 distinct conditions promotes to Trusted", () => {
  const d = dim();
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" })
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["heat"] }))
    .updateFromOutcome(outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["altitude"] }));
  assert.equal(p.levelOf(d.key), "Trusted");
});

test("repetition under the SAME condition does NOT promote to Trusted", () => {
  const d = dim();
  let p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" });
  for (let i = 0; i < 5; i++) {
    p = p.updateFromOutcome(
      outcome({ kind: "supported", hadDeclaredFalsifier: true, dimension: d, conditions: ["heat"] }),
    );
  }
  // five survived challenges, all under "heat" -> distinct conditions = 1 -> stays Working
  assert.equal(p.levelOf(d.key), "Working");
});

test("evidence volume alone (many same-condition supported outcomes) does not promote", () => {
  const d = dim();
  let p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" });
  for (let i = 0; i < 10; i++) {
    p = p.updateFromOutcome(outcome({ kind: "supported", dimension: d, conditions: ["baseline"] }));
  }
  assert.equal(p.levelOf(d.key), "Working");
});

test("promoted-to-working-knowledge alone does NOT yield Mature", () => {
  const d = dim();
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    outcome({ kind: "promoted-to-working-knowledge", hadDeclaredFalsifier: true, dimension: d, conditions: ["c1"] }),
  );
  assert.notEqual(p.levelOf(d.key), "Mature");
});
