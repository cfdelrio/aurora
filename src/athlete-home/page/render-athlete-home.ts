// athlete-home renderer — UI-001 (Athlete Home).
//
// A framework-free, dependency-free HTML renderer: pure functions from the view model to an HTML
// string. Deliberately NO component framework — no frontend stack has been decided for Aurora
// (Specs 031/032/033), and this vertical slice refuses to smuggle that decision in as a side
// effect. When a stack IS chosen, these components port 1:1 (each render* function is a component).
//
// It imports ONLY the view model types — never a domain module. It computes nothing: every word it
// prints was already decided by the assembler or by the domain itself.
//
// Visual language: calm, adult, high-legibility, generous whitespace, mobile-first single column,
// no traffic-light colors, no gamification, no decorative charts, no "AI magic" gradients.

import type {
  AthleteHomeReady,
  AthleteHomeViewModel,
  AttentionSection,
  DirectionSection,
  NotYetModeledSection,
  UnderstandingSection,
} from "../view-model/athlete-home-view-model.ts";

// --- safety ----------------------------------------------------------------------------------------

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- shared fragments -------------------------------------------------------------------------------

/** Subtle epistemic tag so the athlete always knows what kind of statement they are reading. */
function epistemicTag(epistemic: "declared" | "inferred"): string {
  return epistemic === "declared"
    ? `<span class="tag tag-declared">declarado por vos</span>`
    : `<span class="tag tag-inferred">interpretación de Aurora</span>`;
}

function section(title: string, body: string, label?: string): string {
  return `<section aria-label="${escapeHtml(label ?? title)}">
  <h2>${escapeHtml(title)}</h2>
  ${body}
</section>`;
}

// --- components -------------------------------------------------------------------------------------

export function renderDirection(d: DirectionSection): string {
  switch (d.state) {
    case "declared":
      return section(
        "Tu dirección",
        `<p class="primary">${escapeHtml(d.statement)}</p>${epistemicTag(d.epistemic)}`,
      );
    case "ambiguous":
      return section(
        "Tu dirección",
        `<p class="primary">${d.statement === undefined ? "Todavía la estás explorando." : escapeHtml(d.statement)}</p>
<p class="muted">Declaraste que tu dirección es todavía ambigua. Está bien no saberlo aún.</p>${epistemicTag(d.epistemic)}`,
      );
    case "unknown":
      return section(
        "Tu dirección",
        `<p class="muted">Todavía no declaraste para qué estás entrenando. Cuando lo hagas, Aurora interpretará todo lo demás a la luz de esa dirección.</p>`,
      );
  }
}

export function renderNotYetModeled(s: NotYetModeledSection): string {
  const areaList = s.areas.map((a) => `<li class="muted small">${escapeHtml(a.label)}</li>`).join("");
  return section(
    "Lo que Aurora todavía no mide",
    `<p class="muted">${escapeHtml(s.note)}</p>
<details><summary>Qué falta</summary><ul>${areaList}</ul></details>`,
  );
}

export function renderUnderstanding(u: UnderstandingSection): string {
  if (u.state === "no-dimensions") {
    return section(
      "Lo que Aurora entiende de vos",
      `<p class="muted">Aurora todavía no tiene evidencia suficiente para entenderte en ninguna dimensión. La comprensión se construye con evidencia real, no se asume.</p>`,
    );
  }
  const items = u.items
    .map((it) => {
      const flags = [
        it.isStale ? `<span class="flag">entendimiento desactualizado</span>` : "",
        it.isFragile ? `<span class="flag">entendimiento frágil</span>` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const reasons =
        it.reasons.length === 0
          ? ""
          : `<details><summary>Por qué</summary><ul>${it.reasons
              .map((r) => `<li class="muted small">${escapeHtml(r)}</li>`)
              .join("")}</ul></details>`;
      return `<div class="dimension">
  <p class="primary">${escapeHtml(it.dimensionLabel)}</p>
  <p class="muted">${escapeHtml(it.confidencePhrase)}</p>
  ${flags}
  ${reasons}
  ${epistemicTag(it.epistemic)}
</div>`;
    })
    .join("\n");
  return section("Lo que Aurora entiende de vos", items);
}

export function renderAttention(a: AttentionSection): string {
  switch (a.state) {
    case "support": {
      const purposeRelevance =
        a.purposeRelevance === undefined ? "" : `<p class="muted">${escapeHtml(a.purposeRelevance)}</p>`;
      const uncertainty = a.uncertaintyVisible
        ? `<p class="muted small">Esto es una interpretación con incertidumbre visible, no una certeza.</p>`
        : "";
      const revision =
        a.revisionCondition === undefined
          ? ""
          : `<li class="muted small">${escapeHtml(a.revisionCondition)}</li>`;
      return section(
        "Merece tu atención",
        `<p class="primary">${escapeHtml(a.observation)}</p>
${purposeRelevance}
${uncertainty}
<p class="muted">Aurora no decide por vos. Te muestra lo que ve.</p>
<details><summary>Entender</summary><ul><li class="muted small">${escapeHtml(a.traceSummary)}</li>${revision}</ul></details>
${epistemicTag(a.epistemic)}`,
      );
    }
    case "inquiry":
      return section(
        "Aurora te pregunta",
        `<p class="primary">${escapeHtml(a.question)}</p>
<p class="muted">Para interpretar mejor, Aurora necesita: ${escapeHtml(a.whatNeeded)}.</p>
${epistemicTag(a.epistemic)}`,
      );
    case "withholding":
      return section(
        "Aurora prefiere callar",
        `<p class="muted">Aurora decidió no opinar todavía: ${escapeHtml(a.reason)}.</p>
<p class="muted small">El silencio responsable también es una respuesta.</p>
${epistemicTag(a.epistemic)}`,
      );
    case "none":
      return section(
        "Merece tu atención",
        `<p class="muted">Nada reclama tu atención ahora mismo. Aurora habla cuando tiene algo que valga la pena.</p>`,
      );
  }
}

// --- page states -------------------------------------------------------------------------------------

function renderReadyBody(vm: AthleteHomeReady): string {
  const greeting = vm.athleteLabel === undefined ? "Hola" : `Hola, ${escapeHtml(vm.athleteLabel)}`;
  return `<header>
  <p class="brand">AURORA</p>
  <h1>${greeting}</h1>
  <p class="headline">${escapeHtml(vm.headline.text)}</p>
  ${epistemicTag(vm.headline.epistemic)}
</header>
<main>
${renderDirection(vm.direction)}
${renderAttention(vm.attention)}
${renderUnderstanding(vm.understanding)}
${renderNotYetModeled(vm.notYetModeled)}
</main>
<footer>
  <p class="muted small">Aurora interpreta; no dictamina. Todo lo inferido puede cambiar con nueva evidencia. La decisión es siempre tuya.</p>
</footer>`;
}

function renderBody(vm: AthleteHomeViewModel): string {
  switch (vm.state) {
    case "loading":
      return `<main><p class="muted" role="status">Aurora está reuniendo lo que entiende de vos…</p></main>`;
    case "error":
      return `<main><p class="muted" role="alert">Aurora no pudo cargar esta vista: ${escapeHtml(vm.message)}. Nada de lo que sabés de vos depende de esta pantalla.</p></main>`;
    case "ready":
      return renderReadyBody(vm);
  }
}

const STYLES = `
:root{
  --ink:#26241f;--paper:#faf8f4;--muted:#6f6a60;--line:#e5e0d6;--accent:#4a5f52;
  color-scheme:light;
}
*{box-sizing:border-box;margin:0}
body{
  background:var(--paper);color:var(--ink);
  font-family:ui-serif,Georgia,'Times New Roman',serif;
  line-height:1.6;font-size:1.0625rem;
  padding:1.25rem;
}
.page{max-width:38rem;margin:0 auto}
header{padding:1.5rem 0 2rem;border-bottom:1px solid var(--line)}
.brand{font-family:ui-sans-serif,system-ui,sans-serif;font-size:.75rem;letter-spacing:.35em;color:var(--muted)}
h1{font-size:1.375rem;font-weight:600;color:var(--muted);margin-top:1.25rem}
.headline{margin-top:.75rem;font-size:1.3125rem;font-weight:600;line-height:1.45}
section{padding:2rem 0;border-bottom:1px solid var(--line)}
h2{font-family:ui-sans-serif,system-ui,sans-serif;font-size:.8125rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.875rem}
.primary{font-size:1.1875rem}
.muted{color:var(--muted)}
.small{font-size:.9rem}
.tag{display:inline-block;margin-top:.75rem;font-family:ui-sans-serif,system-ui,sans-serif;font-size:.7rem;letter-spacing:.06em;padding:.15rem .5rem;border:1px solid var(--line);border-radius:2px;color:var(--muted)}
.tag-inferred{border-color:var(--accent);color:var(--accent)}
.flag{display:inline-block;font-family:ui-sans-serif,system-ui,sans-serif;font-size:.75rem;color:var(--muted);border-bottom:1px dotted var(--muted);margin-right:.75rem}
.dimension{margin-bottom:1.5rem}
.dimension:last-child{margin-bottom:0}
details{margin-top:.5rem}
summary{cursor:pointer;font-family:ui-sans-serif,system-ui,sans-serif;font-size:.85rem;color:var(--accent)}
ul{padding-left:1.25rem;margin-top:.375rem}
footer{padding:2rem 0}
@media(min-width:48rem){
  body{padding:3rem 2rem}
  h1{font-size:1.5rem}
  .headline{font-size:1.5rem}
}
`;

/** The full, self-contained page (no external asset, no script, no framework). */
export function renderAthleteHomePage(vm: AthleteHomeViewModel): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aurora — Tu casa</title>
<style>${STYLES}</style>
</head>
<body>
<div class="page">
${renderBody(vm)}
</div>
</body>
</html>`;
}
