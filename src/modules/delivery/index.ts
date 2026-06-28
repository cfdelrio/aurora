// delivery module — PUBLIC SURFACE.
// Downstream EXPOSURE only: given a display-eligible RenderedMessageRecord (as judged by rendering's
// displayEligibilityOf), it attempts to expose the message to a deterministic test-only sink and records
// an auditable DeliveryRecord. It decides nothing, interprets nothing, and mutates no domain state. It
// imports only shared-kernel + read-only rendering types/functions; no module imports it. No real provider/
// channel, UI, API, scheduler, event bus, or event record exists here. Delivery success is not evidence;
// delivery failure is not domain invalidation; display eligibility is not delivery.

export * from "./domain/index.ts";
export * from "./application/index.ts";
