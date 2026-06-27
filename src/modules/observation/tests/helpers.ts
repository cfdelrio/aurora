// test helpers — not a test file (no .test. suffix), so the runner ignores it.

import { timestamp } from "../../../shared-kernel/time.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { Provenance, Source } from "../../../shared-kernel/provenance.ts";

export function ts(iso: string): Timestamp {
  return timestamp(iso);
}

export function deviceProvenance(overrides: Partial<Provenance> = {}): Provenance {
  return {
    source: "device" as Source,
    captureTime: ts("2026-01-01T07:00:00.000Z"),
    recordingTime: ts("2026-01-01T07:05:00.000Z"),
    reference: "device:fit:abc123",
    ...overrides,
  };
}

export function athleteProvenance(overrides: Partial<Provenance> = {}): Provenance {
  return {
    source: "athlete-report" as Source,
    captureTime: ts("2026-01-01T08:00:00.000Z"),
    recordingTime: ts("2026-01-01T08:01:00.000Z"),
    reference: "athlete:report:xyz789",
    ...overrides,
  };
}
