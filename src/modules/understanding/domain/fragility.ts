// understanding domain: Fragility — how exposed a level is. Qualitative, no numeric score.

export type FragilityLevel = "low" | "elevated" | "high";

export interface Fragility {
  readonly level: FragilityLevel;
  readonly reasons: readonly string[];
}

export function fragility(level: FragilityLevel, reasons: readonly string[] = []): Fragility {
  return Object.freeze({ level, reasons: Object.freeze([...reasons]) });
}

const FRAGILITY_ORDER: readonly FragilityLevel[] = ["low", "elevated", "high"];

export function raiseFragility(current: Fragility, reason: string): Fragility {
  const rank = FRAGILITY_ORDER.indexOf(current.level);
  const next = (FRAGILITY_ORDER[Math.min(rank + 1, FRAGILITY_ORDER.length - 1)] ?? "high") as FragilityLevel;
  return fragility(next, [...current.reasons, reason]);
}
