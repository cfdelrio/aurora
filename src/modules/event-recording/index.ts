// event-recording: a dependency-neutral module that records WHAT HAPPENED as an append-only,
// ref-only log of DomainEventRecords. It imports only shared-kernel; no domain module imports it.
// It is not a bus: nothing is published, subscribed, dispatched, or executed.

export * from "./domain/index.ts";
export * from "./application/index.ts";
