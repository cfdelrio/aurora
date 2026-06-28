// rendering domain: opaque identifiers for presentation-artifact records (module-local).
// Ids are opaque, unique, never reused, never parsed for meaning.

declare const renderedMessageRecordIdBrand: unique symbol;
export type RenderedMessageRecordId = string & { readonly [renderedMessageRecordIdBrand]: true };

export function renderedMessageRecordId(value: string): RenderedMessageRecordId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("RenderedMessageRecordId requires a non-empty string");
  }
  return value as RenderedMessageRecordId;
}

export function newRenderedMessageRecordId(): RenderedMessageRecordId {
  return crypto.randomUUID() as RenderedMessageRecordId;
}

declare const renderReviewIdBrand: unique symbol;
export type RenderReviewId = string & { readonly [renderReviewIdBrand]: true };

export function renderReviewId(value: string): RenderReviewId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("RenderReviewId requires a non-empty string");
  }
  return value as RenderReviewId;
}

export function newRenderReviewId(): RenderReviewId {
  return crypto.randomUUID() as RenderReviewId;
}
