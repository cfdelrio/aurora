// Implementation 035-A — behavior of the Tier 2 external renderable admission check (Spec 035 / Tech Spec 035A).
// admitExternalRenderable is a PURE, SYNCHRONOUS structural pre-screen: it inspects only the renderable's
// contract fields and admits or fails closed with a safe reason code. It owns no whole-core chain, calls no
// provider, runs no validateDraft, performs no delivery, creates no AthleteDecision. Deterministic; uses the
// rendering fixtures + hand-built edge cases. admitted ≠ truth ≠ evidence-backed fact ≠ recommendation quality.

import { test } from "node:test";
import assert from "node:assert/strict";

import { admitExternalRenderable, EXTERNAL_RENDERABLE_ADMISSION_STATUSES } from "../index.ts";
import type { RenderingRequest } from "../../rendering/index.ts";
import type { RenderableDomainOutput } from "../../rendering/index.ts";
import { req, supportRenderable, inquiryRenderable, withholdingRenderable, noVoiceSupportRenderable } from "../../rendering/tests/fixtures.ts";

// supportRenderable() default: kind "support", voice "Reflection", uncertaintyVisibleRequired true,
// agencyRequired true, allowedClaims ["..."], forbiddenClaims [], traceability { status:"complete", ... }.

// --- admit safe renderables -----------------------------------------------------------------------

test("a safe support renderable with all required contract fields is admitted", () => {
  const out = admitExternalRenderable(req(supportRenderable()));
  assert.equal(out.status, "admitted");
  assert.equal(out.admitted, true);
  assert.equal(out.reason, undefined);
  assert.ok(EXTERNAL_RENDERABLE_ADMISSION_STATUSES.includes(out.status));
});

test("a safe inquiry renderable with required contract fields is admitted", () => {
  // inquiryRenderable carries allowedClaims + uncertaintyVisibleRequired + agencyRequired, but no traceability
  // by default → it is claim-bearing, so traceability is required. Supply one to be admissible.
  const out = admitExternalRenderable(req(inquiryRenderable({ traceability: { status: "complete", summary: "resolved to the recorded set" } })));
  assert.equal(out.status, "admitted");
});

test("a withholding renderable is admitted (a safe non-claim disposition; voice not required)", () => {
  const out = admitExternalRenderable(req(withholdingRenderable()));
  assert.equal(out.status, "admitted");
});

// --- fail closed: provenance ----------------------------------------------------------------------

test("missing/blank sourceCaseRef fails closed → rejected-missing-provenance", () => {
  const out = admitExternalRenderable(req(supportRenderable({ sourceCaseRef: "   " })));
  assert.equal(out.status, "rejected-missing-provenance");
  assert.equal(out.admitted, false);
  assert.equal(out.reason, "rejected-missing-provenance");
});

// --- fail closed: traceability (claim-bearing) ----------------------------------------------------

test("a support renderable without traceability fails closed → rejected-missing-traceability", () => {
  const r = supportRenderable();
  const { traceability: _omit, ...withoutTrace } = r as RenderableDomainOutput & { traceability?: unknown };
  const out = admitExternalRenderable(req(withoutTrace as RenderableDomainOutput));
  assert.equal(out.status, "rejected-missing-traceability");
});

test("a support renderable with a blank traceability summary fails closed → rejected-missing-traceability", () => {
  const out = admitExternalRenderable(req(supportRenderable({ traceability: { status: "complete", summary: "  " } })));
  assert.equal(out.status, "rejected-missing-traceability");
});

// --- fail closed: kind ----------------------------------------------------------------------------

test("an unsupported kind fails closed → rejected-unsupported-kind", () => {
  // simulate an untyped external caller supplying a bad kind
  const bad = { ...supportRenderable(), kind: "directive" } as unknown as RenderableDomainOutput;
  const out = admitExternalRenderable({ renderable: bad } as RenderingRequest);
  assert.equal(out.status, "rejected-unsupported-kind");
});

// --- fail closed: voice ceiling (support) ---------------------------------------------------------

test("a support renderable with voice Recommendation fails closed → rejected-unsafe-voice", () => {
  const out = admitExternalRenderable(req(supportRenderable({ voice: "Recommendation" })));
  assert.equal(out.status, "rejected-unsafe-voice");
});

test("a support renderable with voice Silence fails closed → rejected-unsafe-voice", () => {
  const out = admitExternalRenderable(req(supportRenderable({ voice: "Silence" })));
  assert.equal(out.status, "rejected-unsafe-voice");
});

test("a support renderable with no voice fails closed → rejected-unsafe-voice", () => {
  // noVoiceSupportRenderable is a support renderable with NO voice
  const out = admitExternalRenderable(req(noVoiceSupportRenderable()));
  assert.equal(out.status, "rejected-unsafe-voice");
});

test("a support renderable with voice Framing or Warning is admitted (advisory, not prescriptive)", () => {
  for (const voice of ["Reflection", "Framing", "Warning"] as const) {
    const out = admitExternalRenderable(req(supportRenderable({ voice })));
    assert.equal(out.status, "admitted", `voice ${voice} should be admissible`);
  }
});

// --- fail closed: uncertainty hidden --------------------------------------------------------------

test("uncertaintyVisibleRequired false fails closed → rejected-uncertainty-hidden", () => {
  const out = admitExternalRenderable(req(supportRenderable({ uncertaintyVisibleRequired: false })));
  assert.equal(out.status, "rejected-uncertainty-hidden");
});

// --- fail closed: agency --------------------------------------------------------------------------

test("agencyRequired false fails closed → rejected-agency-missing", () => {
  const out = admitExternalRenderable(req(supportRenderable({ agencyRequired: false })));
  assert.equal(out.status, "rejected-agency-missing");
});

// --- fail closed: claim fields --------------------------------------------------------------------

test("a support renderable with empty allowedClaims fails closed → rejected-claim-fields-missing", () => {
  const out = admitExternalRenderable(req(supportRenderable({ allowedClaims: [] })));
  assert.equal(out.status, "rejected-claim-fields-missing");
});

test("non-array claim fields fail closed → rejected-claim-fields-missing", () => {
  const bad = { ...supportRenderable(), forbiddenClaims: undefined } as unknown as RenderableDomainOutput;
  const out = admitExternalRenderable({ renderable: bad } as RenderingRequest);
  assert.equal(out.status, "rejected-claim-fields-missing");
});

// LIMITATION (documented): empty forbiddenClaims is ADMISSIBLE — the canonical safe support renderable carries
// forbiddenClaims: []. Tier 2 cannot require non-empty forbiddenClaims without rejecting the standard fixture.
test("empty forbiddenClaims is admissible (canonical safe support renderable carries forbiddenClaims: [])", () => {
  const out = admitExternalRenderable(req(supportRenderable({ forbiddenClaims: [] })));
  assert.equal(out.status, "admitted");
});

// --- what admitted does NOT mean (Tier 1 is not provable here) ------------------------------------

test("admitted means only structural admissibility — not truth, evidence, or recommendation quality", () => {
  // A structurally-valid support renderable whose allowedClaims are arbitrary text is STILL admitted: Tier 2
  // cannot verify the claims are evidence-backed, justified, wise, or high quality. That is Tier 1 / the
  // whole-core harness, never re-derived here.
  const out = admitExternalRenderable(req(supportRenderable({ allowedClaims: ["this could be any caller-supplied claim"], contentAtoms: ["this could be any caller-supplied claim"] })));
  assert.equal(out.status, "admitted");
  // the admission carries no claim that the content is true / evidence-backed / high quality
  const json = JSON.stringify(out);
  for (const banned of ["true-fact", "evidence-backed", "recommendation-quality", "verified"]) {
    assert.equal(json.includes(banned), false);
  }
});

// --- purity / no side effects ---------------------------------------------------------------------

test("admitExternalRenderable is synchronous and returns only a safe closed result", () => {
  const out = admitExternalRenderable(req(supportRenderable()));
  assert.equal(typeof (out as { then?: unknown }).then, "undefined", "must be synchronous (not a Promise)");
  // result keys are limited to status / admitted / reason — no renderable body, no hidden reasoning
  assert.deepEqual(Object.keys(out).sort(), ["admitted", "status"]);
});

test("a rejection result carries only a safe closed reason code (no raw content / hidden reasoning)", () => {
  const out = admitExternalRenderable(req(supportRenderable({ sourceCaseRef: "" })));
  assert.equal(out.admitted, false);
  assert.ok(EXTERNAL_RENDERABLE_ADMISSION_STATUSES.includes(out.status));
  assert.equal(out.reason, out.status);
  assert.deepEqual(Object.keys(out).sort(), ["admitted", "reason", "status"]);
});

// --- catalog integrity ----------------------------------------------------------------------------

test("the admission status catalog is closed and complete", () => {
  assert.deepEqual(
    [...EXTERNAL_RENDERABLE_ADMISSION_STATUSES].sort(),
    [
      "admitted",
      "rejected-agency-missing",
      "rejected-claim-fields-missing",
      "rejected-missing-provenance",
      "rejected-missing-traceability",
      "rejected-uncertainty-hidden",
      "rejected-unsafe-voice",
      "rejected-unsupported-kind",
    ],
  );
});
