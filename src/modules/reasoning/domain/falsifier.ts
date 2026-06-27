// reasoning domain: a Falsifier — an explicit condition that would weaken/defeat/require revision.
// A hypothesis with no falsifier (and no explicit pending reason) is not acceptable reasoning.

export type FalsifierStatus = "declared" | "pending";

export interface Falsifier {
  readonly condition: string;
  readonly status: FalsifierStatus;
  readonly pendingReason?: string;
}

export interface FalsifierInput {
  readonly condition: string;
  readonly status: FalsifierStatus;
  readonly pendingReason?: string;
}

export function falsifier(input: FalsifierInput): Falsifier {
  if (typeof input.condition !== "string" || input.condition.length === 0) {
    throw new Error("Falsifier requires a non-empty condition");
  }
  if (input.status === "pending" && (input.pendingReason === undefined || input.pendingReason.length === 0)) {
    throw new Error("A pending Falsifier requires an explicit pendingReason");
  }
  const f: Falsifier = {
    condition: input.condition,
    status: input.status,
    ...(input.pendingReason !== undefined ? { pendingReason: input.pendingReason } : {}),
  };
  return Object.freeze(f);
}
