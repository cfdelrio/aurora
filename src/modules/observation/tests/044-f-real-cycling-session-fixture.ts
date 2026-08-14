// observation tests — 044-F REAL-DATA TRIAL fixture (Manual Data Trial 044-F). Not a test file (no
// .test. suffix), so the runner ignores it — mirrors 044-c/044-d/044-e-real-*-session-fixture.ts's
// convention.
//
// A manual/structured representation of a REAL CYCLING training session — the FIRST THIRD-SPORT real
// source this arc has run through intake (after two swim trials and one running trial) — transcribed from
// a real Garmin Connect CSV export ("activity_11178669974.csv", Garmin's own activity id) supplied by the
// repository owner specifically for this trial (described by the athlete as a recreational bicycle trip —
// treated only as context; the trial does not require formal training intent). Every value below (distance,
// speed, heart rate, elevation, calories) is copied from that real export — nothing here is invented or
// "realistic-looking" synthetic data.
//
// This fixture is NOT the original artifact. It is NOT truth. It is NOT Evidence. It is a manual,
// structured representation of a real source session, prepared OUTSIDE Aurora (Aurora has no CSV parser;
// this file IS the external, one-time, by-hand conversion the 044-A1 production path requires) so that
// Aurora receives only already-parsed plain TrainingSummaryRow data, exactly as the production path requires.
//
// This is a TINY real file (4 data rows total: 3 laps + one "Resumen") and, unlike either swim file or the
// running file, it has ZERO occurrences of the "--" missing-value placeholder anywhere — every column is
// populated on every row. It is also NARROWER than the running file: it has no cadence, power, or pace/GAP
// columns at all (not present-but-blank — simply absent from this export's header entirely). ALL 4 real
// rows are used (nothing cherry-picked out); all 11 real, populated metric columns are transcribed on every
// row.
//
// Time-formatted source values (Garmin's "mm:ss[.s]") were manually converted to seconds. Distance/speed
// here use Garmin's own km/km-per-hour real units — a THIRD distinct unit convention in this arc (swim:
// m/s-per-100m; running: km/s-per-km; cycling: km/km-per-hour) — kept exactly as reported, not converted.
//
//   this fixture ≠ the original artifact · this fixture ≠ truth · this fixture ≠ Evidence ·
//   a real CSV export ≠ truth · a transcribed metric ≠ Evidence · Aurora advises, the athlete decides ·
//   first third-sport success ≠ universal multi-sport coverage.

import { timestamp } from "../../../shared-kernel/time.ts";
import type { TrainingRowSubmission } from "../index.ts";

const T = (iso: string) => timestamp(iso);

/**
 * Rows transcribed from all 4 real data lines of activity_11178669974.csv (source line numbers, 1-indexed
 * including the header row) — every real row in the file is represented:
 *  - csv-F-2 : lap 1 ("Vueltas"=1) — a steady early segment.
 *  - csv-F-3 : lap 2 — similar pace, slightly higher heart rate.
 *  - csv-F-4 : lap 3 — a short, slower final segment (1.30 km only).
 *  - csv-F-5 : "Resumen" — the whole-session summary.
 *
 * "max-speed" and "avg-moving-speed" are metric labels NOT in RECOGNIZED_METRICS today — real,
 * cycling-evidenced measurements this trial exercises for the first time. "avg-speed" IS already
 * recognized (seeded in the ORIGINAL 15-entry catalog, Impl 044-A1) but has never been exercised by real
 * data until this trial. "elevation-gain", "elevation-loss", and "moving-time" are already recognized
 * (elevation-gain since Impl 044-A1; elevation-loss/moving-time since Impl 044-E1A's running extension) and
 * are exercised here for the first time by a THIRD sport. Every lap shows a real, meaningful gap between
 * "Tiempo" (elapsed) and "Tiempo en movimiento" (moving) — a real, non-trivial pause on every single lap,
 * unlike the running trial where only the paused lap diverged.
 */
export const realCyclingSessionSubmission044F: TrainingRowSubmission = {
  submissionRef: "trial-044f-cycling-session",
  athleteRef: "athlete:044f-trial",
  occasion: "cycling session — Garmin CSV export activity_11178669974",
  source: "manual",
  sourceFormat: "csv-summary",
  artifactRef: "garmin-activity-11178669974",
  submittedAt: T("2026-07-05T16:00:00.000Z"),
  occurredAt: T("2026-07-05T15:00:00.000Z"),
  rows: [
    // --- csv line 2: lap 1 — steady early segment -------------------------------------------------------
    {
      sourceRowId: "csv-F-2",
      metric: "duration",
      value: "950",
      unit: "s",
      observedAt: T("2026-07-05T15:15:50.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "lap 1 of 3 (source label: Vueltas=1) — recreational bicycle trip",
    },
    { sourceRowId: "csv-F-2", metric: "distance", value: "5.00", unit: "km", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "avg-speed", value: "18.9", unit: "km/h", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "avg-heart-rate", value: "102", unit: "bpm", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "max-heart-rate", value: "120", unit: "bpm", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "elevation-gain", value: "102", unit: "m", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "elevation-loss", value: "100", unit: "m", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "calories", value: "92", unit: "kcal", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "max-speed", value: "33.1", unit: "km/h", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "moving-time", value: "888", unit: "s", observedAt: T("2026-07-05T15:15:50.000Z") },
    { sourceRowId: "csv-F-2", metric: "avg-moving-speed", value: "20.3", unit: "km/h", observedAt: T("2026-07-05T15:15:50.000Z") },

    // --- csv line 3: lap 2 — similar pace, slightly higher heart rate -----------------------------------
    {
      sourceRowId: "csv-F-3",
      metric: "duration",
      value: "1002",
      unit: "s",
      observedAt: T("2026-07-05T15:32:32.000Z"),
      notes: "lap 2 of 3 (source label: Vueltas=2)",
    },
    { sourceRowId: "csv-F-3", metric: "distance", value: "5.00", unit: "km", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "avg-speed", value: "18.0", unit: "km/h", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "avg-heart-rate", value: "106", unit: "bpm", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "max-heart-rate", value: "127", unit: "bpm", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "elevation-gain", value: "45", unit: "m", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "elevation-loss", value: "51", unit: "m", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "calories", value: "93", unit: "kcal", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "max-speed", value: "38.1", unit: "km/h", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "moving-time", value: "884", unit: "s", observedAt: T("2026-07-05T15:32:32.000Z") },
    { sourceRowId: "csv-F-3", metric: "avg-moving-speed", value: "20.4", unit: "km/h", observedAt: T("2026-07-05T15:32:32.000Z") },

    // --- csv line 4: lap 3 — a short, slower final segment (1.30 km only) -------------------------------
    {
      sourceRowId: "csv-F-4",
      metric: "duration",
      value: "337.6",
      unit: "s",
      observedAt: T("2026-07-05T15:38:10.000Z"),
      notes: "lap 3 of 3 (source label: Vueltas=3) — short final segment",
    },
    { sourceRowId: "csv-F-4", metric: "distance", value: "1.30", unit: "km", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "avg-speed", value: "13.9", unit: "km/h", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "avg-heart-rate", value: "109", unit: "bpm", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "max-heart-rate", value: "120", unit: "bpm", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "elevation-gain", value: "7", unit: "m", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "elevation-loss", value: "26", unit: "m", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "calories", value: "31", unit: "kcal", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "max-speed", value: "29.7", unit: "km/h", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "moving-time", value: "236", unit: "s", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-4", metric: "avg-moving-speed", value: "19.8", unit: "km/h", observedAt: T("2026-07-05T15:38:10.000Z") },

    // --- csv line 5: "Resumen" — the whole-session summary ----------------------------------------------
    {
      sourceRowId: "csv-F-5",
      metric: "duration",
      value: "2290",
      unit: "s",
      observedAt: T("2026-07-05T15:38:10.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "session summary (source label: Resumen) — 3 laps, 11.30 km total",
    },
    { sourceRowId: "csv-F-5", metric: "distance", value: "11.30", unit: "km", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "avg-speed", value: "17.8", unit: "km/h", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "avg-heart-rate", value: "105", unit: "bpm", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "max-heart-rate", value: "127", unit: "bpm", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "elevation-gain", value: "154", unit: "m", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "elevation-loss", value: "177", unit: "m", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "calories", value: "216", unit: "kcal", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "max-speed", value: "38.1", unit: "km/h", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "moving-time", value: "2008", unit: "s", observedAt: T("2026-07-05T15:38:10.000Z") },
    { sourceRowId: "csv-F-5", metric: "avg-moving-speed", value: "20.3", unit: "km/h", observedAt: T("2026-07-05T15:38:10.000Z") },
  ],
};
