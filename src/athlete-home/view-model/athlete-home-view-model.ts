// athlete-home view model — UI-001 (Athlete Home).
//
// The typed contract between Aurora's domain and the first athlete-facing surface. It is a PURE
// PRESENTATION shape: it computes nothing, infers nothing, and stores nothing. Every value here is
// a mapping of something the domain already produced (or an honest statement that the domain does
// not yet produce it).
//
// The central discipline of this screen: the athlete must always be able to tell WHAT KIND of
// statement they are reading. Every content-bearing item therefore carries an `epistemic` marker:
//   "declared" — the athlete said it (Purpose). Stable. Owned by the athlete.
//   "inferred" — Aurora's current, defeasible interpretation. Carries confidence. Can change.
// An inference is NEVER presented as a permanent attribute of the person.
//
//   view model ≠ domain model · inferred ≠ true · rendered ≠ recommended ·
//   Aurora advises; the athlete decides · Aurora never presents inference as fact.

import type { UnderstandingLevel } from "../../modules/understanding/index.ts";
import type { VoiceMode } from "../../modules/decision-support/index.ts";

export type Epistemic = "declared" | "inferred";

// --- Direction (from the Athlete aggregate's declared Purpose — never inferred) ------------------

export type DirectionSection =
  | { readonly state: "declared"; readonly statement: string; readonly epistemic: "declared" }
  | {
      readonly state: "ambiguous";
      readonly statement?: string;
      readonly note?: string;
      readonly epistemic: "declared";
    }
  | { readonly state: "unknown"; readonly epistemic: "declared" };

// --- Areas whose domain model does not exist yet (honest, documented gap) ------------------------
// CurrentState / CapacityProfile / ImpactAssessment exist in docs/domain-modeling/*.md but have no
// implemented domain type. This screen does NOT fake them: it states the gap — consolidated into
// ONE section (Product Design Iteration 045-D §5) so honest absence never outweighs what Aurora
// actually knows.

export interface NotYetModeledArea {
  readonly label: string;
}

export interface NotYetModeledSection {
  readonly state: "not-yet-modeled";
  readonly areas: readonly NotYetModeledArea[];
  /** one shared, athlete-facing reason — never a repository path or domain-model name */
  readonly note: string;
}

// --- Understanding (real, from UnderstandingProfile assessments) --------------------------------

export interface UnderstandingItemViewModel {
  /** already translated to athlete-facing language (Impl 045-D) — never the raw internal key */
  readonly dimensionLabel: string;
  readonly level: UnderstandingLevel;
  /** human words for the level — sober, never numeric */
  readonly confidencePhrase: string;
  readonly isStale: boolean;
  readonly isFragile: boolean;
  /** already humanized — no enum syntax, no "from -> to" state-transition tokens (Impl 045-D) */
  readonly reasons: readonly string[];
  readonly epistemic: "inferred";
}

export type UnderstandingSection =
  | { readonly state: "no-dimensions" }
  | { readonly state: "assessed"; readonly items: readonly UnderstandingItemViewModel[] };

// --- Attention (real, from the DecisionSupportCase terminal output) ------------------------------

export type AttentionSection =
  | {
      readonly state: "support";
      readonly voice: VoiceMode;
      /** the concrete thing Aurora noticed — never a meta-statement about having a reading at all */
      readonly observation: string;
      /** why this may matter for the athlete's own declared purpose — relevance, never instruction */
      readonly purposeRelevance?: string;
      /** what would make Aurora revise this reading (from the hypothesis's own falsifier) */
      readonly revisionCondition?: string;
      /** one human sentence replacing raw gate:verdict tokens — semantic traceability, not a dump */
      readonly traceSummary: string;
      readonly uncertaintyVisible: boolean;
      readonly epistemic: "inferred";
    }
  | {
      readonly state: "inquiry";
      readonly question: string;
      readonly whatNeeded: string;
      readonly epistemic: "inferred";
    }
  | { readonly state: "withholding"; readonly reason: string; readonly epistemic: "inferred" }
  | { readonly state: "none" };

// --- The whole screen -----------------------------------------------------------------------------

export interface AthleteHomeReady {
  readonly state: "ready";
  readonly athleteLabel?: string;
  /** the concrete interpretation itself (when one exists) — never a statement ABOUT having one */
  readonly headline: { readonly text: string; readonly epistemic: Epistemic };
  readonly direction: DirectionSection;
  readonly notYetModeled: NotYetModeledSection;
  readonly understanding: UnderstandingSection;
  readonly attention: AttentionSection;
}

export type AthleteHomeViewModel =
  | { readonly state: "loading" }
  | { readonly state: "error"; readonly message: string }
  | AthleteHomeReady;
