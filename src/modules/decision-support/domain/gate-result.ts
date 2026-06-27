// decision-support domain: GateResult + DegradationReason.

export type GateVerdict = "pass" | "limit" | "fail" | "needs-inquiry" | "caution-warning";

export interface GateResult {
  readonly gate: string;
  readonly verdict: GateVerdict;
  readonly reason: string;
}

export function gateResult(gate: string, verdict: GateVerdict, reason: string): GateResult {
  return Object.freeze({ gate, verdict, reason });
}

export interface DegradationReason {
  readonly from: string;
  readonly to: string;
  readonly cause: string;
  readonly gate: string;
}

export function degradationReason(
  from: string,
  to: string,
  cause: string,
  gate: string,
): DegradationReason {
  return Object.freeze({ from, to, cause, gate });
}
