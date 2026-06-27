// Implementation 014 — the mandatory validator is the safety guarantee. These feed ADVERSARIAL drafts
// (as a real or future provider might produce) and assert each is refused with the right closed failure.
// Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateDraft } from "../index.ts";
import type { RenderingFailure } from "../index.ts";
import {
  inquiryRenderable,
  noVoiceSupportRenderable,
  req,
  supportRenderable,
  withholdingRenderable,
} from "./fixtures.ts";

function failures(outcome: ReturnType<typeof validateDraft>): readonly RenderingFailure[] {
  assert.equal(outcome.status, "failed", `expected failed, got ${JSON.stringify(outcome)}`);
  if (outcome.status !== "failed") throw new Error("unreachable");
  return outcome.failures;
}

test("voice-escalation: a Reflection draft with recommendation language is refused", () => {
  const r = supportRenderable({ voice: "Reflection" });
  const out = validateDraft({ draft: "Reflecting on it — you should rest tomorrow.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("voice-escalation"));
});

test("recommendation-created-by-renderer: a voiceless support draft that recommends is refused", () => {
  const r = noVoiceSupportRenderable();
  const out = validateDraft({ draft: "I recommend a rest day. This may be incomplete.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("recommendation-created-by-renderer"));
});

test("invented-fact: a draft containing a forbidden claim is refused", () => {
  const r = supportRenderable({ forbiddenClaims: ["your ftp is 300w"] });
  const out = validateDraft({ draft: "Reflecting — your FTP is 300w. This may be incomplete.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("invented-fact"));
});

test("uncertainty-hidden: a draft with no uncertainty marker is refused when required", () => {
  const r = supportRenderable({ uncertaintyVisibleRequired: true });
  const out = validateDraft({ draft: "Reflecting on the session.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("uncertainty-hidden"));
});

test("limitation-hidden: a draft omitting a stated limitation is refused", () => {
  const r = supportRenderable({ limitations: ["missing power data"] });
  const out = validateDraft({ draft: "Reflecting; this may be incomplete.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("limitation-hidden"));
});

test("inquiry-rendered-as-answer: an inquiry draft that answers is refused", () => {
  const r = inquiryRenderable();
  const out = validateDraft({ draft: "The answer is to rest.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("inquiry-rendered-as-answer"));
});

test("withholding-rendered-as-advice: a withholding draft that advises is refused", () => {
  const r = withholdingRenderable();
  const out = validateDraft({ draft: "Aurora won't say, but you should rest.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("withholding-rendered-as-advice"));
});

test("missing-traceability: a completeness claim over a missing chain is refused", () => {
  const r = supportRenderable({ traceability: { status: "missing", summary: "no chain" } });
  const out = validateDraft({ draft: "Reflecting — fully traced and proven. This may be incomplete.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("missing-traceability"));
});

test("unsupported-style-request: a 'be decisive' style is refused", () => {
  const r = supportRenderable();
  const out = validateDraft({ draft: "Reflecting; this may be incomplete.", renderable: r, request: req(r, { style: "be decisive" }) });
  assert.ok(failures(out).includes("unsupported-style-request"));
});

test("unsupported-language-request: an unsupported locale is refused", () => {
  const r = supportRenderable();
  const out = validateDraft({ draft: "Reflecting; this may be incomplete.", renderable: r, request: req(r, { locale: "xx" }) });
  assert.ok(failures(out).includes("unsupported-language-request"));
});

test("missing-terminal-output: an empty renderable/draft is refused", () => {
  const r = supportRenderable({ contentAtoms: [] });
  const out = validateDraft({ draft: "", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("missing-terminal-output"));
});

test("unsafe-rendering-request: a draft inferring athlete state is refused", () => {
  const r = supportRenderable();
  const out = validateDraft({ draft: "Reflecting; your readiness is high. This may be incomplete.", renderable: r, request: req(r) });
  assert.ok(failures(out).includes("unsafe-rendering-request"));
});

test("a safe, faithful draft validates to rendered", () => {
  const r = supportRenderable();
  const out = validateDraft({
    draft: "Reflecting on what we have: energy felt low in today's session. This may be incomplete. Traced to recorded observations.",
    renderable: r,
    request: req(r),
  });
  assert.equal(out.status, "rendered");
});

test("a safe Recommendation style ('clearer') is accepted", () => {
  const r = supportRenderable({ voice: "Recommendation", intent: "recommend", conditions: ["if pain-free"] });
  const out = validateDraft({
    draft: "Something you could weigh: rest. This holds under: if pain-free. This may be incomplete. It remains your decision.",
    renderable: r,
    request: req(r, { style: "clearer" }),
  });
  assert.equal(out.status, "rendered");
});
