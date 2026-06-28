// Implementation 011 — DomainEventRecord: catalog-driven construction/validation, ref-only payload,
// the concrete Spec-011 use cases, and validated toState()/reconstitute(). Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DomainEventRecord,
  domainEventRecordId,
  eventPayloadRef,
  traceabilityEnvelope,
} from "../index.ts";
import type { DomainEventRecordState, RecordDomainEventInput } from "../index.ts";
import { T, OCCURRED, RECORDED, observationSetRecorded, observationSetRecordedInput } from "./fixtures.ts";

// AC1 — construct a valid record with the required envelope ----------------------------------------
test("constructs a valid record with id/type/category/timestamps/module/envelope", () => {
  const r = observationSetRecorded();
  assert.equal(r.type, "ObservationSetRecorded");
  assert.equal(r.category, "occurrence");
  assert.equal(r.producingModule, "observation");
  assert.equal(r.traceability.primaryArtifactRef.kind, "ObservationSet");
  assert.ok(r.payloadRefs.length >= 1);
});

// AC2 — reject an invalid (uncatalogued) event type -----------------------------------------------
test("rejects an event type that is not in the closed catalog", () => {
  assert.throws(
    () => observationSetRecorded({ type: "NotARealEvent" as unknown as RecordDomainEventInput["type"] }),
    /closed catalog/,
  );
});

// AC3 — reject type / producing-module mismatch ---------------------------------------------------
test("rejects a type/producing-module mismatch", () => {
  assert.throws(() => observationSetRecorded({ producingModule: "reasoning" }), /belongs to module observation/);
});

// AC4 — reject type / category mismatch -----------------------------------------------------------
test("rejects a type/category mismatch", () => {
  assert.throws(() => observationSetRecorded({ category: "outcome" }), /requires category occurrence/);
});

// AC5 — reject missing / wrong primary artifact ref -----------------------------------------------
test("rejects a primary artifact ref of the wrong kind for the type", () => {
  assert.throws(
    () =>
      observationSetRecorded({
        traceability: traceabilityEnvelope({
          primaryArtifactRef: eventPayloadRef({ kind: "Hypothesis", id: "h:1" }),
          sourceRefs: [],
        }),
      }),
    /requires primary artifact kind ObservationSet/,
  );
});

// AC6 — reject a missing traceability envelope ----------------------------------------------------
test("rejects a missing traceability envelope", () => {
  assert.throws(
    () => observationSetRecorded({ traceability: undefined as unknown as RecordDomainEventInput["traceability"] }),
    /traceability/i,
  );
});

// AC7 — ref-only payload shape --------------------------------------------------------------------
test("enforces ref-only payload entries (kind + id only)", () => {
  assert.throws(() => eventPayloadRef({ kind: "Bogus" as never, id: "x" }), /known EventArtifactKind/);
  assert.throws(() => eventPayloadRef({ kind: "ObservationSet", id: "" }), /non-empty id/);
});

// AC8 — reject copied aggregate-like payload (extra keys) on reconstitute --------------------------
test("rejects a copied aggregate-like payload (extra keys) on reconstitute", () => {
  const state = observationSetRecorded().toState();
  const tampered = {
    ...state,
    payloadRefs: [{ kind: "Observation", id: "obs:1", value: 42, notes: "copied body" } as never],
  } as unknown as DomainEventRecordState;
  assert.throws(() => DomainEventRecord.reconstitute(tampered), /ref-only|forbidden field/);
});

// occurredAt <= recordedAt rule -------------------------------------------------------------------
test("rejects recordedAt earlier than occurredAt", () => {
  assert.throws(
    () => observationSetRecorded({ occurredAt: RECORDED, recordedAt: OCCURRED }),
    /recordedAt must not be earlier/,
  );
});

// required refs per type --------------------------------------------------------------------------
test("rejects a record missing a catalog-required reference", () => {
  // EvidenceAttached requires EvidenceCase + Signal refs.
  assert.throws(
    () =>
      DomainEventRecord.record({
        id: domainEventRecordId("evt-ev-bad"),
        type: "EvidenceAttached",
        category: "occurrence",
        occurredAt: OCCURRED,
        recordedAt: RECORDED,
        producingModule: "reasoning",
        traceability: traceabilityEnvelope({
          primaryArtifactRef: eventPayloadRef({ kind: "Hypothesis", id: "h:1" }),
          sourceRefs: [],
        }),
      }),
    /requires a (EvidenceCase|Signal) reference/,
  );
});

// UC2 — EvidenceAttached references hypothesis/evidence/signal without copying bodies ---------------
test("UC2 — EvidenceAttached carries Hypothesis/EvidenceCase/Signal refs only", () => {
  const r = DomainEventRecord.record({
    id: domainEventRecordId("evt-ev-1"),
    type: "EvidenceAttached",
    category: "occurrence",
    occurredAt: OCCURRED,
    recordedAt: RECORDED,
    producingModule: "reasoning",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "Hypothesis", id: "h:1" }),
      sourceRefs: [eventPayloadRef({ kind: "Signal", id: "sig:1" })],
      hypothesisRef: eventPayloadRef({ kind: "Hypothesis", id: "h:1" }),
    }),
    payloadRefs: [
      eventPayloadRef({ kind: "EvidenceCase", id: "ev:1", role: "evidence" }),
      eventPayloadRef({ kind: "Signal", id: "sig:1", role: "evidence" }),
    ],
  });
  // refs only: every payload entry has exactly the ref-only keys.
  for (const ref of r.payloadRefs) {
    for (const key of Object.keys(ref)) {
      assert.ok(["kind", "id", "role", "ownerModule"].includes(key), `unexpected payload key ${key}`);
    }
  }
});

// UC3 — UnderstandingMarkedStale references profile/dimension + cause; mutates nothing --------------
test("UC3 — UnderstandingMarkedStale references profile/dimension + cause (no mutation surface)", () => {
  const r = DomainEventRecord.record({
    id: domainEventRecordId("evt-stale-1"),
    type: "UnderstandingMarkedStale",
    category: "outcome",
    occurredAt: OCCURRED,
    recordedAt: RECORDED,
    producingModule: "understanding",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "UnderstandingProfile", id: "prof:1" }),
      sourceRefs: [eventPayloadRef({ kind: "UnderstandingDimension", id: "dim:durability" })],
      purposeVersionRef: eventPayloadRef({ kind: "PurposeVersion", id: "pv:2", role: "cause" }),
    }),
  });
  assert.equal(r.traceability.purposeVersionRef?.kind, "PurposeVersion");
  // the record exposes no method that could mutate a profile.
  assert.equal(typeof (r as unknown as { update?: unknown }).update, "undefined");
});

// UC4 / AC15 — TerminalOutputSelected carries an output kind and is NOT an AthleteDecision ----------
test("UC4 — TerminalOutputSelected carries output kind via role; is not an AthleteDecision", () => {
  const r = DomainEventRecord.record({
    id: domainEventRecordId("evt-term-1"),
    type: "TerminalOutputSelected",
    category: "outcome",
    occurredAt: OCCURRED,
    recordedAt: RECORDED,
    producingModule: "decision-support",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "DecisionSupportCase", id: "case:1", role: "withholding" }),
      sourceRefs: [],
    }),
  });
  assert.equal(r.traceability.primaryArtifactRef.role, "withholding");
  assert.equal(r.traceability.primaryArtifactRef.kind, "DecisionSupportCase");
  // never an athlete decision: primary kind is the case, and no AthleteDecision ref is owned here.
  assert.notEqual(r.traceability.primaryArtifactRef.kind, "AthleteDecision");
  assert.equal(r.traceability.athleteDecisionRef, undefined);
});

test("TerminalOutputSelected requires a valid output-kind role", () => {
  assert.throws(
    () =>
      DomainEventRecord.record({
        id: domainEventRecordId("evt-term-bad"),
        type: "TerminalOutputSelected",
        category: "outcome",
        occurredAt: OCCURRED,
        recordedAt: RECORDED,
        producingModule: "decision-support",
        traceability: traceabilityEnvelope({
          primaryArtifactRef: eventPayloadRef({ kind: "DecisionSupportCase", id: "case:1" }),
          sourceRefs: [],
        }),
      }),
    /requires primary ref role/,
  );
});

// UC5 / AC16 — AthleteDecisionRecorded requires athlete actor and carries no compliance score -------
test("UC5 — AthleteDecisionRecorded requires an athlete actor and carries no compliance score", () => {
  const r = DomainEventRecord.record({
    id: domainEventRecordId("evt-dec-1"),
    type: "AthleteDecisionRecorded",
    category: "outcome",
    occurredAt: OCCURRED,
    recordedAt: RECORDED,
    producingModule: "athlete",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "AthleteDecision", id: "dec:1" }),
      sourceRefs: [],
      decisionSupportCaseRef: eventPayloadRef({ kind: "DecisionSupportCase", id: "case:1", role: "support-context" }),
    }),
    actor: { kind: "athlete", athleteRef: "athlete:1" },
  });
  assert.equal(r.actor?.kind, "athlete");
  // no compliance/obedience/outcome-correctness fields anywhere in the serialized record.
  const json = JSON.stringify(r.toState());
  for (const banned of ["complian", "obedien", "correctness", "score"]) {
    assert.ok(!json.toLowerCase().includes(banned), `record must not carry "${banned}"`);
  }
});

test("AthleteDecisionRecorded without an athlete actor is rejected", () => {
  assert.throws(
    () =>
      DomainEventRecord.record({
        id: domainEventRecordId("evt-dec-bad"),
        type: "AthleteDecisionRecorded",
        category: "outcome",
        occurredAt: OCCURRED,
        recordedAt: RECORDED,
        producingModule: "athlete",
        traceability: traceabilityEnvelope({
          primaryArtifactRef: eventPayloadRef({ kind: "AthleteDecision", id: "dec:1" }),
          sourceRefs: [],
        }),
      }),
    /requires an actor of kind athlete/,
  );
});

// AC17 — ProjectionFreshnessChanged carries a freshness status; cannot assert "current" by omission -
test("UC — ProjectionFreshnessChanged requires a freshness marker and records a status label", () => {
  const r = DomainEventRecord.record({
    id: domainEventRecordId("evt-fresh-1"),
    type: "ProjectionFreshnessChanged",
    category: "outcome",
    occurredAt: OCCURRED,
    recordedAt: RECORDED,
    producingModule: "understanding",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "UnderstandingAssessment", id: "assess:1" }),
      sourceRefs: [eventPayloadRef({ kind: "UnderstandingProfile", id: "prof:1" })],
      projectionFreshness: { ref: eventPayloadRef({ kind: "UnderstandingAssessment", id: "assess:1" }), status: "stale" },
    }),
  });
  assert.equal(r.traceability.projectionFreshness?.status, "stale");
});

test("ProjectionFreshnessChanged without a freshness marker is rejected", () => {
  assert.throws(
    () =>
      DomainEventRecord.record({
        id: domainEventRecordId("evt-fresh-bad"),
        type: "ProjectionFreshnessChanged",
        category: "outcome",
        occurredAt: OCCURRED,
        recordedAt: RECORDED,
        producingModule: "understanding",
        traceability: traceabilityEnvelope({
          primaryArtifactRef: eventPayloadRef({ kind: "UnderstandingAssessment", id: "assess:1" }),
          sourceRefs: [],
        }),
      }),
    /requires a projection-freshness marker/,
  );
});

// AC13 — round-trip + invalid-state rejection on reconstitute -------------------------------------
test("toState/reconstitute round-trips and preserves every field", () => {
  const original = observationSetRecorded();
  const back = DomainEventRecord.reconstitute(structuredClone(original.toState()));
  assert.equal(back.type, original.type);
  assert.equal(back.category, original.category);
  assert.equal(String(back.id), String(original.id));
  assert.equal(back.occurredAt.iso, original.occurredAt.iso);
  assert.equal(back.traceability.primaryArtifactRef.id, original.traceability.primaryArtifactRef.id);
});

test("reconstitute rejects an invalid stored state (type/module mismatch)", () => {
  const state = observationSetRecorded().toState();
  const corrupted = { ...state, producingModule: "athlete" } as DomainEventRecordState;
  assert.throws(() => DomainEventRecord.reconstitute(corrupted), /belongs to module observation/);
});

// reconstitute does not change timestamps ----------------------------------------------------------
test("reconstitute does not change timestamps", () => {
  const original = observationSetRecorded({ occurredAt: T("2025-12-31T23:00:00.000Z") });
  const back = DomainEventRecord.reconstitute(structuredClone(original.toState()));
  assert.equal(back.occurredAt.epochMillis, original.occurredAt.epochMillis);
  assert.equal(back.recordedAt.epochMillis, original.recordedAt.epochMillis);
});

// the input fixture is sane (sanity guard for the other tests) ------------------------------------
test("fixture input is a valid record shape", () => {
  assert.doesNotThrow(() => DomainEventRecord.record(observationSetRecordedInput()));
});
