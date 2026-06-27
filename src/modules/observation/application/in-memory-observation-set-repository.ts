// observation application: in-memory ObservationSetRepository adapter (module-local; NOT infra).
// Stores toState() output (deep-copied), loads via reconstitute() -- so two finds return independent
// objects and mutating a retrieved object never touches stored state. It emits no events.

import { ObservationSet } from "../domain/index.ts";
import type { ObservationSetState } from "../domain/index.ts";
import type { ObservationSetId } from "../../../shared-kernel/ids.ts";
import type { ObservationSetRepository } from "./observation-set-repository.ts";

export class InMemoryObservationSetRepository implements ObservationSetRepository {
  private readonly store = new Map<string, ObservationSetState>();

  save(set: ObservationSet): void {
    this.store.set(String(set.id), structuredClone(set.toState()));
  }

  findById(id: ObservationSetId): ObservationSet | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : ObservationSet.reconstitute(structuredClone(state));
  }

  exists(id: ObservationSetId): boolean {
    return this.store.has(String(id));
  }

  /** Test convenience only. */
  clear(): void {
    this.store.clear();
  }
}
