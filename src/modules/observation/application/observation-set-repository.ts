// observation application: the ObservationSet repository PORT.
// A repository preserves and restores domain objects; it never creates meaning, infers, or projects.
// Minimal surface only: save / findById / exists. No query, filter, transaction, or DB.

import type { ObservationSet } from "../domain/index.ts";
import type { ObservationSetId } from "../../../shared-kernel/ids.ts";

export interface ObservationSetRepository {
  save(set: ObservationSet): void;
  findById(id: ObservationSetId): ObservationSet | undefined;
  exists(id: ObservationSetId): boolean;
}
