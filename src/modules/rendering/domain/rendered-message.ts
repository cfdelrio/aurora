// rendering domain: RenderedMessage — the presentation artifact. It is downstream of the domain and is
// NEVER domain authority: it is not Evidence, Observation, Understanding, or AthleteDecision, and it is
// not source truth. It carries no aggregate-write path; later reasoning must not re-ingest it (unless the
// athlete separately reports it back through the manual input adapter, Impl 013).

import type { RenderableKind } from "./renderable-domain-output.ts";
import type { VoiceMode } from "../../decision-support/index.ts";
import type { RenderingFailure } from "./rendering-failure.ts";

export interface RenderedMessage {
  readonly text: string;
  readonly sourceRef: string; // = renderable.sourceCaseRef
  readonly kind: RenderableKind; // preserved
  readonly voice?: VoiceMode; // preserved (support)
  readonly uncertaintyPreserved: boolean;
  readonly limitationsPreserved: boolean;
  readonly traceabilityPreserved: boolean;
  readonly warnings: readonly string[];
}

export type RenderOutcome =
  | { readonly status: "rendered"; readonly message: RenderedMessage }
  | { readonly status: "failed"; readonly failures: readonly RenderingFailure[] };
