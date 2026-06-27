// shared-kernel: opaque identifiers.
// Ids are opaque, unique, never reused, and never parsed for meaning.

declare const observationIdBrand: unique symbol;
declare const observationSetIdBrand: unique symbol;

export type ObservationId = string & { readonly [observationIdBrand]: true };
export type ObservationSetId = string & { readonly [observationSetIdBrand]: true };

export function newObservationId(): ObservationId {
  return crypto.randomUUID() as ObservationId;
}

export function newObservationSetId(): ObservationSetId {
  return crypto.randomUUID() as ObservationSetId;
}
