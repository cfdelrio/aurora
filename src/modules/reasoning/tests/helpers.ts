// reasoning test helpers — build real Signals via the observation public surface.
// (Not a .test. file, so the runner ignores it.)

import { timestamp } from "../../../shared-kernel/time.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";
import { provenance } from "../../../shared-kernel/provenance.ts";
import {
  contextualFrame,
  measuredObservation,
  missingDataObservation,
  ObservationSet,
  observationQuality,
  qualityComplete,
  signal,
  subjectiveObservation,
  traceToObservation,
} from "../../observation/index.ts";
import type { ObservationQuality, Signal } from "../../observation/index.ts";
import { falsifier, hypothesisClaim, hypothesisScope } from "../index.ts";
import type { Falsifier } from "../index.ts";

export const T = (iso: string): Timestamp => timestamp(iso);

function dev(reference = "device:fit:1") {
  return provenance({
    source: "device",
    captureTime: T("2026-01-01T07:00:00.000Z"),
    recordingTime: T("2026-01-01T07:05:00.000Z"),
    reference,
  });
}

function ath(reference = "athlete:report:1") {
  return provenance({
    source: "athlete-report",
    captureTime: T("2026-01-01T08:00:00.000Z"),
    recordingTime: T("2026-01-01T08:01:00.000Z"),
    reference,
  });
}

/** A measured Signal (above-expected vs context), with the set + observation for traceability checks. */
export function measuredBundle(quality: ObservationQuality = qualityComplete()) {
  const observation = measuredObservation({
    provenance: dev(),
    quality,
    measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
  });
  const set = ObservationSet.create({ occasion: "ride" }).add(observation);
  const sig = signal({
    trace: traceToObservation(set.id, [observation]),
    frame: contextualFrame(),
    questionTopic: "deviation:heart-rate",
    direction: "above-expected",
    salience: "notable",
    quality: observation.quality,
    source: [observation.provenance.source],
  });
  return { set, observation, signal: sig };
}

export function measuredSignal(quality?: ObservationQuality): Signal {
  return measuredBundle(quality).signal;
}

export function conflictedSignal(): Signal {
  return measuredBundle(observationQuality("source-conflicted", "device vs athlete disagree")).signal;
}

/** A subjective Signal; returns the set + observation id + verbatim words for traceability checks. */
export function subjectiveBundle(words = "I felt unusually heavy.") {
  const observation = subjectiveObservation({
    provenance: ath(),
    quality: qualityComplete("athlete-reported"),
    words,
  });
  const set = ObservationSet.create({ occasion: "report" }).add(observation);
  const sig = signal({
    trace: traceToObservation(set.id, [observation]),
    frame: contextualFrame({ purpose: "build-aerobic" }),
    questionTopic: "athlete-reported-state",
    direction: "deviates",
    salience: "notable",
    quality: observation.quality,
    source: [observation.provenance.source],
  });
  return { set, observation, words, signal: sig };
}

export function missingDataSignal(): Signal {
  const set = ObservationSet.create({ occasion: "ride-no-hr" });
  const observation = missingDataObservation({
    provenance: dev("device:fit:no-hr"),
    quality: qualityComplete("HR expected but absent"),
    expected: "heart-rate",
  });
  return signal({
    trace: traceToObservation(set.id, [observation]),
    frame: contextualFrame({ purpose: "build-aerobic" }),
    questionTopic: "absence:heart-rate",
    direction: "absent",
    salience: "notable",
    quality: observation.quality,
    source: [observation.provenance.source],
  });
}

export function declaredFalsifiers(): readonly [Falsifier, ...Falsifier[]] {
  return [falsifier({ condition: "a fresh retest shows no change", status: "declared" })];
}

export function aClaim() {
  return hypothesisClaim("this block raised aerobic capacity", "impact");
}

export function aScope() {
  return hypothesisScope({ statement: "the last 6-week block", dimension: "physical", timescale: "accumulated" });
}
