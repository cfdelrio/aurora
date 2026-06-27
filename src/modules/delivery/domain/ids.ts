// delivery domain: opaque identifiers for delivery requests and audit records (module-local).
// Ids are opaque, unique, never reused, never parsed for meaning.

declare const deliveryRequestIdBrand: unique symbol;
export type DeliveryRequestId = string & { readonly [deliveryRequestIdBrand]: true };

export function deliveryRequestId(value: string): DeliveryRequestId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("DeliveryRequestId requires a non-empty string");
  }
  return value as DeliveryRequestId;
}

export function newDeliveryRequestId(): DeliveryRequestId {
  return crypto.randomUUID() as DeliveryRequestId;
}

declare const deliveryRecordIdBrand: unique symbol;
export type DeliveryRecordId = string & { readonly [deliveryRecordIdBrand]: true };

export function deliveryRecordId(value: string): DeliveryRecordId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("DeliveryRecordId requires a non-empty string");
  }
  return value as DeliveryRecordId;
}

export function newDeliveryRecordId(): DeliveryRecordId {
  return crypto.randomUUID() as DeliveryRecordId;
}
