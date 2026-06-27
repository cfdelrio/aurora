// event-recording domain: which Aurora domain module a recorded occurrence belongs to.
// These are *names* (string literals) only — event-recording imports none of those modules.

export type ProducingModule =
  | "observation"
  | "reasoning"
  | "understanding"
  | "decision-support"
  | "athlete";

export const PRODUCING_MODULES: readonly ProducingModule[] = [
  "observation",
  "reasoning",
  "understanding",
  "decision-support",
  "athlete",
];

export function isProducingModule(value: unknown): value is ProducingModule {
  return (
    value === "observation" ||
    value === "reasoning" ||
    value === "understanding" ||
    value === "decision-support" ||
    value === "athlete"
  );
}
