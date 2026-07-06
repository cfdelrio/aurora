// observation tests — 044-E REAL-DATA TRIAL fixture (Manual Data Trial 044-E). Not a test file (no
// .test. suffix), so the runner ignores it — mirrors 044-c/044-d-real-swim-session-fixture.ts's convention.
//
// A manual/structured representation of a REAL RUNNING training session — the FIRST NON-SWIM real source
// this arc has run through intake — transcribed from a real Garmin Connect CSV export
// ("activity_17390160500.csv", Garmin's own activity id) supplied by the repository owner specifically for
// this trial. Every value below (distance, duration, heart rate, cadence, stride length, pace, calories,
// elevation) is copied from that real export — nothing here is invented or "realistic-looking" synthetic
// data.
//
// This fixture is NOT the original artifact. It is NOT truth. It is NOT Evidence. It is a manual,
// structured representation of a real source session, prepared OUTSIDE Aurora (Aurora has no CSV parser;
// this file IS the external, one-time, by-hand conversion the 044-A1 production path requires) so that
// Aurora receives only already-parsed plain TrainingSummaryRow data, exactly as the production path requires.
//
// This is a TINY real file (5 data rows total: 4 laps + one "Resumen"/summary row) but WIDE (28 real
// columns) — every real row is used (nothing cherry-picked out); only a representative subset of the many
// always-"--" columns is transcribed (the rest are documented, not duplicated, in the trial findings doc).
//
// Time-formatted source values (Garmin's "mm:ss[.s]" and, for the summary, "mm:ss" without a leading hour
// component here) were manually converted to seconds. Distance/pace here use Garmin's own km-based real
// units (unlike the swim trials' meters/s-per-100m) — kept exactly as reported, not converted, to surface
// this real cross-sport unit variation honestly rather than silently normalize it away.
//
//   this fixture ≠ the original artifact · this fixture ≠ truth · this fixture ≠ Evidence ·
//   a real CSV export ≠ truth · a transcribed metric ≠ Evidence · Aurora advises, the athlete decides ·
//   first non-swim success ≠ universal multi-sport coverage.

import { timestamp } from "../../../shared-kernel/time.ts";
import type { TrainingRowSubmission } from "../index.ts";

const T = (iso: string) => timestamp(iso);

/**
 * Rows transcribed from all 5 real data lines of activity_17390160500.csv (source line numbers, 1-indexed
 * including the header row) — every real row in the file is represented:
 *  - csv-E-2 : lap 1 ("Vueltas"=1) — a clean, steady interval; no pause.
 *  - csv-E-3 : lap 2 — steady, rising heart rate.
 *  - csv-E-4 : lap 3 — steady, highest heart rate of the laps.
 *  - csv-E-5 : lap 4 — a recovery/cooldown lap where the athlete paused mid-lap: "Tiempo" (elapsed, 2:25.5)
 *              is vastly longer than "Tiempo en movimiento" (moving time, only 0:24) — the closest real
 *              analogue to the swim trials' "Descanso" rows, and the ONE lap missing a real "Ascenso total"
 *              (elevation-gain) value ("--", the source's own naturally-occurring missing value here, not
 *              engineered for this trial).
 *  - csv-E-6 : "Resumen" — the whole-session summary.
 *
 * "elevation-loss", "avg-stride-length", "max-cadence", "moving-time", and "avg-moving-pace" are metric
 * labels NOT in RECOGNIZED_METRICS today — real, running-specific measurements this trial evidences for the
 * first time. "avg-power" (already recognized) and "avg-vertical-oscillation" (not recognized) are each
 * included once, with their real "--" value, to test missing-value recognition on both a RECOGNIZED and an
 * UNRECOGNIZED metric label.
 */
export const realRunningSessionSubmission044E: TrainingRowSubmission = {
  submissionRef: "trial-044e-running-session",
  athleteRef: "athlete:044e-trial",
  occasion: "running session — Garmin CSV export activity_17390160500",
  source: "manual",
  sourceFormat: "csv-summary",
  artifactRef: "garmin-activity-17390160500",
  submittedAt: T("2026-07-05T07:00:00.000Z"),
  occurredAt: T("2026-07-05T06:00:00.000Z"),
  rows: [
    // --- csv line 2: lap 1 — clean, steady interval, no pause -------------------------------------------
    {
      sourceRowId: "csv-E-2",
      metric: "duration",
      value: "280.3",
      unit: "s",
      observedAt: T("2026-07-05T06:04:40.300Z"),
      deviceLabel: "Garmin Connect export",
      notes: "lap 1 of 4 (source label: Vueltas=1) — steady running interval",
    },
    { sourceRowId: "csv-E-2", metric: "distance", value: "1.00", unit: "km", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "avg-pace", value: "280", unit: "s/km", observedAt: T("2026-07-05T06:04:40.300Z") }, // 4:40 /km
    { sourceRowId: "csv-E-2", metric: "avg-heart-rate", value: "154", unit: "bpm", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "max-heart-rate", value: "161", unit: "bpm", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "elevation-gain", value: "12", unit: "m", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "elevation-loss", value: "14", unit: "m", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "calories", value: "60", unit: "kcal", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "optimal-pace", value: "255", unit: "s/km", observedAt: T("2026-07-05T06:04:40.300Z") }, // 4:15 /km
    { sourceRowId: "csv-E-2", metric: "avg-cadence", value: "166", unit: "spm", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "max-cadence", value: "176", unit: "spm", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "avg-stride-length", value: "1.29", unit: "m", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "moving-time", value: "280.3", unit: "s", observedAt: T("2026-07-05T06:04:40.300Z") },
    { sourceRowId: "csv-E-2", metric: "avg-moving-pace", value: "280", unit: "s/km", observedAt: T("2026-07-05T06:04:40.300Z") },
    // deliberately left as the RAW Garmin source placeholder — a real, genuinely blank field on a metric
    // that IS already recognized (avg-power), not invented.
    { sourceRowId: "csv-E-2", metric: "avg-power", value: "--", unit: "w", observedAt: T("2026-07-05T06:04:40.300Z") },

    // --- csv line 3: lap 2 — steady, rising heart rate --------------------------------------------------
    {
      sourceRowId: "csv-E-3",
      metric: "duration",
      value: "290.9",
      unit: "s",
      observedAt: T("2026-07-05T06:09:31.200Z"),
      notes: "lap 2 of 4 (source label: Vueltas=2)",
    },
    { sourceRowId: "csv-E-3", metric: "distance", value: "1.00", unit: "km", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "avg-pace", value: "291", unit: "s/km", observedAt: T("2026-07-05T06:09:31.200Z") }, // 4:51 /km
    { sourceRowId: "csv-E-3", metric: "avg-heart-rate", value: "166", unit: "bpm", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "max-heart-rate", value: "180", unit: "bpm", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "elevation-gain", value: "11", unit: "m", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "elevation-loss", value: "9", unit: "m", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "calories", value: "70", unit: "kcal", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "optimal-pace", value: "269", unit: "s/km", observedAt: T("2026-07-05T06:09:31.200Z") }, // 4:29 /km
    { sourceRowId: "csv-E-3", metric: "avg-cadence", value: "166", unit: "spm", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "max-cadence", value: "172", unit: "spm", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "avg-stride-length", value: "1.24", unit: "m", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "moving-time", value: "290.9", unit: "s", observedAt: T("2026-07-05T06:09:31.200Z") },
    { sourceRowId: "csv-E-3", metric: "avg-moving-pace", value: "291", unit: "s/km", observedAt: T("2026-07-05T06:09:31.200Z") },
    // a genuinely UNRECOGNIZED metric label whose real value is also "--" — never populated anywhere in
    // this file (unlike avg-power, which is a recognized metric label).
    { sourceRowId: "csv-E-3", metric: "avg-vertical-oscillation", value: "--", unit: "cm", observedAt: T("2026-07-05T06:09:31.200Z") },

    // --- csv line 4: lap 3 — steady, highest heart rate of the four laps --------------------------------
    {
      sourceRowId: "csv-E-4",
      metric: "duration",
      value: "291.0",
      unit: "s",
      observedAt: T("2026-07-05T06:14:22.000Z"),
      notes: "lap 3 of 4 (source label: Vueltas=3)",
    },
    { sourceRowId: "csv-E-4", metric: "distance", value: "1.00", unit: "km", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "avg-pace", value: "291", unit: "s/km", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "avg-heart-rate", value: "182", unit: "bpm", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "max-heart-rate", value: "186", unit: "bpm", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "elevation-gain", value: "12", unit: "m", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "elevation-loss", value: "13", unit: "m", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "calories", value: "81", unit: "kcal", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "optimal-pace", value: "262", unit: "s/km", observedAt: T("2026-07-05T06:14:22.000Z") }, // 4:22 /km
    { sourceRowId: "csv-E-4", metric: "avg-cadence", value: "165", unit: "spm", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "max-cadence", value: "178", unit: "spm", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "avg-stride-length", value: "1.25", unit: "m", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "moving-time", value: "291", unit: "s", observedAt: T("2026-07-05T06:14:22.000Z") },
    { sourceRowId: "csv-E-4", metric: "avg-moving-pace", value: "291", unit: "s/km", observedAt: T("2026-07-05T06:14:22.000Z") },

    // --- csv line 5: lap 4 — a recovery/cooldown lap with a real mid-lap PAUSE --------------------------
    // "Tiempo" (2:25.5 elapsed) vastly exceeds "Tiempo en movimiento" (0:24 actually moving) — the closest
    // real analogue in this file to the swim trials' "Descanso" rows. This is also the ONE lap with a real,
    // naturally-occurring "--" for elevation-gain — not engineered for this trial, simply what the source
    // reports.
    {
      sourceRowId: "csv-E-5",
      metric: "duration",
      value: "145.5",
      unit: "s",
      observedAt: T("2026-07-05T06:16:48.000Z"),
      notes:
        "lap 4 of 4 (source label: Vueltas=4) — a recovery/cooldown lap with a real mid-lap pause: elapsed " +
        "time (2:25.5) vastly exceeds moving time (0:24); avg-cadence drops to a real but anomalously low 32",
    },
    { sourceRowId: "csv-E-5", metric: "distance", value: "0.08", unit: "km", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "avg-pace", value: "1727", unit: "s/km", observedAt: T("2026-07-05T06:16:48.000Z") }, // 28:47 /km — skewed by the pause
    { sourceRowId: "csv-E-5", metric: "avg-heart-rate", value: "157", unit: "bpm", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "max-heart-rate", value: "185", unit: "bpm", observedAt: T("2026-07-05T06:16:48.000Z") },
    // the real, naturally-occurring missing value — NOT selected/engineered to test missing-value handling;
    // this is simply what row 4 of the real source reports for "Ascenso total".
    { sourceRowId: "csv-E-5", metric: "elevation-gain", value: "--", unit: "m", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "elevation-loss", value: "2", unit: "m", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "calories", value: "32", unit: "kcal", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "optimal-pace", value: "290", unit: "s/km", observedAt: T("2026-07-05T06:16:48.000Z") }, // 4:50 /km
    { sourceRowId: "csv-E-5", metric: "avg-cadence", value: "32", unit: "spm", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "max-cadence", value: "171", unit: "spm", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "avg-stride-length", value: "1.08", unit: "m", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-5", metric: "moving-time", value: "24", unit: "s", observedAt: T("2026-07-05T06:16:48.000Z") }, // 0:24 — vastly less than duration (145.5s)
    { sourceRowId: "csv-E-5", metric: "avg-moving-pace", value: "285", unit: "s/km", observedAt: T("2026-07-05T06:16:48.000Z") }, // 4:45 /km — much faster than avg-pace once the pause is excluded

    // --- csv line 6: "Resumen" — the whole-session summary ----------------------------------------------
    {
      sourceRowId: "csv-E-6",
      metric: "duration",
      value: "1008",
      unit: "s",
      observedAt: T("2026-07-05T06:16:48.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "session summary (source label: Resumen) — 4 laps, 3.08 km total",
    },
    { sourceRowId: "csv-E-6", metric: "distance", value: "3.08", unit: "km", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "avg-pace", value: "327", unit: "s/km", observedAt: T("2026-07-05T06:16:48.000Z") }, // 5:27 /km
    { sourceRowId: "csv-E-6", metric: "avg-heart-rate", value: "166", unit: "bpm", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "max-heart-rate", value: "186", unit: "bpm", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "elevation-gain", value: "34", unit: "m", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "elevation-loss", value: "39", unit: "m", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "calories", value: "243", unit: "kcal", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "optimal-pace", value: "255", unit: "s/km", observedAt: T("2026-07-05T06:16:48.000Z") }, // 4:15 /km
    { sourceRowId: "csv-E-6", metric: "avg-cadence", value: "146", unit: "spm", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "max-cadence", value: "178", unit: "spm", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "avg-stride-length", value: "1.23", unit: "m", observedAt: T("2026-07-05T06:16:48.000Z") },
    { sourceRowId: "csv-E-6", metric: "moving-time", value: "886", unit: "s", observedAt: T("2026-07-05T06:16:48.000Z") }, // 14:46
    { sourceRowId: "csv-E-6", metric: "avg-moving-pace", value: "287", unit: "s/km", observedAt: T("2026-07-05T06:16:48.000Z") }, // 4:47 /km
    // avg-power's real "--" also appears on the summary row — the SAME recognized-metric-missing pattern
    // holds at both the lap level (csv-E-2) and the whole-session level.
    { sourceRowId: "csv-E-6", metric: "avg-power", value: "--", unit: "w", observedAt: T("2026-07-05T06:16:48.000Z") },
  ],
};
