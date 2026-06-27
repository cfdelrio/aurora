// rendering domain: ProviderRenderingRequest — a CONSTRAINED projection of a RenderingRequest +
// RenderableDomainOutput, handed to a (future/fake) provider so it can draft phrasing. It carries ONLY
// safe, domain-approved presentation inputs: no raw reasoning internals, no chain-of-thought, no mutable
// aggregate handles, no override-voice / hide-uncertainty / ignore-validation field, no arbitrary prompt
// text or metadata bag, no provider-specific payload. Those are UNREPRESENTABLE here (the interface has no
// such field), mirroring RenderingRequest. `providerRenderingRequestFrom` is the request-construction
// guard: it rejects unsafe requests BEFORE any provider call.

import type { VoiceMode } from "../../decision-support/index.ts";
import type { RenderableKind } from "./renderable-domain-output.ts";
import type { RenderingRequest, RenderingStyle } from "./rendering-request.ts";
import { isSafeStyle, isSupportedLocale } from "./rendering-request.ts";
import type { ProviderFailure } from "./provider-failure.ts";

export interface ProviderRenderingRequest {
  readonly sourceCaseRef: string; // ref, not a mutable handle
  readonly kind: RenderableKind; // terminal-output kind
  readonly voice?: VoiceMode; // domain-SELECTED voice (the ceiling); never set/changed by the provider
  readonly contentAtoms: readonly string[]; // domain-approved content
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitations: readonly string[];
  readonly traceabilitySummary?: string; // from renderable.traceability.summary; never invented
  readonly traceabilityStatus?: string; // status label so gaps stay visible
  readonly style?: RenderingStyle; // only a SAFE_STYLES member
  readonly locale?: string; // only a SUPPORTED_LOCALES member
  readonly maxLength?: number;
}

export type ProviderRenderingRequestOutcome =
  | { readonly status: "built"; readonly providerRequest: ProviderRenderingRequest }
  | { readonly status: "rejected"; readonly failure: ProviderFailure };

/**
 * Build a constrained ProviderRenderingRequest from the authoritative RenderingRequest, REJECTING unsafe
 * requests before any provider call: an unsupported style/locale, or a renderable with nothing faithful
 * to draft. Copies only the safe, domain-approved fields.
 */
export function providerRenderingRequestFrom(request: RenderingRequest): ProviderRenderingRequestOutcome {
  const r = request.renderable;

  if (request.style !== undefined && !isSafeStyle(request.style)) {
    return Object.freeze({ status: "rejected", failure: "unsupported-style" });
  }
  if (request.locale !== undefined && !isSupportedLocale(request.locale)) {
    return Object.freeze({ status: "rejected", failure: "unsupported-locale" });
  }
  if (r === undefined || !Array.isArray(r.contentAtoms) || r.contentAtoms.length === 0) {
    return Object.freeze({ status: "rejected", failure: "unsafe-provider-request" });
  }

  const providerRequest: ProviderRenderingRequest = Object.freeze({
    sourceCaseRef: r.sourceCaseRef,
    kind: r.kind,
    ...(r.voice !== undefined ? { voice: r.voice } : {}),
    contentAtoms: Object.freeze([...r.contentAtoms]),
    allowedClaims: Object.freeze([...r.allowedClaims]),
    forbiddenClaims: Object.freeze([...r.forbiddenClaims]),
    uncertaintyVisibleRequired: r.uncertaintyVisibleRequired,
    limitations: Object.freeze([...r.limitations]),
    ...(r.traceability !== undefined ? { traceabilitySummary: r.traceability.summary } : {}),
    ...(r.traceability !== undefined ? { traceabilityStatus: r.traceability.status } : {}),
    ...(request.style !== undefined ? { style: request.style as RenderingStyle } : {}),
    ...(request.locale !== undefined ? { locale: request.locale } : {}),
    ...(request.maxLength !== undefined ? { maxLength: request.maxLength } : {}),
  });
  return Object.freeze({ status: "built", providerRequest });
}
