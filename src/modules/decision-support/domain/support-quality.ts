// decision-support domain: SupportQuality (integrity of support, NOT outcome) + AthleteDecisionRef.
// AthleteDecisionRef is REFERENCED after the fact, never owned; outcome never validates support.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { TraceabilityStatus } from "./traceability.ts";

export interface SupportQuality {
  readonly gatesPassed: readonly string[];
  readonly traceability: TraceabilityStatus;
  readonly degraded: boolean;
}

export function supportQuality(
  gatesPassed: readonly string[],
  traceability: TraceabilityStatus,
  degraded: boolean,
): SupportQuality {
  return Object.freeze({
    gatesPassed: Object.freeze([...gatesPassed]),
    traceability,
    degraded,
  });
}

export interface AthleteDecisionRef {
  readonly decisionId: string;
  readonly at: Timestamp;
  readonly divergedFromSupport?: boolean;
}

export function athleteDecisionRef(
  decisionId: string,
  at: Timestamp,
  divergedFromSupport?: boolean,
): AthleteDecisionRef {
  if (typeof decisionId !== "string" || decisionId.length === 0) {
    throw new Error("AthleteDecisionRef requires a decisionId");
  }
  const r: AthleteDecisionRef = {
    decisionId,
    at,
    ...(divergedFromSupport !== undefined ? { divergedFromSupport } : {}),
  };
  return Object.freeze(r);
}
