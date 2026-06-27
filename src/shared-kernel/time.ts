// shared-kernel: timestamps.
// A Timestamp is an immutable instant. No interpretation, no timezone reasoning beyond UTC instant.

export interface Timestamp {
  readonly epochMillis: number;
  readonly iso: string;
}

export function timestamp(value: string | number | Date): Timestamp {
  const date =
    value instanceof Date ? value : typeof value === "number" ? new Date(value) : new Date(value);
  const epochMillis = date.getTime();
  if (Number.isNaN(epochMillis)) {
    throw new Error(`Invalid timestamp: ${String(value)}`);
  }
  return Object.freeze({ epochMillis, iso: date.toISOString() });
}

/** a <= b */
export function timestampLeq(a: Timestamp, b: Timestamp): boolean {
  return a.epochMillis <= b.epochMillis;
}

/** earliest of a non-empty list */
export function earliest(timestamps: readonly Timestamp[]): Timestamp | undefined {
  return timestamps.reduce<Timestamp | undefined>(
    (min, t) => (min === undefined || t.epochMillis < min.epochMillis ? t : min),
    undefined,
  );
}

/** latest of a non-empty list */
export function latest(timestamps: readonly Timestamp[]): Timestamp | undefined {
  return timestamps.reduce<Timestamp | undefined>(
    (max, t) => (max === undefined || t.epochMillis > max.epochMillis ? t : max),
    undefined,
  );
}
