// rendering tests: hand-built RenderableDomainOutputs and requests (no decision-support needed for unit
// tests; the neutral integration test exercises the real builder). Not a .test. file.

import type { RenderableDomainOutput } from "../index.ts";
import type { RenderingRequest } from "../index.ts";

export function supportRenderable(over: Partial<RenderableDomainOutput> = {}): RenderableDomainOutput {
  return {
    sourceCaseRef: "case:1",
    kind: "support",
    voice: "Reflection",
    intent: "reflect",
    contentAtoms: ["energy felt low in today's session"],
    allowedClaims: ["energy felt low in today's session"],
    forbiddenClaims: [],
    uncertaintyVisibleRequired: true,
    limitations: [],
    traceability: { status: "complete", summary: "resolved to the recorded set", observationSetId: "obs:1" },
    agencyRequired: true,
    conditions: [],
    ...over,
  };
}

/** A support renderable with NO voice (hand-crafted edge case for the validator). */
export function noVoiceSupportRenderable(): RenderableDomainOutput {
  return {
    sourceCaseRef: "case:1",
    kind: "support",
    intent: "reflect",
    contentAtoms: ["energy felt low"],
    allowedClaims: ["energy felt low"],
    forbiddenClaims: [],
    uncertaintyVisibleRequired: true,
    limitations: [],
    traceability: { status: "complete", summary: "resolved" },
    agencyRequired: true,
    conditions: [],
  };
}

export function inquiryRenderable(over: Partial<RenderableDomainOutput> = {}): RenderableDomainOutput {
  return {
    sourceCaseRef: "case:2",
    kind: "inquiry",
    contentAtoms: ["was the session harder than planned", "how the legs felt afterward"],
    allowedClaims: ["was the session harder than planned", "how the legs felt afterward"],
    forbiddenClaims: [],
    uncertaintyVisibleRequired: true,
    limitations: [],
    agencyRequired: true,
    conditions: [],
    ...over,
  };
}

export function withholdingRenderable(over: Partial<RenderableDomainOutput> = {}): RenderableDomainOutput {
  return {
    sourceCaseRef: "case:3",
    kind: "withholding",
    contentAtoms: ["insufficient traceable evidence for this question"],
    allowedClaims: ["insufficient traceable evidence for this question"],
    forbiddenClaims: [],
    uncertaintyVisibleRequired: true,
    limitations: [],
    agencyRequired: true,
    conditions: [],
    ...over,
  };
}

export function req(renderable: RenderableDomainOutput, over: Partial<RenderingRequest> = {}): RenderingRequest {
  return { renderable, ...over };
}
