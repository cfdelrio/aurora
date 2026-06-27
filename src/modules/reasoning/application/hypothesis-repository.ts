// reasoning application: the Hypothesis repository PORT.
// Preserves and restores; never authors claims, strengthens evidence, or infers. save/findById/exists.

import type { Hypothesis } from "../domain/index.ts";
import type { HypothesisId } from "../domain/index.ts";

export interface HypothesisRepository {
  save(hypothesis: Hypothesis): void;
  findById(id: HypothesisId): Hypothesis | undefined;
  exists(id: HypothesisId): boolean;
}
