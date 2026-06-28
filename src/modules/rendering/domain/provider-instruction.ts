// rendering domain: ProviderInstruction — STRUCTURED phrasing instruction material, derived purely from the
// already-constrained ProviderRenderingRequest (Impl 017). It is data, NOT a prompt-template file. Prompts
// are for phrasing, not reasoning: there is no field for arbitrary caller prompt text, chain-of-thought,
// hidden reasoning, voice override, hide-uncertainty/ignore-validation instructions, or a mutable handle —
// they are unrepresentable.

import type { VoiceMode } from "../../decision-support/index.ts";
import type { RenderableKind } from "./renderable-domain-output.ts";
import type { RenderingStyle } from "./rendering-request.ts";
import type { ProviderRenderingRequest } from "./provider-rendering-request.ts";

export interface ProviderInstruction {
  readonly kind: RenderableKind;
  readonly voice?: VoiceMode; // domain-selected; never set/changed by the provider
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitations: readonly string[];
  readonly traceabilitySummary?: string;
  readonly traceabilityStatus?: string;
  readonly style?: RenderingStyle;
  readonly locale?: string;
  readonly maxLength?: number;
}

/** Pure projection of the constrained provider request — copies only safe, domain-approved fields. */
export function providerInstructionFrom(request: ProviderRenderingRequest): ProviderInstruction {
  return Object.freeze({
    kind: request.kind,
    ...(request.voice !== undefined ? { voice: request.voice } : {}),
    allowedClaims: Object.freeze([...request.allowedClaims]),
    forbiddenClaims: Object.freeze([...request.forbiddenClaims]),
    uncertaintyVisibleRequired: request.uncertaintyVisibleRequired,
    limitations: Object.freeze([...request.limitations]),
    ...(request.traceabilitySummary !== undefined ? { traceabilitySummary: request.traceabilitySummary } : {}),
    ...(request.traceabilityStatus !== undefined ? { traceabilityStatus: request.traceabilityStatus } : {}),
    ...(request.style !== undefined ? { style: request.style } : {}),
    ...(request.locale !== undefined ? { locale: request.locale } : {}),
    ...(request.maxLength !== undefined ? { maxLength: request.maxLength } : {}),
  });
}
