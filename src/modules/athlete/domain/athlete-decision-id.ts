// athlete domain: opaque identifier for an AthleteDecision (module-local).
// Opaque, unique, never reused, never parsed for meaning.

declare const athleteDecisionIdBrand: unique symbol;

export type AthleteDecisionId = string & { readonly [athleteDecisionIdBrand]: true };

export function newAthleteDecisionId(): AthleteDecisionId {
  return crypto.randomUUID() as AthleteDecisionId;
}
