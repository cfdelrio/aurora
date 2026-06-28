// event-recording domain: a CorrelationRef groups records that belong to the same scenario/flow.
// It is a grouping LABEL only — it implies no mandatory ordering and no command chain.

declare const correlationRefBrand: unique symbol;

export type CorrelationRef = string & { readonly [correlationRefBrand]: true };

export function correlationRef(value: string): CorrelationRef {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("CorrelationRef requires a non-empty handle");
  }
  return value as CorrelationRef;
}
