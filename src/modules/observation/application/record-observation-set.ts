// observation application: a coordinator that records an ObservationSet from raw inputs.
// It COORDINATES, it does not reason. It assigns no meaning, runs no detection, infers nothing.
// It only builds immutable, provenance- and quality-bearing observations and appends them to a set.

import {
  measuredObservation,
  missingDataObservation,
  ObservationSet,
  subjectiveObservation,
} from "../domain/index.ts";
import type {
  MeasuredObservationInput,
  MissingDataObservationInput,
  SubjectiveObservationInput,
} from "../domain/index.ts";
import type { ObservationSetId } from "../../../shared-kernel/ids.ts";

export type RawObservationInput =
  | ({ readonly kind: "measured" } & MeasuredObservationInput)
  | ({ readonly kind: "subjective" } & SubjectiveObservationInput)
  | ({ readonly kind: "missing-data" } & MissingDataObservationInput);

export interface RecordObservationSetInput {
  readonly id?: ObservationSetId;
  readonly occasion: string;
  readonly expected?: readonly string[];
  readonly observations: readonly RawObservationInput[];
}

export function recordObservationSet(input: RecordObservationSetInput): ObservationSet {
  let set = ObservationSet.create(
    input.id === undefined
      ? { occasion: input.occasion, expected: input.expected ?? [] }
      : { id: input.id, occasion: input.occasion, expected: input.expected ?? [] },
  );

  for (const raw of input.observations) {
    switch (raw.kind) {
      case "measured":
        set = set.add(measuredObservation(raw));
        break;
      case "subjective":
        set = set.add(subjectiveObservation(raw));
        break;
      case "missing-data":
        set = set.add(missingDataObservation(raw));
        break;
    }
  }

  return set;
}
