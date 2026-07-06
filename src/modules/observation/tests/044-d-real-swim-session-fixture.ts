// observation tests — 044-D REAL-DATA TRIAL fixture (Manual Data Trial 044-D). Not a test file (no
// .test. suffix), so the runner ignores it — mirrors 044-c-real-swim-session-fixture.ts's convention.
//
// A manual/structured representation of a SECOND real swim training session, transcribed from a real
// Garmin Connect CSV export ("activity_23358314497.csv", Garmin's own activity id) supplied by the
// repository owner specifically for this trial. Every value below (distance, duration, heart rate, stroke
// counts, SWOLF, pace, calories) is copied from that real export — nothing here is invented or
// "realistic-looking" synthetic data.
//
// This fixture is NOT the original artifact. It is NOT truth. It is NOT Evidence. It is a manual,
// structured representation of a real source session, prepared OUTSIDE Aurora (Aurora has no CSV parser;
// this file IS the external, one-time, by-hand conversion the 044-A1 production path requires) so that
// Aurora receives only already-parsed plain TrainingSummaryRow data, exactly as the production path requires.
//
// Time-formatted source values (Garmin's "mm:ss[.s]" and, for the whole-session summary, "h:mm:ss") were
// manually converted to seconds. Two real comma-grouped source numbers ("3,200", "1,125") are kept exactly
// as the source wrote them, to see whether the grouped-thousands normalization (Impl 044-C2A) generalizes
// to a SECOND real session, not just the one it was built from.
//
//   this fixture ≠ the original artifact · this fixture ≠ truth · this fixture ≠ Evidence ·
//   a real CSV export ≠ truth · a transcribed metric ≠ Evidence · Aurora advises, the athlete decides.

import { timestamp } from "../../../shared-kernel/time.ts";
import type { TrainingRowSubmission } from "../index.ts";

const T = (iso: string) => timestamp(iso);

/**
 * Rows transcribed from five real lines of activity_23358314497.csv (source line numbers, 1-indexed
 * including the header row):
 *  - csv-D-2   : an early rest interval ("Descanso") — a real, genuinely-reported ZERO distance value.
 *  - csv-D-4   : interval "1" ("Estilo libre"/freestyle), a single 50 m length — the interval-level summary.
 *  - csv-D-5   : sub-lap "1.1", a near-duplicate of csv-D-4 for the SAME single length — a real, observed
 *                source-structure quirk (a differing avg-heart-rate: 99 vs csv-D-4's 108) that also carries
 *                a real, genuinely-blank "--" value for "Promedio de brazadas" (avg-strokes-per-length).
 *  - csv-D-7   : interval "2" ("Mixto"/mixed strokes), 8 lengths, 400 m — the session's richest single
 *                interval, and the first place "Ritmo óptimo" (best/optimal pace) is real-evidenced as a
 *                DISTINCT value from "Ritmo medio" (avg pace): 75 s/100m vs 115 s/100m.
 *  - csv-D-136 : "Resumen" (session summary) — whole-session totals, including both real comma-grouped
 *                values ("3,200" m distance, "1,125" total strokes) and the summary's own "1:24:38"
 *                h:mm:ss duration (a real time format not seen in Trial 044-C's fixture, which never
 *                exceeded 60 minutes for any single transcribed value).
 *
 * Two metric labels below ("optimal-pace", "avg-strokes-per-length") are NOT in the adapter's
 * RECOGNIZED_METRICS allowlist — they are real, distinct metrics this second session evidences for the
 * first time, deliberately left unrecognized rather than guessed into an existing catalog entry.
 */
export const realSwimSessionSubmission044D: TrainingRowSubmission = {
  submissionRef: "trial-044d-swim-session",
  athleteRef: "athlete:044d-trial",
  occasion: "swim session — Garmin CSV export activity_23358314497",
  source: "manual",
  sourceFormat: "csv-summary",
  artifactRef: "garmin-activity-23358314497",
  submittedAt: T("2026-07-04T09:00:00.000Z"),
  occurredAt: T("2026-07-04T07:00:00.000Z"),
  rows: [
    // --- csv line 2: an early rest interval — real reported HR during rest, and a real ZERO distance -----
    {
      sourceRowId: "csv-D-2",
      metric: "distance",
      value: "0",
      unit: "m",
      observedAt: T("2026-07-04T07:00:00.800Z"),
      notes: "rest interval before the first timed set (source label: Descanso)",
    },
    { sourceRowId: "csv-D-2", metric: "avg-heart-rate", value: "82", unit: "bpm", observedAt: T("2026-07-04T07:00:00.800Z") },
    { sourceRowId: "csv-D-2", metric: "max-heart-rate", value: "82", unit: "bpm", observedAt: T("2026-07-04T07:00:00.800Z") },

    // --- csv line 4: interval 1 ("Estilo libre"/freestyle), a single 50 m length --------------------------
    {
      sourceRowId: "csv-D-4",
      metric: "distance",
      value: "50",
      unit: "m",
      observedAt: T("2026-07-04T07:01:07.600Z"),
      notes: "interval 1, freestyle, single length (source label: Estilo libre)",
    },
    { sourceRowId: "csv-D-4", metric: "duration", value: "58.2", unit: "s", observedAt: T("2026-07-04T07:01:07.600Z") }, // 0:58.2
    { sourceRowId: "csv-D-4", metric: "avg-pace", value: "116", unit: "s/100m", observedAt: T("2026-07-04T07:01:07.600Z") }, // 1:56 /100m
    { sourceRowId: "csv-D-4", metric: "optimal-pace", value: "116", unit: "s/100m", observedAt: T("2026-07-04T07:01:07.600Z") }, // 1:56 /100m — unrecognized metric
    { sourceRowId: "csv-D-4", metric: "swolf", value: "85", unit: "swolf", observedAt: T("2026-07-04T07:01:07.600Z") },
    { sourceRowId: "csv-D-4", metric: "avg-heart-rate", value: "108", unit: "bpm", observedAt: T("2026-07-04T07:01:07.600Z") },
    { sourceRowId: "csv-D-4", metric: "max-heart-rate", value: "127", unit: "bpm", observedAt: T("2026-07-04T07:01:07.600Z") },
    { sourceRowId: "csv-D-4", metric: "total-strokes", value: "27", unit: "strokes", observedAt: T("2026-07-04T07:01:07.600Z") },
    { sourceRowId: "csv-D-4", metric: "avg-strokes-per-length", value: "27", unit: "strokes/length", observedAt: T("2026-07-04T07:01:07.600Z") }, // unrecognized metric
    { sourceRowId: "csv-D-4", metric: "calories", value: "8", unit: "kcal", observedAt: T("2026-07-04T07:01:07.600Z") },

    // --- csv line 5: sub-lap 1.1 — a real near-duplicate of csv-D-4 for the SAME single length, with a
    // differing avg-heart-rate AND a real, genuinely-blank "--" avg-strokes-per-length value ----------------
    {
      sourceRowId: "csv-D-5",
      metric: "distance",
      value: "50",
      unit: "m",
      observedAt: T("2026-07-04T07:00:58.200Z"),
      notes:
        "nested sub-lap 1.1 of interval 1 — a real near-duplicate of the interval-1 summary row (csv-D-4), " +
        "with a differing avg-heart-rate (99 here vs 108 on csv-D-4) and a real blank ('--') " +
        "avg-strokes-per-length value; its own cumulative-time field is relative to the parent interval's " +
        "start, not the whole session, so its observedAt is NOT session-monotonic with csv-D-4's",
    },
    { sourceRowId: "csv-D-5", metric: "avg-heart-rate", value: "99", unit: "bpm", observedAt: T("2026-07-04T07:00:58.200Z") },
    // deliberately left as the RAW Garmin source placeholder — a real, genuinely blank field, not invented.
    { sourceRowId: "csv-D-5", metric: "avg-strokes-per-length", value: "--", unit: "strokes/length", observedAt: T("2026-07-04T07:00:58.200Z") },

    // --- csv line 7: interval 2 ("Mixto"/mixed strokes), 8 lengths, 400 m — the session's richest interval,
    // and where "optimal-pace" is real-evidenced as DISTINCT from "avg-pace" (75 vs 115 s/100m) -------------
    {
      sourceRowId: "csv-D-7",
      metric: "distance",
      value: "400",
      unit: "m",
      observedAt: T("2026-07-04T07:09:08.900Z"),
      deviceLabel: "Garmin Connect export",
      notes: "main set, interval 2, mixed strokes (source label: Mixto), 8 lengths",
    },
    { sourceRowId: "csv-D-7", metric: "duration", value: "460.1", unit: "s", observedAt: T("2026-07-04T07:09:08.900Z") }, // 7:40.1
    { sourceRowId: "csv-D-7", metric: "avg-pace", value: "115", unit: "s/100m", observedAt: T("2026-07-04T07:09:08.900Z") }, // 1:55 /100m
    { sourceRowId: "csv-D-7", metric: "optimal-pace", value: "75", unit: "s/100m", observedAt: T("2026-07-04T07:09:08.900Z") }, // 1:15 /100m
    { sourceRowId: "csv-D-7", metric: "swolf", value: "84", unit: "swolf", observedAt: T("2026-07-04T07:09:08.900Z") },
    { sourceRowId: "csv-D-7", metric: "avg-heart-rate", value: "119", unit: "bpm", observedAt: T("2026-07-04T07:09:08.900Z") },
    { sourceRowId: "csv-D-7", metric: "max-heart-rate", value: "125", unit: "bpm", observedAt: T("2026-07-04T07:09:08.900Z") },
    { sourceRowId: "csv-D-7", metric: "total-strokes", value: "215", unit: "strokes", observedAt: T("2026-07-04T07:09:08.900Z") },
    { sourceRowId: "csv-D-7", metric: "avg-strokes-per-length", value: "27", unit: "strokes/length", observedAt: T("2026-07-04T07:09:08.900Z") },
    { sourceRowId: "csv-D-7", metric: "calories", value: "75", unit: "kcal", observedAt: T("2026-07-04T07:09:08.900Z") },

    // --- csv line 136: "Resumen" — the whole-session summary, including BOTH real comma-grouped values ------
    {
      sourceRowId: "csv-D-136",
      metric: "distance",
      value: "3,200",
      unit: "m",
      observedAt: T("2026-07-04T08:24:38.000Z"),
      deviceLabel: "Garmin Connect export",
      notes: "session summary (source label: Resumen) — 64 lengths total",
    },
    { sourceRowId: "csv-D-136", metric: "duration", value: "5078", unit: "s", observedAt: T("2026-07-04T08:24:38.000Z") }, // 1:24:38 (h:mm:ss)
    { sourceRowId: "csv-D-136", metric: "avg-pace", value: "81", unit: "s/100m", observedAt: T("2026-07-04T08:24:38.000Z") }, // 1:21 /100m
    { sourceRowId: "csv-D-136", metric: "optimal-pace", value: "28", unit: "s/100m", observedAt: T("2026-07-04T08:24:38.000Z") }, // 0:28 /100m
    { sourceRowId: "csv-D-136", metric: "swolf", value: "58", unit: "swolf", observedAt: T("2026-07-04T08:24:38.000Z") },
    { sourceRowId: "csv-D-136", metric: "avg-heart-rate", value: "122", unit: "bpm", observedAt: T("2026-07-04T08:24:38.000Z") },
    { sourceRowId: "csv-D-136", metric: "max-heart-rate", value: "170", unit: "bpm", observedAt: T("2026-07-04T08:24:38.000Z") },
    { sourceRowId: "csv-D-136", metric: "total-strokes", value: "1,125", unit: "strokes", observedAt: T("2026-07-04T08:24:38.000Z") },
    { sourceRowId: "csv-D-136", metric: "avg-strokes-per-length", value: "18", unit: "strokes/length", observedAt: T("2026-07-04T08:24:38.000Z") },
    { sourceRowId: "csv-D-136", metric: "calories", value: "653", unit: "kcal", observedAt: T("2026-07-04T08:24:38.000Z") },
  ],
};
