// rendering application: FakeProviderAdapter — a DETERMINISTIC, in-process provider double. No randomness,
// no external call, no SDK, no network, no env reads. It exists only to prove the provider seam: per a
// fixed scenario it returns either a draft (safe, or deliberately unsafe to exercise a specific validator
// failure) or a provider failure. The validator — not this adapter — is the safety guarantee.

import type { ProviderRenderingRequest, ProviderDraftOutcome } from "../domain/index.ts";
import type { ProviderAdapter } from "./provider-adapter.ts";

export type FakeProviderScenario =
  | "safe"
  | "voice-escalating"
  | "invented-fact"
  | "uncertainty-hidden"
  | "limitation-hidden"
  | "inquiry-as-answer"
  | "withholding-as-advice"
  | "empty-draft"
  | "invalid"
  | "unavailable"
  | "timeout"
  | "rate-limited"
  | "refused";

function body(request: ProviderRenderingRequest): string {
  return request.contentAtoms.join("; ");
}

function limitationsClause(request: ProviderRenderingRequest): string {
  return request.limitations.length > 0 ? ` Limitations: ${request.limitations.join(", ")}.` : "";
}

/** A faithful draft that passes the mandatory validator for the request's kind/voice. */
function safeText(request: ProviderRenderingRequest): string {
  const b = body(request);
  if (request.kind === "inquiry") {
    return `Aurora needs to ask: ${b}?`;
  }
  if (request.kind === "withholding") {
    return `Aurora is not offering guidance here. Reason: ${b}.${limitationsClause(request)}`;
  }
  // support — reflective, softened phrasing; visible uncertainty; no recommendation cue.
  return `Reflecting on what we have: ${b}. This may be incomplete.${limitationsClause(request)}`;
}

export class FakeProviderAdapter implements ProviderAdapter {
  readonly kind = "fake";
  private readonly scenario: FakeProviderScenario;

  constructor(opts?: { readonly scenario?: FakeProviderScenario }) {
    this.scenario = opts?.scenario ?? "safe";
  }

  draft(request: ProviderRenderingRequest): ProviderDraftOutcome {
    const drafted = (text: string): ProviderDraftOutcome =>
      Object.freeze({ status: "drafted", draft: Object.freeze({ text, providerKind: this.kind, warnings: Object.freeze([]) }) });
    const b = body(request);

    switch (this.scenario) {
      case "safe":
        return drafted(safeText(request));
      case "voice-escalating":
        // a recommendation cue where the domain voice is not Recommendation → voice-escalation
        return drafted(`You should ${b}. This may be incomplete.${limitationsClause(request)}`);
      case "invented-fact": {
        const fact = request.forbiddenClaims[0] ?? "an invented detail not in the approved content";
        return drafted(`Reflecting on what we have: ${b}. ${fact}. This may be incomplete.${limitationsClause(request)}`);
      }
      case "uncertainty-hidden":
        // no uncertainty marker at all
        return drafted(`Here is the assessment: ${b}.`);
      case "limitation-hidden":
        // visible uncertainty, but the required limitation is omitted
        return drafted(`Reflecting on what we have: ${b}. This may be incomplete.`);
      case "inquiry-as-answer":
        return drafted(`You should ${b}.`);
      case "withholding-as-advice":
        return drafted(`You should ${b}.`);
      case "empty-draft":
        return Object.freeze({ status: "failed", failure: "provider-returned-empty-draft" });
      case "invalid":
        return Object.freeze({ status: "failed", failure: "provider-returned-invalid-draft" });
      case "unavailable":
        return Object.freeze({ status: "failed", failure: "provider-unavailable" });
      case "timeout":
        return Object.freeze({ status: "failed", failure: "provider-timeout" });
      case "rate-limited":
        return Object.freeze({ status: "failed", failure: "provider-rate-limited" });
      case "refused":
        return Object.freeze({ status: "failed", failure: "provider-refused" });
    }
  }
}
