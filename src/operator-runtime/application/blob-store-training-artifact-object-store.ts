// operator-runtime application: a BlobStoreClient-backed TrainingArtifactObjectStore (043-D4A).
//
// The bridge between the vendor-neutral BlobStoreClient and the TrainingArtifactObjectStore port: it
// wires the injected blob-store + the existing artifact mappers. The payload stays OPAQUE — stored and
// returned verbatim, never parsed (FIT/TCX/CSV alike). It is storage-backed, NOT cloud-specific — it
// imports no object-storage SDK and knows nothing about the underlying store.
//
//   blob-store artifact store ≠ S3 adapter · artifact store ≠ Garmin parser · artifact payload ≠ truth ·
//   storage success ≠ understanding ≠ delivery · Aurora advises, the athlete decides.

import type { BlobStoreClient } from "./operator-runtime-blob-store.ts";
import {
  storedTrainingArtifact,
  type PutTrainingArtifactInput,
  type StoredTrainingArtifact,
  type TrainingArtifactMetadata,
  type TrainingArtifactObjectStore,
} from "./training-artifact-object-store.ts";
import {
  storedArtifactToBlob,
  blobToStoredArtifact,
  blobMetadataToArtifactMetadata,
} from "./operator-runtime-artifact-mappers.ts";

export class BlobStoreTrainingArtifactObjectStore implements TrainingArtifactObjectStore {
  private readonly blobs: BlobStoreClient;

  constructor(blobs: BlobStoreClient) {
    this.blobs = blobs;
  }

  async put(input: PutTrainingArtifactInput): Promise<StoredTrainingArtifact> {
    const artifact = storedTrainingArtifact(input);
    await this.blobs.put(storedArtifactToBlob(artifact));
    return artifact;
  }

  async get(reference: string): Promise<StoredTrainingArtifact | undefined> {
    const blob = await this.blobs.get(reference);
    return blob === undefined ? undefined : blobToStoredArtifact(blob);
  }

  async head(reference: string): Promise<TrainingArtifactMetadata | undefined> {
    const metadata = await this.blobs.head(reference);
    return metadata === undefined ? undefined : blobMetadataToArtifactMetadata(metadata);
  }
}
