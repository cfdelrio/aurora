// observation application: the Manual Input Adapter — Aurora's first real "data in" boundary.
//
// It is a faithful SCRIBE, not an interpreter: it validates, mechanically normalizes, and maps clear
// reports into the EXISTING observation forms (verbatim subjective words; explicit missing data; a
// well-formed numeric measurement), then records them via recordObservationSet and persists via
// ObservationSetRepository. It infers nothing, runs no detection, and calls no downstream module. It
// imports no event-recording (Decision 2).
//
// measured-value mapping (Impl 044-A1): mechanical only — parse a finite number, require a unit, carry
// the metric name/row reference through unexamined. An unrecognized metric name is still recorded, only
// flagged (quality: suspicious) — recognizing a metric's NAME is not the same as judging its correctness,
// and Aurora owns no canonical metric catalog. No unit conversion, no unit-catalog validation.

import { recordObservationSet } from "./record-observation-set.ts";
import type { RawObservationInput } from "./record-observation-set.ts";
import type { ObservationSetRepository } from "./observation-set-repository.ts";
import { observationQuality, qualityComplete } from "../domain/index.ts";
import type { ObservationQuality } from "../domain/index.ts";
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

// A small, explicitly non-authoritative allowlist of RECOGNIZABLE metric names (Impl 044-A1). This is a
// name-recognition aid only — describing how familiar the RECORDING's label is, never what the value
// MEANS. An unrecognized name is still faithfully recorded; it is never rejected for being unfamiliar.
const RECOGNIZED_METRICS = new Set([
  "heart-rate",
  "avg-heart-rate",
  "max-heart-rate",
  "power",
  "avg-power",
  "max-power",
  "pace",
  "avg-pace",
  "speed",
  "avg-speed",
  "cadence",
  "avg-cadence",
  "distance",
  "duration",
  "elevation-gain",
]);

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Mechanical parse only — a well-formed finite number, never a unit conversion or magnitude judgment. */
function parseFiniteNumber(rawValue: string): number | undefined {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return undefined;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Quality reflects how RECOGNIZABLE the recording's label is — never a judgment of the value itself. */
function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}

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

function nonEmpty(value: string | undefined): value is string {
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
    case "measured-value": {
      if (!nonEmpty(entry.label)) return { limitation: "ambiguous-field" };
      if (!nonEmpty(entry.unit)) return { limitation: "missing-unit" };
      const magnitude = parseFiniteNumber(entry.rawValue);
      if (magnitude === undefined) return { limitation: "unparseable-numeric-value" };
      // fold the row/field reference (if any) into THIS entry's provenance only — never a new Source value.
      const rowProvenance: ProvenanceInput =
        entry.sourceRowRef !== undefined
          ? { ...prov, reference: `${prov.reference}|${entry.sourceRowRef}` }
          : prov;
      return {
        observation: {
          kind: "measured",
          provenance: rowProvenance,
          quality: qualityForMetricLabel(entry.label),
          measurement: { quantity: entry.label, magnitude, unit: entry.unit },
        },
      };
    }
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
  for (const entry of s.entries) {
    const mapped = mapEntry(entry, prov);
    if ("observation" in mapped) observations.push(mapped.observation);
    else limitations.push(mapped.limitation);
  }

  // 3) nothing faithfully representable → reject (save nothing)
  if (observations.length === 0) {
    return Object.freeze({ status: "rejected", reasons: Object.freeze(["no-faithful-observation"] as const) });
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
