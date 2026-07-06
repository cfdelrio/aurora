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

test("UI-001.14 the ready page answers the five questions in hierarchy order: direction, attention, understanding, then the honest gaps", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  const order = [
    "Tu dirección",
    "Merece tu atención",
    "Lo que Aurora entiende de vos",
    "Cómo parecés estar hoy",
    "Tu capacidad",
    "Lo que está cambiando",
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

test("UI-001.17 the not-yet-modeled sections say so plainly and disclose the exact missing model behind a details fold", () => {
  const html = renderAthleteHomePage(sampleAthleteHomeViewModel());
  assert.ok(html.includes("Aurora todavía no tiene un modelo para esto"));
  assert.ok(html.includes("CurrentState"));
  assert.ok(html.includes("CapacityProfile"));
  assert.ok(html.includes("ImpactAssessment"));
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
