// decision-support application: anti-corruption adapter that VERIFIES traceability over a
// reasoning Hypothesis's existing links (Hypothesis -> EvidenceCase -> TraceToSignal ->
// observationSet/observationIds). It verifies; it never authors traceability. Only the reasoning
// TYPE is imported (no runtime dependency on reasoning values).

import type { Hypothesis } from "../../reasoning/index.ts";
import { traceabilityVerificationResult } from "../domain/index.ts";
import type { TraceabilityVerificationResult } from "../domain/index.ts";

export function verifyTraceability(hypothesis: Hypothesis): TraceabilityVerificationResult {
  const evidence = hypothesis.evidence;
  if (evidence.length === 0) {
    return traceabilityVerificationResult("missing", "hypothesis has no evidence");
  }

  const setIds = new Set<string>();
  const observationIds: string[] = [];
  let anyWithoutLinks = false;

  for (const ec of evidence) {
    const ids = ec.trace.observationIds;
    if (ids.length === 0) {
      anyWithoutLinks = true;
      continue;
    }
    setIds.add(String(ec.trace.observationSetId));
    for (const id of ids) {
      observationIds.push(String(id));
    }
  }

  if (observationIds.length === 0) {
    return traceabilityVerificationResult("invalid", "evidence carries no observation links");
  }

  const firstSet = [...setIds][0] ?? "";
  const status = anyWithoutLinks ? "partial" : "complete";
  return traceabilityVerificationResult(status, `${evidence.length} evidence case(s) verified`, {
    observationSetId: firstSet,
    observationIds,
  });
}

/** The settled lifecycle state of the hypothesis, consumed by the EvidenceGate. */
export function claimStateOf(hypothesis: Hypothesis): string {
  return hypothesis.state;
}
