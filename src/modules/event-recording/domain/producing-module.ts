// event-recording domain: which Aurora domain module a recorded occurrence belongs to.
// These are *names* (string literals) only — event-recording imports none of those modules.

export type ProducingModule =
  | "observation"
  | "reasoning"
  | "understanding"
  | "decision-support"
  | "athlete"
  // downstream output-out modules (Impl 024) — provider events are produced by `rendering` (provider lives there)
  | "rendering"
  | "delivery";

export const PRODUCING_MODULES: readonly ProducingModule[] = [
  "observation",
  "reasoning",
  "understanding",
  "decision-support",
  "athlete",
  "rendering",
  "delivery",
];

export function isProducingModule(value: unknown): value is ProducingModule {
  return (
    value === "observation" ||
    value === "reasoning" ||
    value === "understanding" ||
    value === "decision-support" ||
    value === "athlete" ||
    value === "rendering" ||
    value === "delivery"
  );
}
