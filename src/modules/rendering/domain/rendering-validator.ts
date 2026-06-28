// rendering domain: the MANDATORY validator. Every draft — including the deterministic fake renderer's —
// must pass this before becoming a RenderedMessage. The validator, not the renderer, is the safety
// guarantee: it can only PRESERVE or CONSTRAIN, never enable. Checks are structural/string-based (no NLP).

import type { RenderableDomainOutput } from "./renderable-domain-output.ts";
import type { RenderingRequest } from "./rendering-request.ts";
import { isSafeStyle, isSupportedLocale } from "./rendering-request.ts";
import type { RenderOutcome, RenderedMessage } from "./rendered-message.ts";
import type { RenderingFailure } from "./rendering-failure.ts";
import {
  hasAdviceCue,
  hasCompletenessClaim,
  hasForbiddenDomainCue,
  hasRecommendationCue,
  hasUncertaintyMarker,
} from "./rendering-policy.ts";

export interface ValidateDraftInput {
  readonly draft: string;
  readonly renderable: RenderableDomainOutput;
  readonly request: RenderingRequest;
}

export function validateDraft(input: ValidateDraftInput): RenderOutcome {
  const { draft, renderable, request } = input;
  const lower = draft.toLowerCase();
  const failures: RenderingFailure[] = [];

  // --- structural / request safety ---------------------------------------------------------------
  if (renderable.contentAtoms.length === 0 || draft.trim().length === 0) failures.push("missing-terminal-output");
  if (request.style !== undefined && !isSafeStyle(request.style)) failures.push("unsupported-style-request");
  if (request.locale !== undefined && !isSupportedLocale(request.locale)) failures.push("unsupported-language-request");
  if (hasForbiddenDomainCue(lower)) failures.push("unsafe-rendering-request");

  // --- invented facts / unavailable citations ----------------------------------------------------
  for (const forbidden of renderable.forbiddenClaims) {
    if (forbidden.length > 0 && lower.includes(forbidden.toLowerCase())) {
      failures.push("invented-fact");
      break;
    }
  }

  // --- voice / kind preservation -----------------------------------------------------------------
  if (renderable.kind === "support") {
    if (hasRecommendationCue(lower) && renderable.voice !== "Recommendation") {
      failures.push(renderable.voice === undefined ? "recommendation-created-by-renderer" : "voice-escalation");
    }
  } else if (renderable.kind === "inquiry") {
    if (hasAdviceCue(lower)) failures.push("inquiry-rendered-as-answer");
    // an inquiry must read as a question / clarification request
    if (!lower.includes("?") && !lower.includes("needs to ask") && !lower.includes("clarif")) {
      failures.push("inquiry-rendered-as-answer");
    }
  } else {
    // withholding
    if (hasAdviceCue(lower)) failures.push("withholding-rendered-as-advice");
  }

  // --- uncertainty / limitations / traceability visibility ---------------------------------------
  if (renderable.uncertaintyVisibleRequired && !hasUncertaintyMarker(lower)) {
    failures.push("uncertainty-hidden");
  }
  for (const limitation of renderable.limitations) {
    if (limitation.length > 0 && !lower.includes(limitation.toLowerCase())) {
      failures.push("limitation-hidden");
      break;
    }
  }
  if (
    renderable.traceability !== undefined &&
    (renderable.traceability.status === "missing" || renderable.traceability.status === "invalid") &&
    hasCompletenessClaim(lower)
  ) {
    failures.push("missing-traceability");
  }

  if (failures.length > 0) {
    return Object.freeze({ status: "failed", failures: Object.freeze([...new Set(failures)]) });
  }

  // --- success: preserved flags + soft warnings --------------------------------------------------
  const warnings: string[] = [];
  if (renderable.freshness !== undefined && renderable.freshness !== "current") {
    warnings.push(`freshness ${renderable.freshness}: consume with caution`);
  }
  if (renderable.traceability !== undefined && renderable.traceability.status !== "complete") {
    warnings.push(`traceability ${renderable.traceability.status}`);
  }

  const message: RenderedMessage = Object.freeze({
    text: draft,
    sourceRef: renderable.sourceCaseRef,
    kind: renderable.kind,
    ...(renderable.voice !== undefined ? { voice: renderable.voice } : {}),
    uncertaintyPreserved: true,
    limitationsPreserved: true,
    traceabilityPreserved: true,
    warnings: Object.freeze(warnings),
  });
  return Object.freeze({ status: "rendered", message });
}
