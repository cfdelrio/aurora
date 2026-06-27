// decision-support domain: TraceabilityVerificationResult.
// Traceability is VERIFIED, not authored. Recommendation requires `complete`.

export type TraceabilityStatus = "complete" | "partial" | "missing" | "invalid";

export interface TraceabilityVerificationResult {
  readonly status: TraceabilityStatus;
  readonly reason: string;
  readonly resolvedTo?: {
    readonly observationSetId: string;
    readonly observationIds: readonly string[];
  };
}

export function traceabilityVerificationResult(
  status: TraceabilityStatus,
  reason: string,
  resolvedTo?: { readonly observationSetId: string; readonly observationIds: readonly string[] },
): TraceabilityVerificationResult {
  const r: TraceabilityVerificationResult = {
    status,
    reason,
    ...(resolvedTo !== undefined
      ? {
          resolvedTo: Object.freeze({
            observationSetId: resolvedTo.observationSetId,
            observationIds: Object.freeze([...resolvedTo.observationIds]),
          }),
        }
      : {}),
  };
  return Object.freeze(r);
}
