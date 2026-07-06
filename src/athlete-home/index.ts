// athlete-home — PUBLIC SURFACE (UI-001, Athlete Home).
//
// Aurora's first athlete-facing presentation slice. Like src/operator-runtime/, it lives
// deliberately OUTSIDE src/modules/: it CONSUMES Aurora's public module surfaces (athlete,
// understanding, decision-support — read-only, types-first) and must never be imported by the
// core. It owns no domain model, no repository, no persistence, no server, no framework.
//
//   view model ≠ domain model · rendered page ≠ product runtime decision · sample ≠ production ·
//   presentation slice ≠ whole-core composer · Aurora advises; the athlete decides.

export type {
  AthleteHomeViewModel,
  AthleteHomeReady,
  DirectionSection,
  NotYetModeledSection,
  UnderstandingSection,
  UnderstandingItemViewModel,
  AttentionSection,
  Epistemic,
} from "./view-model/athlete-home-view-model.ts";
export { assembleAthleteHome } from "./view-model/assemble-athlete-home.ts";
export type { AssembleAthleteHomeInput } from "./view-model/assemble-athlete-home.ts";
export { renderAthleteHomePage, escapeHtml } from "./page/render-athlete-home.ts";
export { sampleAthleteHomeViewModel } from "./sample/athlete-home-sample-scenario.ts";
