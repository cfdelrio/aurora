// Implementation 013 — neutral integration: composing manual ingestion (observation) with an
// ObservationSetRecorded occurrence (event-recording) OUTSIDE observation. observation never imports
// event-recording; the harness wires the two. The event is ref-only and inert.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ingestManualInput, InMemoryObservationSetRepository } from "../observation/index.ts";
import type { ManualInputSubmission } from "../observation/index.ts";
import {
  DomainEventRecord,
  domainEventRecordId,
  eventPayloadRef,
  traceabilityEnvelope,
  InMemoryDomainEventRecordRepository,
} from "../event-recording/index.ts";
import { timestamp } from "../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function submission(): ManualInputSubmission {
  return {
    submissionRef: "sub-9",
    athleteRef: "athlete:1",
    submittedAt: T("2026-03-01T09:00:00.000Z"),
    occurredAt: T("2026-03-01T08:00:00.000Z"),
    occasion: "morning session",
    reporter: "athlete-report",
    entries: [{ kind: "subjective-report", words: "I felt heavy in today's session" }],
  };
}

test("an accepted ingestion can be recorded as a ref-only ObservationSetRecorded event in a neutral harness", () => {
  const obsRepo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission: submission(), observationSetRepository: obsRepo });
  assert.notEqual(outcome.status, "rejected");
  if (outcome.status === "rejected") return;

  // The adapter exposed a ref-only candidate; the HARNESS (not observation) builds the event record.
  const cand = outcome.eventCandidate;
  const record = DomainEventRecord.record({
    id: domainEventRecordId("evt-obs-recorded-1"),
    type: "ObservationSetRecorded",
    category: "occurrence",
    occurredAt: T("2026-03-01T08:00:00.000Z"),
    recordedAt: T("2026-03-01T09:00:01.000Z"),
    producingModule: "observation",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "ObservationSet", id: String(cand.observationSetId), role: "subject" }),
      sourceRefs: [],
    }),
  });

  const evRepo = new InMemoryDomainEventRecordRepository();
  evRepo.append(record);

  // stored + ref-only (no copied observation state, no athlete's words inside the event)
  assert.equal(String(evRepo.findById(record.id)?.id), "evt-obs-recorded-1");
  assert.equal(record.traceability.primaryArtifactRef.kind, "ObservationSet");
  assert.equal(record.traceability.primaryArtifactRef.id, String(cand.observationSetId));
  assert.ok(!JSON.stringify(record.toState()).includes("I felt heavy"), "event must not copy observation words");

  // inert: recording the occurrence changed nothing in the observation store
  assert.ok(obsRepo.exists(outcome.observationSetId));
  assert.equal(obsRepo.findById(outcome.observationSetId)?.observations.length, 1);
});
