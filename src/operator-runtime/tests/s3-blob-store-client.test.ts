// operator-runtime tests (Implementation 043-D3): the S3-compatible BlobStoreClient adapter, exercised
// against a FAKE S3 send-client — NO live bucket, NO integration test. The adapter constructs real
// @aws-sdk/client-s3 commands; the fake inspects them. Payloads stay opaque; nothing is parsed.
//
//   S3 adapter ≠ artifact truth · object-storage object ≠ Evidence/ObservationSet/Signal ·
//   artifact payload ≠ parsed Garmin metrics · S3 blob-store ≠ Postgres row-store · adapter tests ≠ live integration.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";
import {
  S3BlobStoreClient,
  type S3SendClient,
} from "../application/s3-blob-store-client.ts";
import { storedTrainingArtifact, storedArtifactToBlob } from "../index.ts";
import type { BlobObject, BlobStoreClient } from "../index.ts";

const T = (iso: string) => timestamp(iso);
const BUCKET = "aurora-operator-artifacts";

const FIT_BLOB = " FIT garmin-binary HR=152 PWR=240";
const TCX_BLOB = "<TrainingCenterDatabase><Activity Sport='Running'>...</Activity>";
const CSV_BLOB = "timestamp,hr,power\n2026-06-29T07:00:00Z,152,240\n";

// A fake S3 send-client: records the (real) commands it is sent and serves objects from memory. No network.
class FakeS3Client implements S3SendClient {
  readonly sent: { name: string; input: Record<string, unknown> }[] = [];
  private readonly store = new Map<string, { body: string; metadata: Record<string, string> }>();

  async send(command: unknown): Promise<unknown> {
    const c = command as { constructor: { name: string }; input: Record<string, unknown> };
    const name = c.constructor.name;
    this.sent.push({ name, input: c.input });
    const key = String(c.input["Key"]);
    if (name === "PutObjectCommand") {
      this.store.set(key, { body: String(c.input["Body"]), metadata: (c.input["Metadata"] ?? {}) as Record<string, string> });
      return {};
    }
    if (name === "GetObjectCommand") {
      const obj = this.store.get(key);
      if (obj === undefined) throw notFound("NoSuchKey");
      return { Body: { transformToString: async () => obj.body }, Metadata: obj.metadata };
    }
    if (name === "HeadObjectCommand") {
      const obj = this.store.get(key);
      if (obj === undefined) throw notFound("NotFound");
      return { Metadata: obj.metadata };
    }
    throw new Error(`unexpected command: ${name}`);
  }
}
function notFound(name: string): Error {
  const e = new Error(name);
  e.name = name;
  return e;
}

function blob(reference: string, payload: string, source: "garmin" | "manual"): BlobObject {
  return storedArtifactToBlob(
    storedTrainingArtifact({ reference, source, payload, mediaType: "application/octet-stream", filename: "x", createdAt: T("2026-06-29T07:00:00.000Z") }),
  );
}

// --- contract ---------------------------------------------------------------------------------------

test("1 S3BlobStoreClient implements the async BlobStoreClient", () => {
  const client: BlobStoreClient = new S3BlobStoreClient({ client: new FakeS3Client(), bucket: BUCKET });
  for (const m of ["put", "get", "head"] as const) assert.equal(typeof client[m], "function", `must implement ${m}`);
});

test("2 put sends a PutObjectCommand (bucket/key/body/metadata) through the injected client", async () => {
  const fake = new FakeS3Client();
  const client = new S3BlobStoreClient({ client: fake, bucket: BUCKET });
  const b = blob("object-store://raw/abc", FIT_BLOB, "garmin");
  await client.put(b);
  assert.equal(fake.sent.length, 1);
  const call = fake.sent[0];
  assert.ok(call);
  assert.equal(call.name, "PutObjectCommand");
  assert.equal(call.input["Bucket"], BUCKET);
  assert.equal(call.input["Key"], "object-store://raw/abc");
  assert.equal(call.input["Body"], FIT_BLOB);
  assert.deepEqual(call.input["Metadata"], b.metadata);
});

test("3/7/8 get retrieves an object by key; payload + metadata preserved", async () => {
  const client = new S3BlobStoreClient({ client: new FakeS3Client(), bucket: BUCKET });
  const b = blob("object-store://raw/def", FIT_BLOB, "garmin");
  await client.put(b);
  const got = await client.get("object-store://raw/def");
  assert.ok(got);
  assert.equal(got.key, "object-store://raw/def");
  assert.equal(got.payload, FIT_BLOB, "opaque payload returned unchanged");
  assert.deepEqual(got.metadata, b.metadata, "provenance metadata preserved");
});

test("4/6 get + head return undefined for the expected not-found shape", async () => {
  const client = new S3BlobStoreClient({ client: new FakeS3Client(), bucket: BUCKET });
  assert.equal(await client.get("object-store://raw/missing"), undefined);
  assert.equal(await client.head("object-store://raw/missing"), undefined);
});

test("5 head retrieves metadata without the payload", async () => {
  const client = new S3BlobStoreClient({ client: new FakeS3Client(), bucket: BUCKET });
  const b = blob("object-store://raw/ghi", FIT_BLOB, "manual");
  await client.put(b);
  const meta = await client.head("object-store://raw/ghi");
  assert.ok(meta);
  assert.equal("payload" in meta, false, "head must not expose the payload");
  assert.deepEqual(meta, b.metadata);
});

test("9 FIT/TCX/CSV artifacts are stored opaque and returned unchanged (never parsed)", async () => {
  const client = new S3BlobStoreClient({ client: new FakeS3Client(), bucket: BUCKET });
  for (const [ref, payload, source] of [
    ["object-store://raw/fit", FIT_BLOB, "garmin"],
    ["object-store://raw/tcx", TCX_BLOB, "garmin"],
    ["object-store://raw/csv", CSV_BLOB, "manual"],
  ] as const) {
    await client.put(blob(ref, payload, source));
    assert.equal((await client.get(ref))?.payload, payload, `payload for ${ref} must be unchanged`);
  }
});

test("10-16 adapter creates no Evidence/ObservationSet/Signal/AthleteDecision, parses nothing, delivers nothing, and issues only S3 object commands", async () => {
  const fake = new FakeS3Client();
  const client = new S3BlobStoreClient({ client: fake, bucket: BUCKET });
  await client.put(blob("object-store://raw/jkl", FIT_BLOB, "garmin"));
  await client.get("object-store://raw/jkl");
  await client.head("object-store://raw/jkl");
  // only S3 object commands were issued — no delivery, no session, no decision
  assert.deepEqual([...new Set(fake.sent.map((c) => c.name))].sort(), ["GetObjectCommand", "HeadObjectCommand", "PutObjectCommand"]);
  const json = JSON.stringify(fake.sent).toLowerCase();
  for (const derived of ["evidence", "observationset", "observation", "signal", "athletedecision", "metric", "measurement", "lap", "trackpoint", "delivery", "invokeoperatorsession"]) {
    assert.equal(json.includes(derived), false, `adapter must derive/invoke no '${derived}'`);
  }
});

test("17/18 unrelated errors are not swallowed; default tests need no live S3 (fake client only)", async () => {
  // a non-not-found error must propagate
  const failing: S3SendClient = { send: async () => { throw new Error("AccessDenied"); } };
  const client = new S3BlobStoreClient({ client: failing, bucket: BUCKET });
  await assert.rejects(() => client.get("object-store://raw/x"), /AccessDenied/);
  await assert.rejects(() => client.put(blob("object-store://raw/x", "p", "manual")), /AccessDenied/);
});
