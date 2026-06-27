// athlete domain: opaque identifiers (module-local).
// Ids are opaque, unique, never reused, never parsed for meaning.

declare const athleteIdBrand: unique symbol;
declare const purposeVersionIdBrand: unique symbol;

export type AthleteId = string & { readonly [athleteIdBrand]: true };
export type PurposeVersionId = string & { readonly [purposeVersionIdBrand]: true };

export function newAthleteId(): AthleteId {
  return crypto.randomUUID() as AthleteId;
}

export function newPurposeVersionId(): PurposeVersionId {
  return crypto.randomUUID() as PurposeVersionId;
}
