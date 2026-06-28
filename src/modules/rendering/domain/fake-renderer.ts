// rendering domain: a DETERMINISTIC fake renderer. No external call, no provider, no model, no
// randomness — same request always yields the same text. It composes a faithful draft from the
// renderable's domain-approved atoms; it never adds advice, never escalates voice, never invents.
// It is NOT the safety guarantee — every draft still passes the mandatory validator (see `render`).

import type { RenderingRequest } from "./rendering-request.ts";
import type { RenderableDomainOutput } from "./renderable-domain-output.ts";
import type { RenderOutcome } from "./rendered-message.ts";
import type { RenderingFailure } from "./rendering-failure.ts";
import { validateDraft } from "./rendering-validator.ts";

function limitationsClause(r: RenderableDomainOutput): string {
  return r.limitations.length > 0 ? ` Limitations: ${r.limitations.join(", ")}.` : "";
}

function freshnessClause(r: RenderableDomainOutput): string {
  return r.freshness !== undefined && r.freshness !== "current" ? ` (freshness: ${r.freshness}.)` : "";
}

function traceabilityClause(r: RenderableDomainOutput): string {
  if (r.traceability === undefined) return "";
  return r.traceability.status === "complete"
    ? " Traced to recorded observations."
    : ` Note: evidence is ${r.traceability.status}.`; // gap preserved; never claims completeness
}

/** Deterministic draft text for a renderable. Faithful by construction; verified by the validator. */
export function fakeRenderText(r: RenderableDomainOutput): string {
  const body = r.contentAtoms.join("; ");
  if (r.kind === "inquiry") {
    const [question, whatNeeded] = [r.contentAtoms[0] ?? "", r.contentAtoms[1] ?? ""];
    const q = /[?]\s*$/.test(question) ? question : `${question.replace(/\.?\s*$/, "")}?`;
    const need = whatNeeded.length > 0 ? ` To explore it, this would help: ${whatNeeded}.` : "";
    return `Aurora needs to ask: ${q}${need}${limitationsClause(r)}`.trim();
  }
  if (r.kind === "withholding") {
    return `Aurora is not offering guidance here. Reason: ${body}.${limitationsClause(r)}`.trim();
  }
  // support — tone matches the domain voice; it may only match or soften, never escalate.
  const trace = traceabilityClause(r);
  const fresh = freshnessClause(r);
  switch (r.voice) {
    case "Recommendation": {
      const conds = r.conditions.length > 0 ? ` This holds under: ${r.conditions.join(", ")}.` : "";
      const agency = r.agencyRequired ? " It remains your decision." : "";
      return `Something you could weigh: ${body}.${conds} This may be incomplete.${agency}${trace}${fresh}${limitationsClause(r)}`.trim();
    }
    case "Warning":
      return `A caution worth noting: ${body}. This may be incomplete.${trace}${fresh}${limitationsClause(r)}`.trim();
    case "Framing":
      return `For framing: ${body}. This is context, and it may be incomplete.${trace}${fresh}${limitationsClause(r)}`.trim();
    case "Reflection":
    default:
      return `Reflecting on what we have: ${body}. This may be incomplete.${trace}${fresh}${limitationsClause(r)}`.trim();
  }
}

/** Deterministic draft (or a structural failure when there is nothing faithful to render). */
export function fakeRender(
  request: RenderingRequest,
): { readonly status: "draft"; readonly text: string } | { readonly status: "failed"; readonly failures: readonly RenderingFailure[] } {
  if (request.renderable.contentAtoms.length === 0) {
    return Object.freeze({ status: "failed", failures: Object.freeze(["missing-terminal-output" as const]) });
  }
  return Object.freeze({ status: "draft", text: fakeRenderText(request.renderable) });
}

/** Public entry: deterministic draft, then MANDATORY validation. Never returns unsafe text. */
export function render(request: RenderingRequest): RenderOutcome {
  const drafted = fakeRender(request);
  if (drafted.status === "failed") {
    return Object.freeze({ status: "failed", failures: drafted.failures });
  }
  return validateDraft({ draft: drafted.text, renderable: request.renderable, request });
}
