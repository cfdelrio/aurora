// rendering domain: the closed catalog of reasons a draft is refused. A failure produces NO rendered
// message (safe non-render) — never unsafe text (Spec 014 invariant 20).

export type RenderingFailure =
  | "missing-terminal-output"
  | "missing-traceability"
  | "voice-escalation"
  | "invented-fact"
  | "uncertainty-hidden"
  | "limitation-hidden"
  | "withholding-rendered-as-advice"
  | "inquiry-rendered-as-answer"
  | "recommendation-created-by-renderer"
  | "unsupported-style-request"
  | "unsupported-language-request"
  | "unsafe-rendering-request";

export const RENDERING_FAILURES: readonly RenderingFailure[] = [
  "missing-terminal-output",
  "missing-traceability",
  "voice-escalation",
  "invented-fact",
  "uncertainty-hidden",
  "limitation-hidden",
  "withholding-rendered-as-advice",
  "inquiry-rendered-as-answer",
  "recommendation-created-by-renderer",
  "unsupported-style-request",
  "unsupported-language-request",
  "unsafe-rendering-request",
];
