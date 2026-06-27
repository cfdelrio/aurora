// reasoning domain: opaque identifiers (reasoning-local for now; may move to shared-kernel
// when a second module needs to reference them). Opaque, unique, never reused, never parsed.

declare const hypothesisIdBrand: unique symbol;
declare const evidenceCaseIdBrand: unique symbol;

export type HypothesisId = string & { readonly [hypothesisIdBrand]: true };
export type EvidenceCaseId = string & { readonly [evidenceCaseIdBrand]: true };

export function newHypothesisId(): HypothesisId {
  return crypto.randomUUID() as HypothesisId;
}

export function newEvidenceCaseId(): EvidenceCaseId {
  return crypto.randomUUID() as EvidenceCaseId;
}
