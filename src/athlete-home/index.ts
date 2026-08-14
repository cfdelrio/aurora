// athlete-home — PUBLIC SURFACE (UI-001, Athlete Home; isolated per Spec 045 / Tech Spec 045-A).
//
// Aurora's first athlete-facing presentation slice. Like src/operator-runtime/, it lives
// deliberately OUTSIDE src/modules/: it CONSUMES Aurora's public module surfaces (athlete,
// understanding, decision-support — read-only, type-only) and must never be imported by the
// core. It owns no domain model, no repository, no persistence, no server, no framework.
//
// This barrel is a PROTOTYPE presentation contract ONLY: the view-model types, the pure assembler,
// and the renderer — both value exports are inert without caller-supplied inputs. It implies no
// production runtime, no real athlete lookup, and no production composition ownership. The demo
// sample scenario (near-whole-core harness) is intentionally NOT exported here — it is confined to
// athlete-home's own tests/ and sample/ paths (Impl 045-A guard).
//
//   view model ≠ domain model · rendered page ≠ product runtime decision · sample ≠ production ·
//   presentation slice ≠ whole-core composer · Aurora advises; the athlete decides.

export type {
  AthleteHomeViewModel,
  AthleteHomeReady,
  DirectionSection,
  NotYetModeledSection,
  NotYetModeledArea,
  UnderstandingSection,
  UnderstandingItemViewModel,
  AttentionSection,
  Epistemic,
} from "./view-model/athlete-home-view-model.ts";
export { assembleAthleteHome } from "./view-model/assemble-athlete-home.ts";
export type { AssembleAthleteHomeInput } from "./view-model/assemble-athlete-home.ts";
export { renderAthleteHomePage, escapeHtml } from "./page/render-athlete-home.ts";
