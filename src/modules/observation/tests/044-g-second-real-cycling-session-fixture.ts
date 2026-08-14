// observation tests — 044-G REAL-DATA TRIAL fixture (Manual Data Trial 044-G). Not a test file (no
// .test. suffix), so the runner ignores it — mirrors 044-c/044-d/044-e/044-f-real-*-session-fixture.ts's
// convention.
//
// A manual/structured representation of a SECOND, INDEPENDENT real cycling training session — transcribed
// from a real Garmin Connect CSV export ("activity_10673340347.csv", Garmin's own activity id, a DIFFERENT
// real activity from Trial 044-F's "activity_11178669974.csv") supplied by the repository owner specifically
// for this trial. Every value below (distance, speed, heart rate, elevation, calories) is copied from that
// real export — nothing here is invented or "realistic-looking" synthetic data.
//
// This fixture is NOT the original artifact. It is NOT truth. It is NOT Evidence. It is a manual, structured
// representation of a real source session, prepared OUTSIDE Aurora (Aurora has no CSV parser; this file IS
// the external, one-time, by-hand conversion the 044-A1 production path requires) so that Aurora receives
// only already-parsed plain TrainingSummaryRow data, exactly as the production path requires.
//
// This is a TINY real file (4 data rows total: 3 laps + one "Resumen"), structurally near-identical to Trial
// 044-F's source: the SAME 13-column header (Vueltas, Tiempo, Tiempo acumulado, Distancia, Velocidad media,
// Frecuencia cardiaca media, FC máxima, Ascenso total, Descenso total, Calorías, Velocidad máxima, Tiempo en
// movimiento, Velocidad media en movimiento), the SAME absence of any cadence/power/pace/GAP column (not
// present-but-blank — simply absent from this export's header entirely, exactly as in 044-F), and ZERO
// occurrences of the "--" missing-value placeholder anywhere. ALL 4 real rows are used (nothing cherry-picked
// out); all 11 real, populated metric columns are transcribed on every row — the same 11 metrics 044-F
// exercised, all of which are now already recognized (Impl 044-F1A extended RECOGNIZED_METRICS to 27).
//
// Time-formatted source values (Garmin's "mm:ss[.s]") were manually converted to seconds, exactly as in
// 044-F. Distance/speed use the SAME km/km-per-hour real unit convention as 044-F — no new unit form appears
// in this source.
//
//   this fixture ≠ the original artifact · this fixture ≠ truth · this fixture ≠ Evidence ·
//   a real CSV export ≠ truth · a transcribed metric ≠ Evidence · Aurora advises, the athlete decides ·
//   a second cycling source ≠ automatic need for cycling architecture.

import { timestamp } from "../../../shared-kernel/time.ts";
import type { TrainingRowSubmission } from "../index.ts";

const T = (iso: string) => timestamp(iso);

/**
 * Rows transcribed from all 4 real data lines of activity_10673340347.csv (source line numbers, 1-indexed
 * including the header row) — every real row in the file is represented:
 *  - csv-G-2 : lap 1 ("Vueltas"=1).
 *  - csv-G-3 : lap 2 — faster pace, higher heart rate than lap 1.
 *  - csv-G-4 : lap 3 — a short final segment (1.41 km only).
 *  - csv-G-5 : "Resumen" — the whole-session summary.
 *
 * All 11 metric labels below were ALREADY recognized before this trial (Impl 044-F1A's "max-speed"/
 * "avg-moving-speed" extension, plus every label recognized since Impl 044-A1/044-E1A) — this fixture
 * exercises repeated, WITHIN-cycling variation of an already-established vocabulary, not new labels.
 * observedAt per row is computed from the source's own "Tiempo acumulado" (cumulative elapsed time) column
 * added to an operator-supplied session start instant — the exact same convention Trial 044-F's fixture used
 * (that column itself is not transcribed as a metric, exactly as in 044-F).
 */
export const secondRealCyclingSessionSubmission044G: TrainingRowSubmission = {
  submissionRef: "trial-044g-cycling-session",
  athleteRef: "athlete:044g-trial",
  occasion: "cycling session — Garmin CSV export activity_10673340347",
  source: "manual",
  sourceFormat: "csv-summary",
  artifactRef: "garmin-activity-10673340347",
  submittedAt: T("2026-07-06T16:00:00.000Z"),
  occurredAt: T("2026-07-06T15:00:00.000Z"),
  rows: [
    // --- csv line 2: lap 1 -----------------------------------------------------------------------------
    {
      sourceRowId: "csv-G-2",
      metric: "duration",
      value: "1110",
      unit: "s",
      observedAt: T("2026-07-06T15:18:30.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "lap 1 of 3 (source label: Vueltas=1)",
    },
    { sourceRowId: "csv-G-2", metric: "distance", value: "5.00", unit: "km", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "avg-speed", value: "16.2", unit: "km/h", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "avg-heart-rate", value: "112", unit: "bpm", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "max-heart-rate", value: "135", unit: "bpm", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "elevation-gain", value: "52", unit: "m", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "elevation-loss", value: "53", unit: "m", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "calories", value: "131", unit: "kcal", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "max-speed", value: "34.6", unit: "km/h", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "moving-time", value: "906", unit: "s", observedAt: T("2026-07-06T15:18:30.000Z") },
    { sourceRowId: "csv-G-2", metric: "avg-moving-speed", value: "19.9", unit: "km/h", observedAt: T("2026-07-06T15:18:30.000Z") },

    // --- csv line 3: lap 2 — faster pace, higher heart rate ---------------------------------------------
    {
      sourceRowId: "csv-G-3",
      metric: "duration",
      value: "904",
      unit: "s",
      observedAt: T("2026-07-06T15:33:34.000Z"),
      notes: "lap 2 of 3 (source label: Vueltas=2)",
    },
    { sourceRowId: "csv-G-3", metric: "distance", value: "5.00", unit: "km", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "avg-speed", value: "19.9", unit: "km/h", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "avg-heart-rate", value: "127", unit: "bpm", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "max-heart-rate", value: "145", unit: "bpm", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "elevation-gain", value: "54", unit: "m", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "elevation-loss", value: "52", unit: "m", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "calories", value: "129", unit: "kcal", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "max-speed", value: "33.5", unit: "km/h", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "moving-time", value: "806", unit: "s", observedAt: T("2026-07-06T15:33:34.000Z") },
    { sourceRowId: "csv-G-3", metric: "avg-moving-speed", value: "22.3", unit: "km/h", observedAt: T("2026-07-06T15:33:34.000Z") },

    // --- csv line 4: lap 3 — a short final segment (1.41 km only) ---------------------------------------
    {
      sourceRowId: "csv-G-4",
      metric: "duration",
      value: "243",
      unit: "s",
      observedAt: T("2026-07-06T15:37:38.000Z"),
      notes: "lap 3 of 3 (source label: Vueltas=3) — short final segment",
    },
    { sourceRowId: "csv-G-4", metric: "distance", value: "1.41", unit: "km", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "avg-speed", value: "20.9", unit: "km/h", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "avg-heart-rate", value: "136", unit: "bpm", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "max-heart-rate", value: "144", unit: "bpm", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "elevation-gain", value: "13", unit: "m", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "elevation-loss", value: "9", unit: "m", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "calories", value: "40", unit: "kcal", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "max-speed", value: "27.5", unit: "km/h", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "moving-time", value: "238", unit: "s", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-4", metric: "avg-moving-speed", value: "21.3", unit: "km/h", observedAt: T("2026-07-06T15:37:38.000Z") },

    // --- csv line 5: "Resumen" — the whole-session summary ----------------------------------------------
    {
      sourceRowId: "csv-G-5",
      metric: "duration",
      value: "2258",
      unit: "s",
      observedAt: T("2026-07-06T15:37:38.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "session summary (source label: Resumen) — 3 laps, 11.41 km total",
    },
    { sourceRowId: "csv-G-5", metric: "distance", value: "11.41", unit: "km", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "avg-speed", value: "18.2", unit: "km/h", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "avg-heart-rate", value: "121", unit: "bpm", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "max-heart-rate", value: "145", unit: "bpm", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "elevation-gain", value: "119", unit: "m", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "elevation-loss", value: "113", unit: "m", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "calories", value: "300", unit: "kcal", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "max-speed", value: "34.6", unit: "km/h", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "moving-time", value: "1950", unit: "s", observedAt: T("2026-07-06T15:37:38.000Z") },
    { sourceRowId: "csv-G-5", metric: "avg-moving-speed", value: "21.1", unit: "km/h", observedAt: T("2026-07-06T15:37:38.000Z") },
  ],
};
