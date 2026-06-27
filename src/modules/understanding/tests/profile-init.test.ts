// Spec 004 UC1/UC2 — initialize profile (no global score); dimension-specific updates.

import { test } from "node:test";
import assert from "node:assert/strict";

import { UnderstandingProfile, dimensionKey } from "../index.ts";
import { dim, outcome } from "./helpers.ts";

test("initializes an UnderstandingProfile with no global score; unobserved dimensions read Unknown", () => {
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" });
  const bag = p as unknown as Record<string, unknown>;
  for (const forbidden of ["score", "globalScore", "understandingScore", "overall"]) {
    assert.equal(bag[forbidden], undefined, `must not have '${forbidden}'`);
  }
  assert.equal(p.levelOf(dimensionKey("aerobic-response", "high-intensity")), "Unknown");
});

test("an outcome updates only the relevant dimension", () => {
  const dA = dim("aerobic-response", "high-intensity");
  const dB = dim("recovery-response", "after-poor-sleep");
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    outcome({ kind: "supported", dimension: dA }),
  );

  assert.notEqual(p.levelOf(dA.key), "Unknown");
  assert.equal(p.levelOf(dB.key), "Unknown"); // untouched
});
