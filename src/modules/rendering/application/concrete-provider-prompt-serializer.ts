// rendering application: concrete-provider prompt serializer (Impl 020). A PURE, deterministic projection of
// a ProviderInstruction into a neutral, provider-shaped request PAYLOAD object. It is data, not a prompt
// template file: it copies ONLY the already-constrained, domain-approved safety fields. There is no field
// for an arbitrary prompt string, chain-of-thought, hidden reasoning, voice override, hide-uncertainty,
// ignore-validation instruction, a mutable aggregate handle, or any secret — all are unrepresentable in the
// input ProviderInstruction (Impl 019), so none can reach the payload here.

import type { ProviderInstruction, RenderableKind, RenderingStyle } from "../domain/index.ts";
import type { VoiceMode } from "../../decision-support/index.ts";

/** A neutral, provider-shaped request payload — only safe, derived constraints; no vendor token, no secret. */
export interface ConcreteProviderRequestPayload {
  readonly terminalOutputKind: RenderableKind;
  readonly voice?: VoiceMode; // domain-selected; the provider may never set/change it
  readonly style?: RenderingStyle;
  readonly locale?: string;
  readonly maxLength?: number;
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitationsVisible: readonly string[];
  readonly traceabilitySummary?: string;
  readonly traceabilityStatus?: string;
}

/** Pure, deterministic projection of the constrained instruction — copies only safe, domain-approved fields. */
export function serializeProviderInstruction(instruction: ProviderInstruction): ConcreteProviderRequestPayload {
  return Object.freeze({
    terminalOutputKind: instruction.kind,
    ...(instruction.voice !== undefined ? { voice: instruction.voice } : {}),
    ...(instruction.style !== undefined ? { style: instruction.style } : {}),
    ...(instruction.locale !== undefined ? { locale: instruction.locale } : {}),
    ...(instruction.maxLength !== undefined ? { maxLength: instruction.maxLength } : {}),
    allowedClaims: Object.freeze([...instruction.allowedClaims]),
    forbiddenClaims: Object.freeze([...instruction.forbiddenClaims]),
    uncertaintyVisibleRequired: instruction.uncertaintyVisibleRequired,
    limitationsVisible: Object.freeze([...instruction.limitations]),
    ...(instruction.traceabilitySummary !== undefined ? { traceabilitySummary: instruction.traceabilitySummary } : {}),
    ...(instruction.traceabilityStatus !== undefined ? { traceabilityStatus: instruction.traceabilityStatus } : {}),
  });
}
