// operator-runtime application: the FAKE in-memory TrainingArtifactObjectStore adapter (043-C2).
//
// A deterministic, isolated-per-instance stand-in for a real object store — it is NOT a cloud
// deployment, NOT a real cloud object store, NOT filesystem persistence, NOT a DB. It holds and
// returns deep copies (structuredClone) so callers cannot mutate stored artifacts; it uses no global
// state, no filesystem, no network, and no environment access. The payload is OPAQUE: it is stored and
// returned verbatim and is never parsed (FIT/TCX/CSV alike) — fake adapter ≠ cloud deployment.

import {
  storedTrainingArtifact,
  type PutTrainingArtifactInput,
  type StoredTrainingArtifact,
  type TrainingArtifactMetadata,
  type TrainingArtifactObjectStore,
} from "./training-artifact-object-store.ts";

export class FakeTrainingArtifactObjectStore implements TrainingArtifactObjectStore {
  private readonly store = new Map<string, StoredTrainingArtifact>();

  async put(input: PutTrainingArtifactInput): Promise<StoredTrainingArtifact> {
    const artifact = storedTrainingArtifact(input);
    this.store.set(artifact.reference, structuredClone(artifact));
    return structuredClone(artifact);
  }

  async get(reference: string): Promise<StoredTrainingArtifact | undefined> {
    const found = this.store.get(reference);
    return found === undefined ? undefined : structuredClone(found);
  }

  async head(reference: string): Promise<TrainingArtifactMetadata | undefined> {
    const found = this.store.get(reference);
    if (found === undefined) return undefined;
    // metadata only — never the payload
    return Object.freeze({
      reference: found.reference,
      source: found.source,
      ...(found.mediaType !== undefined ? { mediaType: found.mediaType } : {}),
      ...(found.filename !== undefined ? { filename: found.filename } : {}),
      createdAt: structuredClone(found.createdAt),
    });
  }

  clear(): void {
    this.store.clear();
  }
}
