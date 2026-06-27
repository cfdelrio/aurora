// event-recording domain: a record is either an `occurrence` (something was observed/created)
// or an `outcome` (the result of a domain operation). One envelope, two categories (Spec 011 Decision 1).

export type DomainEventCategory = "occurrence" | "outcome";

export const DOMAIN_EVENT_CATEGORIES: readonly DomainEventCategory[] = ["occurrence", "outcome"];

export function isDomainEventCategory(value: unknown): value is DomainEventCategory {
  return value === "occurrence" || value === "outcome";
}
