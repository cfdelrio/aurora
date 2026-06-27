// Spec 002 UC2/UC4/UC5/UC6 — detection produces Signals or auditable rejections.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  contextualFrame,
  detectSignals,
  measuredObservation,
  missingDataObservation,
  observationQuality,
  qualityComplete,
  recordObservationSet,
  subjectiveObservation,
} from "../../index.ts";
import { athleteProvenance, deviceProvenance } from "../helpers.ts";

const HR_RANGE = { quantity: "heart-rate", low: 120, high: 180, unit: "bpm" } as const;
const frameWithRange = () =>
  contextualFrame({ purpose: "build-aerobic", expectedRange: { ...HR_RANGE } });

test("a measured value above the expected range becomes an above-expected Signal", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
      },
    ],
  });

  const [outcome] = detectSignals({ set, frameFor: frameWithRange });
  assert.ok(outcome);
  assert.equal(outcome.outcome, "signal");
  if (outcome.outcome === "signal") {
    assert.equal(outcome.direction, "above-expected");
    assert.equal(outcome.salience, "notable");
    assert.equal(outcome.questionTopic, "deviation:heart-rate");
    assert.deepEqual([...outcome.source], ["device"]);
    // traceable back to the set/observation
    assert.equal(outcome.trace.observationSetId, set.id);
    assert.equal(outcome.trace.observationIds.length, 1);
  }
});

test("a value within the expected range is rejected as expected-normal-variation", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" },
      },
    ],
  });
  const [outcome] = detectSignals({ set, frameFor: frameWithRange });
  assert.equal(outcome?.outcome, "rejection");
  if (outcome?.outcome === "rejection") {
    assert.equal(outcome.reason, "expected-normal-variation");
  }
});

test("without a baseline/expected range, detection rejects with missing-baseline", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
      },
    ],
  });
  const [outcome] = detectSignals({ set, frameFor: () => contextualFrame({ missingContext: ["baseline"] }) });
  assert.equal(outcome?.outcome, "rejection");
  if (outcome?.outcome === "rejection") {
    assert.equal(outcome.reason, "missing-baseline");
  }
});

test("a degraded-but-usable observation still signals, at weak salience, with a limitation", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: observationQuality("partial", "intermittent dropout"),
        measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
      },
    ],
  });
  const [outcome] = detectSignals({ set, frameFor: frameWithRange });
  assert.equal(outcome?.outcome, "signal");
  if (outcome?.outcome === "signal") {
    assert.equal(outcome.salience, "weak");
    assert.ok(outcome.limitation && outcome.limitation.includes("partial"));
  }
});

test("source conflict is preserved, not resolved (rejected source-conflict-unresolved)", () => {
  const set = recordObservationSet({
    occasion: "conflict",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: observationQuality("source-conflicted", "device vs athlete disagree"),
        measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
      },
    ],
  });
  const [outcome] = detectSignals({ set, frameFor: frameWithRange });
  assert.equal(outcome?.outcome, "rejection");
  if (outcome?.outcome === "rejection") {
    assert.equal(outcome.reason, "source-conflict-unresolved");
  }
});

test("missing data signals (direction absent) only when absence matters in context", () => {
  const set = recordObservationSet({
    occasion: "ride-no-hr",
    observations: [
      {
        kind: "missing-data",
        provenance: deviceProvenance({ reference: "device:fit:no-hr" }),
        quality: qualityComplete("HR expected but absent"),
        expected: "heart-rate",
      },
    ],
  });

  // with purpose context -> Signal(absent)
  const withPurpose = detectSignals({ set, frameFor: () => contextualFrame({ purpose: "build-aerobic" }) })[0];
  assert.equal(withPurpose?.outcome, "signal");
  if (withPurpose?.outcome === "signal") {
    assert.equal(withPurpose.direction, "absent");
    assert.equal(withPurpose.questionTopic, "absence:heart-rate");
  }

  // without purpose context -> rejection insufficient-context (never read as "no impact")
  const withoutPurpose = detectSignals({ set, frameFor: () => contextualFrame({ missingContext: ["purpose"] }) })[0];
  assert.equal(withoutPurpose?.outcome, "rejection");
  if (withoutPurpose?.outcome === "rejection") {
    assert.equal(withoutPurpose.reason, "insufficient-context");
  }
});

test("self-report becomes a Signal while the verbatim wording stays traceable", () => {
  const words = "I felt unusually heavy.";
  const set = recordObservationSet({
    occasion: "report",
    observations: [
      {
        kind: "subjective",
        provenance: athleteProvenance(),
        quality: qualityComplete("athlete-reported"),
        words,
      },
    ],
  });

  const [outcome] = detectSignals({ set, frameFor: () => contextualFrame({ purpose: "build-aerobic" }) });
  assert.equal(outcome?.outcome, "signal");
  if (outcome?.outcome === "signal") {
    assert.equal(outcome.questionTopic, "athlete-reported-state");
    assert.deepEqual([...outcome.source], ["athlete-report"]);
    // wording is traceable through the original observation, not copied onto the signal
    const originalId = outcome.trace.observationIds[0];
    const original = set.active().find((o) => o.id === originalId);
    assert.ok(original && original.kind === "subjective");
    if (original && original.kind === "subjective") {
      assert.equal(original.words, words);
    }
  }
});

test("ambiguous self-report (context-missing) is rejected; no Inquiry is created", () => {
  const set = recordObservationSet({
    occasion: "report",
    observations: [
      {
        kind: "subjective",
        provenance: athleteProvenance(),
        quality: observationQuality("context-missing", "no surrounding context"),
        words: "Something felt off.",
      },
    ],
  });
  const [outcome] = detectSignals({ set, frameFor: () => contextualFrame() });
  assert.equal(outcome?.outcome, "rejection");
  if (outcome?.outcome === "rejection") {
    assert.equal(outcome.reason, "insufficient-context");
  }
});
