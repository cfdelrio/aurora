// Implementation 011 — InMemoryDomainEventRecordRepository: append-only, deep-copy on the boundary,
// no mutation API, correlation lookup.

import { test } from "node:test";
import assert from "node:assert/strict";

import { InMemoryDomainEventRecordRepository } from "../index.ts";
import { correlationRef, domainEventRecordId } from "../index.ts";
import { observationSetRecorded } from "./fixtures.ts";

// AC — append + findById + all --------------------------------------------------------------------
test("append then findById/all returns equal records in append order", () => {
  const repo = new InMemoryDomainEventRecordRepository();
  repo.append(observationSetRecorded({ id: domainEventRecordId("p1") }));
  repo.append(observationSetRecorded({ id: domainEventRecordId("p2") }));
  assert.deepEqual(repo.all().map((r) => String(r.id)), ["p1", "p2"]);
  assert.equal(String(repo.findById(domainEventRecordId("p1"))?.id), "p1");
});

// AC10 — duplicate id rejected --------------------------------------------------------------------
test("appending a duplicate id is rejected (append-only)", () => {
  const repo = new InMemoryDomainEventRecordRepository();
  repo.append(observationSetRecorded({ id: domainEventRecordId("dup") }));
  assert.throws(() => repo.append(observationSetRecorded({ id: domainEventRecordId("dup") })), /append-only/);
});

// AC12 — repository stores copies, not live references ---------------------------------------------
test("repository stores copies: two finds return independent, equal instances", () => {
  const repo = new InMemoryDomainEventRecordRepository();
  repo.append(observationSetRecorded({ id: domainEventRecordId("copy") }));
  const first = repo.findById(domainEventRecordId("copy"));
  const second = repo.findById(domainEventRecordId("copy"));
  assert.ok(first !== undefined && second !== undefined);
  assert.notEqual(first, second); // different object identities (deep-copied)
  assert.notEqual(first.traceability, second.traceability);
  assert.equal(first.traceability.primaryArtifactRef.id, second.traceability.primaryArtifactRef.id); // equal content
});

// AC11 — no mutation / dispatch surface exists ----------------------------------------------------
test("repository exposes no update/delete/replace/dispatch/publish/subscribe surface", () => {
  const repo = new InMemoryDomainEventRecordRepository() as unknown as Record<string, unknown>;
  for (const banned of [
    "save",
    "update",
    "delete",
    "remove",
    "replace",
    "dispatch",
    "publish",
    "subscribe",
    "emit",
    "markProcessed",
  ]) {
    assert.equal(typeof repo[banned], "undefined", `repository must not expose ${banned}`);
  }
});

// findByCorrelation --------------------------------------------------------------------------------
test("findByCorrelation returns the records of a flow", () => {
  const repo = new InMemoryDomainEventRecordRepository();
  const flow = correlationRef("flow-1");
  repo.append(observationSetRecorded({ id: domainEventRecordId("f1"), correlation: flow }));
  repo.append(observationSetRecorded({ id: domainEventRecordId("f2") }));
  assert.deepEqual(repo.findByCorrelation(flow).map((r) => String(r.id)), ["f1"]);
});
