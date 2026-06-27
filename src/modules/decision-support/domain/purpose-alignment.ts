// decision-support domain: PurposeContext (input placeholder) + PurposeAlignment.
// Purpose constrains support; missing/ambiguous purpose may force Inquiry/Withholding.

export type PurposeStatus = "declared" | "unknown" | "ambiguous";

export interface PurposeContext {
  readonly status: PurposeStatus;
  readonly purpose?: string;
}

export type PurposeAlignment = "aligned" | "misaligned" | "unknown" | "ambiguous";

export function purposeContext(status: PurposeStatus, purpose?: string): PurposeContext {
  if (status === "declared" && (purpose === undefined || purpose.length === 0)) {
    throw new Error("A declared PurposeContext requires a purpose");
  }
  const p: PurposeContext = {
    status,
    ...(purpose !== undefined ? { purpose } : {}),
  };
  return Object.freeze(p);
}
