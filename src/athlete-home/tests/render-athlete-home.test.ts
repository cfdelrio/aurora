// UI-001 — Athlete Home renderer tests.
// The renderer is a pure function from view model to a self-contained HTML page. These tests prove
// the page states (loading/error/ready), escaping, responsiveness basics, accessibility basics, and
// — most importantly — the language discipline: defeasible wording, never imperative.

import { test } from "node:test";
import assert from "node:assert/strict";

import { escapeHtml, renderAthleteHomePage } from "../page/render-athlete-home.ts";
import { sampleAthleteHomeViewModel } from "../sample/athlete-home-sample-scenario.ts";
import { assembleAthleteHome } from "../view-model/assemble-athlete-home.ts";

test("UI-001.11 the loading state renders a quiet status message, no fake content", () => {
  const html = renderAthleteHomePage({ state: "loading" });
  assert.ok(html.includes('role="status"'));
  assert.ok(!html.includes("Tu dirección"));
});

test("UI-001.12 the error state renders an alert that does not blame or alarm the athlete, with the message escaped", () => {
  const html = renderAthleteHomePage({ state: "error", message: "<b>x</b>" });
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(!html.includes("<b>x</b>"));
});

test("UI-001.13 the ready page is a self-contained responsive document: viewport meta, inline styles, no external asset, no script", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  assert.ok(html.includes('name="viewport"'));
  assert.ok(html.includes("<style>"));
  assert.ok(!/src=|href=/.test(html), "no external asset reference");
  assert.ok(!html.includes("<script"), "no script — this page only shows; it never computes");
});

test("UI-001.14 the ready page answers the five questions in hierarchy order: direction, attention, understanding, then the one consolidated honest gap (Impl 045-D)", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  const order = [
    "Tu dirección",
    "Merece tu atención",
    "Lo que Aurora entiende de vos",
    "Lo que Aurora todavía no mide",
  ].map((t) => html.indexOf(t));
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i]! > order[i - 1]!, `section ${i} must come after section ${i - 1}`);
    assert.ok(order[i]! > -1, `section ${i} must exist`);
  }
});

test("UI-001.15 inferred content is visibly tagged 'interpretación de Aurora' and declared content 'declarado por vos'", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  assert.ok(html.includes("interpretación de Aurora"));
  assert.ok(html.includes("declarado por vos"));
});

test("UI-001.16 uncertainty is stated in words, not decorated away: the support block names visible uncertainty and athlete ownership", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  assert.ok(html.includes("no una certeza"));
  assert.ok(html.includes("Aurora no decide por vos"));
});

test("UI-001.17 the consolidated not-yet-modeled section says so plainly, lists all three honest gap areas behind one fold, and leaks no internal domain-model name or repository path (Impl 045-D)", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  assert.ok(html.includes("Antes que inventar un número, prefiere decírtelo"));
  assert.ok(html.includes("cómo estás hoy"));
  assert.ok(html.includes("tu capacidad"));
  assert.ok(html.includes("cambiando"));
  for (const leak of ["CurrentState", "CapacityProfile", "ImpactAssessment", "docs/domain-modeling"]) {
    assert.equal(html.includes(leak), false, `page must not leak '${leak}'`);
  }
});

test("UI-001.18 empty world: unknown purpose + no assessments + no output renders honest empty states everywhere", () => {
  const html = renderAthleteHomePage(
    assembleAthleteHome({ purposeView: { status: "unknown" }, assessments: [] }),
  );
  assert.ok(html.includes("Todavía no declaraste"));
  assert.ok(html.includes("evidencia suficiente"));
  assert.ok(html.includes("Nada reclama tu atención"));
});

test("UI-001.19 language discipline: the rendered page NEVER commands — no imperative or decision-ownership phrasing appears", () => {
  const pages = [
    renderAthleteHomePage(sampleAthleteHomeViewModel()),
    renderAthleteHomePage(assembleAthleteHome({ purposeView: { status: "unknown" }, assessments: [] })),
    renderAthleteHomePage({ state: "loading" }),
    renderAthleteHomePage({ state: "error", message: "x" }),
  ];
  for (const html of pages) {
    for (const banned of [
      "Tenés que",
      "tenés que",
      "Debés",
      "debés",
      "Hoy hacé",
      "hoy hacé",
      "No entrenes",
      "no entrenes",
      "La mejor decisión es",
      "la mejor decisión es",
    ]) {
      assert.equal(html.includes(banned), false, `page must not contain imperative '${banned}'`);
    }
  }
});

test("UI-001.20 escapeHtml neutralizes every HTML-significant character", () => {
  assert.equal(escapeHtml(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
});

// --- Product Design Iteration 045-D — concrete storytelling acceptance criteria --------------------

test("UI-001.21 (AC5) the rendered page leaks no gate name, enum/state-transition syntax, or repository path anywhere — traceability stays semantic", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  for (const leak of [
    "EvidenceGate", "UnderstandingGate", "PurposeGate", "RiskGate", "AgencyGate",
    "survived-challenge", "docs/domain-modeling", ".md", "CurrentState", "CapacityProfile",
    "ImpactAssessment", "sustained work tolerance",
  ]) {
    assert.equal(html.includes(leak), false, `page must not leak '${leak}'`);
  }
});

test("UI-001.22 (AC7) unavailable concepts remain unavailable — no placeholder score, readiness number, or capacity estimate appears anywhere", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  for (const fabricated of ["/100", "% de capacidad", "puntaje", "score", "readiness"]) {
    assert.equal(html.includes(fabricated), false, `page must not fabricate '${fabricated}'`);
  }
});

test("UI-001.23 (AC8) the not-yet-modeled treatment appears exactly once — repetition no longer dominates the page", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  const occurrences = html.split("Aurora todavía no construyó una forma de leer esto").length - 1;
  assert.equal(occurrences, 1);
  // the section title legitimately appears twice (aria-label + <h2>, same as every other section) —
  // what must NOT repeat is the explanatory paragraph, asserted above.
  assert.equal(html.split("<h2>Lo que Aurora todavía no mide</h2>").length - 1, 1);
});

test("UI-001.24 (AC10) agency is still made explicit on the rendered page", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  assert.ok(html.includes("Aurora no decide por vos"));
  assert.ok(html.includes("La decisión es siempre tuya"));
});

// --- 045-E surgical pass — Finding 1 (voice) and Finding 2 (purpose relevance depth) ---------------

test("UI-001.25 (045-E Finding 1) the rendered page never addresses the athlete in detached third person anywhere", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  for (const detached of ["este atleta", "the athlete", "this athlete"]) {
    assert.equal(html.toLowerCase().includes(detached), false, `page must not contain '${detached}'`);
  }
  assert.ok(html.includes("tu tolerancia al trabajo sostenido"));
});

test("UI-001.26 (045-E Finding 2) the rendered purpose-relevance sentence is visible and grounded in the athlete's own preparation, not in Aurora's display policy", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  assert.ok(html.includes("tu preparación") && html.includes("200 mariposa"));
  assert.equal(html.includes("vale la pena mostrarse"), false);
});

test("UI-001.27 the concrete observation and the uncertainty boundary both remain visible without opening any fold (045-E collapsed-state test)", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  const beforeFirstDetails = html.split("<details>")[0]!;
  assert.ok(beforeFirstDetails.includes("HR por encima del rango esperado"));
  assert.ok(beforeFirstDetails.includes("no una certeza"));
});
