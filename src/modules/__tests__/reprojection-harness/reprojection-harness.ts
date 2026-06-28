// Implementation 012 — the reprojection RUNNER (check-only).
//
// runReprojection reads explicit inputs, recomputes allowed derived views via the owning module's
// functions, recalculates freshness, verifies traceability, compares against an existing view, and
// returns an auditable ReprojectionRun of findings. In check-only it mutates NO repository, appends
// NO event record, creates NO decision-support output, and never makes a projection current.

import type { DomainEventRecordId, EventPayloadRef } from "../../event-recording/index.ts";
import type {
  ReprojectionInputSet,
  ReprojectionMode,
  ReprojectionResult,
  ReprojectionRun,
  ReprojectionTarget,
  ReprojectionFinding,
} from "./reprojection.ts";
import { detectCandidates } from "./candidate-detection.ts";
import { reprojectUnderstandingAssessment } from "./understanding-reprojection.ts";

function reservedTargetResult(target: ReprojectionTarget): ReprojectionResult {
  return Object.freeze({
    target,
    sourceRefs: Object.freeze([]),
    traceability: "missing" as const,
    findings: Object.freeze<ReprojectionFinding[]>(["manual-review-required"]),
    limitations: Object.freeze([`target kind '${target.kind}' is reserved and not implemented in this slice`]),
    safeAction: "manual-review" as const,
  });
}

export function runReprojection(input: ReprojectionInputSet): ReprojectionRun {
  const mode: ReprojectionMode = input.mode ?? "check-only";
  if (mode !== "check-only") {
    throw new Error(`Reprojection mode '${mode}' is not implemented in this slice (check-only only)`);
  }

  const events = input.events ?? [];
  const existingViews = input.existingViews ?? [];

  // Candidate detection is pure: it identifies what to check; it executes nothing.
  const targets = detectCandidates(events, input.requestedTargets);

  const results: ReprojectionResult[] = [];
  for (const target of targets) {
    if (target.kind === "UnderstandingAssessment" || target.kind === "ProjectionFreshness") {
      results.push(
        reprojectUnderstandingAssessment(target, input.understandingProfiles, events, existingViews, input.at),
      );
    } else {
      results.push(reservedTargetResult(target)); // ImpactAssessment / AthleteReadModel: reserved
    }
  }

  // Roll up audit data.
  const sourcesConsidered: EventPayloadRef[] = targets.map((t) => t.primaryRef);
  const inputRefs: EventPayloadRef[] = [...sourcesConsidered];
  const eventsConsidered: DomainEventRecordId[] = events.map((e) => e.id);
  const findings = Object.freeze([...new Set(results.flatMap((r) => r.findings))]);
  const limitations = Object.freeze([...new Set(results.flatMap((r) => r.limitations))]);

  return Object.freeze({
    runId: input.runId,
    mode,
    startedAt: input.startedAt,
    ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
    requestedTargets: input.requestedTargets,
    inputRefs: Object.freeze(inputRefs),
    eventsConsidered: Object.freeze(eventsConsidered),
    sourcesConsidered: Object.freeze(sourcesConsidered),
    results: Object.freeze(results),
    findings,
    limitations,
    errors: Object.freeze([]),
  });
}
