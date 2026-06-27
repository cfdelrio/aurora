// understanding domain: opaque identifier (understanding-local for now).

declare const understandingProfileIdBrand: unique symbol;

export type UnderstandingProfileId = string & { readonly [understandingProfileIdBrand]: true };

export function newUnderstandingProfileId(): UnderstandingProfileId {
  return crypto.randomUUID() as UnderstandingProfileId;
}
