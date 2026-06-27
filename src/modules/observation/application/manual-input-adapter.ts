// observation application: the Manual Input Adapter — Aurora's first real "data in" boundary.
//
// It is a faithful SCRIBE, not an interpreter: it validates, mechanically normalizes, and maps clear
// reports into the EXISTING observation forms (verbatim subjective words; explicit missing data), then
// records them via recordObservationSet and persists via ObservationSetRepository. It infers nothing,
// detects no Signal, and calls no downstream module. It imports no event-recording (Decision 2).

import { recordObservationSet } from "./record-observation-set.ts";
import type { RawObservationInput } from "./record-observation-set.ts";
import type { ObservationSetRepository } from "./observation-set-repository.ts";
import { observationQuality, qualityComplete } from "../domain/index.ts";
import type { ProvenanceInput } from "../../../shared-kernel/provenance.ts";
import type { ManualInputEntry, ManualInputSubmission } from "./manual-input-submission.ts";
import type {
  ManualInputIngestionOutcome,
  ManualInputLimitation,
  ManualInputRejectionReason,
} from "./manual-input-ingestion-outcome.ts";

export interface IngestManualInputInput {
  readonly submission: ManualInputSubmission;
  readonly observationSetRepository: ObservationSetRepository;
}

// Inferred-state words that may never enter as a measured "fact" (Spec 013 §5.4 / §8).
const INFERRED_STATE_TERMS = ["fatigue", "readiness", "adaptation", "capacity", "impact", "risk"];

function validTimestamp(t: { readonly epochMillis?: unknown; readonly iso?: unknown } | undefined): boolean {
  return (
    t !== undefined &&
    t !== null &&
    typeof t === "object" &&
    typeof t.epochMillis === "number" &&
    Number.isFinite(t.epochMillis) &&
    typeof t.iso === "string"
  );
}

/** Provenance for every observation: the ingestion mechanism is "manual"; the reporter is preserved in the reference. */
function provenanceFor(s: ManualInputSubmission): ProvenanceInput {
  return {
    source: "manual",
    captureTime: s.occurredAt,
    recordingTime: s.submittedAt,
    reference: `${s.submissionRef}|reporter:${s.reporter}`,
  };
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Map one entry to a faithful observation, or return a limitation describing why it could not be recorded. */
function mapEntry(
  entry: ManualInputEntry,
  prov: ProvenanceInput,
): { readonly observation: RawObservationInput } | { readonly limitation: ManualInputLimitation } {
  switch (entry.kind) {
    case "subjective-report":
    case "context-note":
    case "athlete-decision-report":
      if (!nonEmpty(entry.words)) return { limitation: "ambiguous-field" };
      // Verbatim words preserved; never summarized; never labeled fatigue/readiness.
      return {
        observation: { kind: "subjective", provenance: prov, quality: qualityComplete(), words: entry.words },
      };
    case "missing-data":
      if (!nonEmpty(entry.expected)) return { limitation: "ambiguous-field" };
      return {
        observation: {
          kind: "missing-data",
          provenance: prov,
          quality: observationQuality("missing", entry.reason ?? "reported missing"),
          expected: entry.expected,
        },
      };
    case "measured-value":
      // Reserved this slice: no unit interpretation. Ignored as a limitation (rejection handled upstream).
      return { limitation: "unsupported-field-ignored" };
  }
}

/**
 * Ingest a manual submission as a faithful ObservationSet (or reject it). check-only of the input world:
 * the ONLY effect beyond pure computation is a single ObservationSetRepository.save on accept/partial.
 */
export function ingestManualInput(input: IngestManualInputInput): ManualInputIngestionOutcome {
  const { submission: s } = input;

  // 1) validate (hard preconditions → reject, save nothing)
  const reasons: ManualInputRejectionReason[] = [];
  if (!nonEmpty(s.athleteRef)) reasons.push("missing-athlete-ref");
  if (!validTimestamp(s.occurredAt)) reasons.push("missing-occurrence-time");
  if (!validTimestamp(s.submittedAt)) reasons.push("invalid-timestamp");
  if (
    validTimestamp(s.occurredAt) &&
    validTimestamp(s.submittedAt) &&
    s.occurredAt.epochMillis > s.submittedAt.epochMillis
  ) {
    reasons.push("invalid-timestamp"); // reported as occurring after it was submitted — impossible
  }
  if (!Array.isArray(s.entries) || s.entries.length === 0) reasons.push("empty-submission");
  // an entry attempting to smuggle an inferred state in as a measured "fact"
  for (const e of s.entries ?? []) {
    if (e.kind === "measured-value" && INFERRED_STATE_TERMS.some((t) => e.label.toLowerCase().includes(t))) {
      reasons.push("inference-smuggled-as-fact");
      break;
    }
  }
  if (reasons.length > 0) {
    return Object.freeze({ status: "rejected", reasons: Object.freeze([...new Set(reasons)]) });
  }

  // 2) map entries to faithful observations, collecting limitations (no inference, no invented values)
  const prov = provenanceFor(s);
  const observations: RawObservationInput[] = [];
  const limitations: ManualInputLimitation[] = [];
  let sawMeasured = false;
  for (const entry of s.entries) {
    if (entry.kind === "measured-value") sawMeasured = true;
    const mapped = mapEntry(entry, prov);
    if ("observation" in mapped) observations.push(mapped.observation);
    else limitations.push(mapped.limitation);
  }

  // 3) nothing faithfully representable → reject (save nothing)
  if (observations.length === 0) {
    const rej: ManualInputRejectionReason[] = ["no-faithful-observation"];
    if (sawMeasured) rej.push("unsupported-entry-kind");
    return Object.freeze({ status: "rejected", reasons: Object.freeze([...new Set(rej)]) });
  }

  // 4) record through the existing intake coordinator (assigns no meaning, runs no detection)
  const set = recordObservationSet({
    occasion: s.occasion,
    ...(s.expected !== undefined ? { expected: s.expected } : {}),
    observations,
  });

  // 5) persist exclusively through the repository port
  input.observationSetRepository.save(set);

  // 6) outcome (accepted iff fully faithful; partially-accepted otherwise)
  const status = limitations.length > 0 ? "partially-accepted" : "accepted";
  return Object.freeze({
    status,
    observationSet: set,
    observationSetId: set.id,
    acceptedCount: observations.length,
    quality: limitations.length > 0 ? "partial" : "complete",
    limitations: Object.freeze([...limitations]),
    eventCandidate: Object.freeze({
      type: "ObservationSetRecorded" as const,
      observationSetId: set.id,
      occasion: s.occasion,
    }),
  });
}
