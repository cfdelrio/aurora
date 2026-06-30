// operator-runtime application: ARTIFACT ↔ BLOB mappers (Implementation 043-D1).
//
// Pure, zero-dependency mappings between an opaque StoredTrainingArtifact and a vendor-neutral blob
// object, so a future concrete object-storage adapter (D3) persists raw artifacts without re-deriving a
// shape. The payload is treated as OPAQUE — preserved verbatim, never parsed (FIT/TCX/CSV alike) — and
// metadata is provenance only:
//
//   artifact blob ≠ truth · Garmin artifact ≠ parsed metrics · blob mapping ≠ Evidence/ObservationSet/Signal ·
//   Aurora advises, the athlete decides; Aurora never presents inference as fact.

import { timestamp } from "../../shared-kernel/time.ts";
import type { BlobMetadata, BlobObject } from "./operator-runtime-blob-store.ts";
import {
  storedTrainingArtifact,
  toRawArtifactRef,
  type StoredTrainingArtifact,
  type TrainingArtifactMetadata,
} from "./training-artifact-object-store.ts";
import type { TrainingSessionRawArtifactRef, TrainingSessionSource } from "./training-session-record.ts";

// re-export so D3 / callers reach the ref mapper through the storage-mapping surface too
export { toRawArtifactRef };
export type { TrainingSessionRawArtifactRef };

/** Build string-only blob metadata (provenance) from artifact metadata. Never the payload. */
export function artifactMetadataToBlobMetadata(metadata: TrainingArtifactMetadata): BlobMetadata {
  return {
    reference: metadata.reference,
    source: metadata.source,
    created_at_iso: metadata.createdAt.iso,
    ...(metadata.mediaType !== undefined ? { media_type: metadata.mediaType } : {}),
    ...(metadata.filename !== undefined ? { filename: metadata.filename } : {}),
  };
}

/** Reconstruct artifact metadata (provenance) from blob metadata. */
export function blobMetadataToArtifactMetadata(metadata: BlobMetadata): TrainingArtifactMetadata {
  const reference = metadata["reference"];
  const source = metadata["source"];
  const createdAtIso = metadata["created_at_iso"];
  if (typeof reference !== "string" || typeof source !== "string" || typeof createdAtIso !== "string") {
    throw new Error("blob metadata requires reference, source and created_at_iso");
  }
  const mediaType = metadata["media_type"];
  const filename = metadata["filename"];
  return Object.freeze({
    reference,
    source: source as TrainingSessionSource,
    createdAt: timestamp(createdAtIso),
    ...(mediaType !== undefined ? { mediaType } : {}),
    ...(filename !== undefined ? { filename } : {}),
  });
}

/** Map a stored opaque artifact to a blob object. The payload is carried verbatim (never parsed). */
export function storedArtifactToBlob(artifact: StoredTrainingArtifact): BlobObject {
  return {
    key: artifact.reference,
    payload: artifact.payload,
    metadata: artifactMetadataToBlobMetadata(artifact),
  };
}

/** Reconstruct a stored opaque artifact from a blob object. The payload is returned unchanged. */
export function blobToStoredArtifact(blob: BlobObject): StoredTrainingArtifact {
  const meta = blobMetadataToArtifactMetadata(blob.metadata);
  return storedTrainingArtifact({
    reference: blob.key,
    source: meta.source,
    payload: blob.payload,
    createdAt: meta.createdAt,
    ...(meta.mediaType !== undefined ? { mediaType: meta.mediaType } : {}),
    ...(meta.filename !== undefined ? { filename: meta.filename } : {}),
  });
}
