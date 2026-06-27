// Implementation 014 — rendering boundary behavior (Spec 014 UC1-UC10, happy + preservation paths).
// The renderer expresses the domain's decision; it never escalates voice, hides uncertainty, or invents.

import { test } from "node:test";
import assert from "node:assert/strict";

import { render, hasRecommendationCue, hasAdviceCue } from "../index.ts";
import { inquiryRenderable, req, supportRenderable, withholdingRenderable } from "./fixtures.ts";

function rendered(outcome: ReturnType<typeof render>) {
  assert.equal(outcome.status, "rendered", `expected rendered, got ${JSON.stringify(outcome)}`);
  if (outcome.status !== "rendered") throw new Error("unreachable");
  return outcome.message;
}

// UC1 — Reflection renders without recommendation language -----------------------------------------
test("UC1 — Reflection renders reflectively, with no recommendation language", () => {
  const m = rendered(render(req(supportRenderable({ voice: "Reflection" }))));
  assert.equal(m.kind, "support");
  assert.equal(m.voice, "Reflection");
  assert.equal(hasRecommendationCue(m.text), false);
});

// UC2 — Inquiry remains inquiry -------------------------------------------------------------------
test("UC2 — Inquiry renders as a question and is not answered", () => {
  const m = rendered(render(req(inquiryRenderable())));
  assert.equal(m.kind, "inquiry");
  assert.ok(m.text.includes("?"));
  assert.equal(hasAdviceCue(m.text), false);
});

// UC3 — Withholding remains withholding ------------------------------------------------------------
test("UC3 — Withholding renders as non-guidance and preserves the reason", () => {
  const m = rendered(render(req(withholdingRenderable())));
  assert.equal(m.kind, "withholding");
  assert.ok(m.text.toLowerCase().includes("not offering guidance"));
  assert.ok(m.text.includes("insufficient traceable evidence for this question"));
  assert.equal(hasAdviceCue(m.text), false);
});

// UC4 — Recommendation preserves conditions and agency --------------------------------------------
test("UC4 — Recommendation preserves conditions, agency, and uncertainty", () => {
  const m = rendered(
    render(req(supportRenderable({ voice: "Recommendation", intent: "recommend", conditions: ["if pain-free"] }))),
  );
  assert.equal(m.voice, "Recommendation");
  assert.ok(m.text.includes("if pain-free")); // condition preserved
  assert.ok(m.text.toLowerCase().includes("your decision")); // agency preserved
  assert.ok(m.text.toLowerCase().includes("may be incomplete")); // uncertainty preserved
});

// UC6 — uncertainty / freshness / limitations preserved -------------------------------------------
test("UC6 — limitations and freshness remain visible", () => {
  const outcome = render(req(supportRenderable({ freshness: "stale", limitations: ["missing power data"] })));
  const m = rendered(outcome);
  assert.ok(m.text.includes("missing power data")); // limitation visible
  assert.equal(m.limitationsPreserved, true);
  assert.equal(m.uncertaintyPreserved, true);
  assert.ok(m.warnings.some((w) => w.includes("freshness stale")));
});

// UC8 — traceability summarized when complete -----------------------------------------------------
test("UC8 — complete traceability is summarized in human-readable form", () => {
  const m = rendered(render(req(supportRenderable({ traceability: { status: "complete", summary: "ok", observationSetId: "obs:1" } }))));
  assert.ok(m.text.toLowerCase().includes("traced to recorded observations"));
  assert.equal(m.traceabilityPreserved, true);
});

// UC9 — incomplete traceability constrains rendering (gap preserved, no completeness claim) ---------
test("UC9 — partial traceability preserves the gap and claims no completeness", () => {
  const m = rendered(render(req(supportRenderable({ traceability: { status: "partial", summary: "partial" } }))));
  assert.ok(m.text.toLowerCase().includes("evidence is partial"));
  assert.equal(m.text.toLowerCase().includes("traced to recorded observations"), false);
  assert.ok(m.warnings.some((w) => w.includes("traceability partial")));
});

// UC10 — rendered message references its source domain output --------------------------------------
test("UC10 — the rendered message references its source domain output", () => {
  const m = rendered(render(req(supportRenderable({ sourceCaseRef: "case:42" }))));
  assert.equal(m.sourceRef, "case:42");
});

// determinism -------------------------------------------------------------------------------------
test("the fake renderer is deterministic (same request → same text)", () => {
  const r = supportRenderable();
  const a = rendered(render(req(r)));
  const b = rendered(render(req(r)));
  assert.equal(a.text, b.text);
});
