// rendering domain: RenderingRequest — a request to phrase a RenderableDomainOutput. It allows only
// SAFE constraints; it has NO field to override voice, hide uncertainty, ignore traceability, "be
// decisive", or inject an arbitrary prompt/metadata bag. An escalation like "be decisive" is simply
// not a member of SAFE_STYLES, so it is refused (unsupported-style-request) rather than obeyed.

import type { RenderableDomainOutput } from "./renderable-domain-output.ts";

export type RenderingStyle = "shorter" | "longer" | "clearer" | "warmer" | "more-formal";

export const SAFE_STYLES: readonly RenderingStyle[] = ["shorter", "longer", "clearer", "warmer", "more-formal"];

export const SUPPORTED_LOCALES: readonly string[] = ["en"];

export interface RenderingRequest {
  readonly renderable: RenderableDomainOutput;
  /** only a supported locale; anything else → unsupported-language-request */
  readonly locale?: string;
  /** validated against SAFE_STYLES; an unknown style (e.g. "be decisive") → unsupported-style-request */
  readonly style?: string;
  readonly maxLength?: number;
  /** domain-approved audience context only */
  readonly audience?: string;
}

export function isSafeStyle(style: string): style is RenderingStyle {
  return (SAFE_STYLES as readonly string[]).includes(style);
}

export function isSupportedLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale);
}
