// event-recording domain: opaque identifier for a DomainEventRecord (module-local).
// Ids are opaque, unique, never reused, never parsed for meaning. No timestamp is embedded.

declare const domainEventRecordIdBrand: unique symbol;

export type DomainEventRecordId = string & { readonly [domainEventRecordIdBrand]: true };

/** Build an id from a caller-supplied non-empty string (deterministic for tests). */
export function domainEventRecordId(value: string): DomainEventRecordId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("DomainEventRecordId requires a non-empty string");
  }
  return value as DomainEventRecordId;
}

/** Fresh opaque id. Carries no timestamp and encodes no meaning. */
export function newDomainEventRecordId(): DomainEventRecordId {
  return crypto.randomUUID() as DomainEventRecordId;
}
