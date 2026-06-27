// reasoning domain: EvidenceDirection — how an EvidenceCase bears on THE CLAIM.
//
// NOTE: this is NOT Signal.direction. Signal.direction (above-expected/below-expected/deviates/
// absent) is relative to CONTEXT. EvidenceDirection is relative to the CLAIM. The same Signal can
// be above-expected (vs context) and either supports or contradicts (vs a given hypothesis).

export type EvidenceDirection =
  | "supports"
  | "weakens"
  | "contradicts"
  | "falsifies"
  | "contextualizes";
