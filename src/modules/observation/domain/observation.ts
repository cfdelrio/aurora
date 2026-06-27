// observation domain: the immutable record that something was recorded/reported/detected.
//
// NEGATIVE CAPABILITY (the point of this slice):
// An Observation has NO field that can hold an interpretation. There is no slot for
// fatigue, readiness, impact, "isHard", a score, or any meaning. Meaning is not
// merely untested here — it is unrepresentable. A measurement's `quantity` names the
// raw physical thing recorded ("heart-rate", "power"), never what it means.

import type { ObservationId } from "../../../shared-kernel/ids.ts";
import { newObservationId } from "../../../shared-kernel/ids.ts";
import type { Provenance } from "../../../shared-kernel/provenance.ts";
import { provenance as buildProvenance } from "../../../shared-kernel/provenance.ts";
import type { ProvenanceInput } from "../../../shared-kernel/provenance.ts";
import type { ObservationQuality } from "./observation-quality.ts";

/** A raw measured value. `quantity` is the physical thing recorded, not an interpretation. */
export interface Measurement {
  readonly quantity: string;
  readonly magnitude: number;
  readonly unit: string;
}

interface ObservationBase {
  readonly id: ObservationId;
  readonly provenance: Provenance;
  readonly quality: ObservationQuality;
}

export interface MeasuredObservation extends ObservationBase {
  readonly kind: "measured";
  readonly measurement: Measurement;
}

export interface SubjectiveObservation extends ObservationBase {
  readonly kind: "subjective";
  /** the athlete's words, preserved verbatim, never altered */
  readonly words: string;
  /** optional link back to a prompting inquiry (shape only; inquiries are out of scope) */
  readonly inquiryRef?: string;
}

export interface MissingDataObservation extends ObservationBase {
  readonly kind: "missing-data";
  /** what was expected and absent */
  readonly expected: string;
}

export type Observation = MeasuredObservation | SubjectiveObservation | MissingDataObservation;

function resolveProvenance(input: Provenance | ProvenanceInput): Provenance {
  // Always pass through the smart constructor so provenance can never be lost or partial.
  return buildProvenance(input);
}

function requireQuality(quality: ObservationQuality): ObservationQuality {
  if (quality === undefined || quality === null) {
    throw new Error("An Observation cannot be created without ObservationQuality");
  }
  return quality;
}

export interface MeasuredObservationInput {
  readonly id?: ObservationId;
  readonly provenance: Provenance | ProvenanceInput;
  readonly quality: ObservationQuality;
  readonly measurement: Measurement;
}

export function measuredObservation(input: MeasuredObservationInput): MeasuredObservation {
  const measurement = input.measurement;
  if (
    measurement === undefined ||
    typeof measurement.quantity !== "string" ||
    typeof measurement.magnitude !== "number" ||
    typeof measurement.unit !== "string"
  ) {
    throw new Error("MeasuredObservation requires measurement { quantity, magnitude, unit }");
  }
  return Object.freeze({
    kind: "measured",
    id: input.id ?? newObservationId(),
    provenance: resolveProvenance(input.provenance),
    quality: requireQuality(input.quality),
    measurement: Object.freeze({
      quantity: measurement.quantity,
      magnitude: measurement.magnitude,
      unit: measurement.unit,
    }),
  });
}

export interface SubjectiveObservationInput {
  readonly id?: ObservationId;
  readonly provenance: Provenance | ProvenanceInput;
  readonly quality: ObservationQuality;
  readonly words: string;
  readonly inquiryRef?: string;
}

export function subjectiveObservation(input: SubjectiveObservationInput): SubjectiveObservation {
  if (typeof input.words !== "string" || input.words.length === 0) {
    throw new Error("SubjectiveObservation requires the athlete's verbatim words");
  }
  const base = {
    kind: "subjective" as const,
    id: input.id ?? newObservationId(),
    provenance: resolveProvenance(input.provenance),
    quality: requireQuality(input.quality),
    words: input.words,
  };
  // exactOptionalPropertyTypes: only attach inquiryRef when present.
  return Object.freeze(
    input.inquiryRef === undefined ? base : { ...base, inquiryRef: input.inquiryRef },
  );
}

export interface MissingDataObservationInput {
  readonly id?: ObservationId;
  readonly provenance: Provenance | ProvenanceInput;
  readonly quality: ObservationQuality;
  readonly expected: string;
}

export function missingDataObservation(
  input: MissingDataObservationInput,
): MissingDataObservation {
  if (typeof input.expected !== "string" || input.expected.length === 0) {
    throw new Error("MissingDataObservation requires a non-empty 'expected' description");
  }
  return Object.freeze({
    kind: "missing-data",
    id: input.id ?? newObservationId(),
    provenance: resolveProvenance(input.provenance),
    quality: requireQuality(input.quality),
    expected: input.expected,
  });
}
