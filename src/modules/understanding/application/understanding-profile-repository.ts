// understanding application: the UnderstandingProfile repository PORT.
// Preserves and restores; never recomputes promotion, never derives an assessment as truth.

import type { UnderstandingProfile } from "../domain/index.ts";
import type { UnderstandingProfileId } from "../domain/index.ts";

export interface UnderstandingProfileRepository {
  save(profile: UnderstandingProfile): void;
  findById(id: UnderstandingProfileId): UnderstandingProfile | undefined;
  exists(id: UnderstandingProfileId): boolean;
}
