// observation tests — 044-C REAL-DATA TRIAL fixture (Manual Data Trial 044-C). Not a test file (no
// .test. suffix), so the runner ignores it — mirrors helpers.ts's convention.
//
// A manual/structured representation of a REAL swim training session, transcribed from a real Garmin
// Connect CSV export ("activity_23459651624.csv", Garmin's own activity id) supplied by the repository
// owner specifically for this trial. Every value below (distance, duration, heart rate, stroke counts,
// SWOLF, pace, calories) is copied from that real export — nothing here is invented or "realistic-looking"
// synthetic data.
//
// This fixture is NOT the original artifact. It is NOT truth. It is NOT Evidence. It is a manual,
// structured representation of a real source session, prepared OUTSIDE Aurora (Aurora has no CSV parser;
// this file IS the external, one-time, by-hand conversion the 044-C mission requires) so that Aurora
// receives only already-parsed plain TrainingSummaryRow data, exactly as the production path requires.
//
// Time-formatted source values (e.g. Garmin's "15:05" / "0:57" mm:ss) were manually converted to seconds.
// Comma-grouped large source numbers (e.g. Garmin's "1,600") were normalized to plain digits EXCEPT for
// ONE deliberately-left-raw value (csv-59's distance), kept exactly as the source wrote it, to see how the
// existing intake path handles that real formatting quirk.
//
//   this fixture ≠ the original artifact · this fixture ≠ truth · this fixture ≠ Evidence ·
//   a real CSV export ≠ truth · a transcribed metric ≠ Evidence · Aurora advises, the athlete decides.

import { timestamp } from "../../../shared-kernel/time.ts";
import type { TrainingRowSubmission } from "../index.ts";

const T = (iso: string) => timestamp(iso);

/**
 * Rows transcribed from three real lines of activity_23459651624.csv:
 *  - csv-2   : an early rest interval ("Descanso") — a real, genuinely-reported ZERO distance value.
 *  - csv-59  : interval 8, the session's main set ("Mixto", 32 lengths, 1,600 m) — the richest interval.
 *  - csv-134 : the "Resumen" (session summary) row — whole-session totals.
 */
export const realSwimSessionSubmission044C: TrainingRowSubmission = {
  submissionRef: "trial-044c-swim-session",
  athleteRef: "athlete:044c-trial",
  occasion: "swim session — Garmin CSV export activity_23459651624",
  source: "manual",
  sourceFormat: "csv-summary",
  artifactRef: "garmin-activity-23459651624",
  submittedAt: T("2026-07-02T09:00:00.000Z"),
  occurredAt: T("2026-07-02T07:00:00.000Z"),
  rows: [
    // --- csv row 2: an early rest interval — real reported HR during rest, and a real ZERO distance -----
    {
      sourceRowId: "csv-2",
      metric: "distance",
      value: "0",
      unit: "m",
      observedAt: T("2026-07-02T07:00:15.000Z"),
      notes: "rest interval before the first timed set (source label: Descanso)",
    },
    { sourceRowId: "csv-2", metric: "avg-heart-rate", value: "76", unit: "bpm", observedAt: T("2026-07-02T07:00:15.000Z") },
    { sourceRowId: "csv-2", metric: "max-heart-rate", value: "81", unit: "bpm", observedAt: T("2026-07-02T07:00:15.000Z") },

    // --- csv row 59: interval 8 ("Mixto"/mixed strokes), the session's main set, 32 lengths, 1,600 m -------
    // distance is left in the RAW source format (comma thousands separator) to test real-data friction.
    {
      sourceRowId: "csv-59",
      metric: "distance",
      value: "1,600",
      unit: "m",
      observedAt: T("2026-07-02T07:15:00.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "main set, interval 8, mixed strokes (source label: Mixto), 32 lengths",
    },
    { sourceRowId: "csv-59", metric: "duration", value: "905", unit: "s", observedAt: T("2026-07-02T07:15:00.000Z") }, // 15:05
    { sourceRowId: "csv-59", metric: "avg-pace", value: "57", unit: "s/100m", observedAt: T("2026-07-02T07:15:00.000Z") }, // 0:57 /100m
    { sourceRowId: "csv-59", metric: "swolf", value: "43", unit: "swolf", observedAt: T("2026-07-02T07:15:00.000Z") },
    { sourceRowId: "csv-59", metric: "avg-heart-rate", value: "149", unit: "bpm", observedAt: T("2026-07-02T07:15:00.000Z") },
    { sourceRowId: "csv-59", metric: "max-heart-rate", value: "182", unit: "bpm", observedAt: T("2026-07-02T07:15:00.000Z") },
    { sourceRowId: "csv-59", metric: "total-strokes", value: "485", unit: "strokes", observedAt: T("2026-07-02T07:15:00.000Z") },
    { sourceRowId: "csv-59", metric: "calories", value: "179", unit: "kcal", observedAt: T("2026-07-02T07:15:00.000Z") },

    // --- csv row 134: "Resumen" — the whole-session summary ------------------------------------------------
    {
      sourceRowId: "csv-134",
      metric: "distance",
      value: "3600",
      unit: "m",
      observedAt: T("2026-07-02T08:19:45.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "session summary (source label: Resumen) — 72 lengths total",
    },
    { sourceRowId: "csv-134", metric: "duration", value: "4785", unit: "s", observedAt: T("2026-07-02T08:19:45.000Z") }, // 1:19:45
    { sourceRowId: "csv-134", metric: "avg-heart-rate", value: "124", unit: "bpm", observedAt: T("2026-07-02T08:19:45.000Z") },
    { sourceRowId: "csv-134", metric: "max-heart-rate", value: "182", unit: "bpm", observedAt: T("2026-07-02T08:19:45.000Z") },
    { sourceRowId: "csv-134", metric: "total-strokes", value: "1382", unit: "strokes", observedAt: T("2026-07-02T08:19:45.000Z") },
    { sourceRowId: "csv-134", metric: "swolf", value: "56", unit: "swolf", observedAt: T("2026-07-02T08:19:45.000Z") },
    { sourceRowId: "csv-134", metric: "calories", value: "648", unit: "kcal", observedAt: T("2026-07-02T08:19:45.000Z") },
  ],
};
