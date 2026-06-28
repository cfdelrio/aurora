// athlete application: the Athlete repository PORT (owns Purpose + PurposeHistory).
// Preserves and restores the *given*; never persists inferred state/capacity/readiness.

import type { Athlete } from "../domain/index.ts";
import type { AthleteId } from "../domain/index.ts";

export interface AthleteRepository {
  save(athlete: Athlete): void;
  findById(id: AthleteId): Athlete | undefined;
  exists(id: AthleteId): boolean;
}
