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

// --- Sections whose domain model does not exist yet (honest, documented gap) ---------------------
// CurrentState / CapacityProfile / ImpactAssessment exist in docs/domain-modeling/*.md but have no
// implemented domain type. This screen does NOT fake them: it states the gap.

export interface NotYetModeledSection {
  readonly state: "not-yet-modeled";
  /** what real domain work would need to exist before this section can carry content */
  readonly whatIsMissing: string;
}

// --- Understanding (real, from UnderstandingProfile assessments) --------------------------------

export interface UnderstandingItemViewModel {
  readonly dimensionLabel: string;
  readonly level: UnderstandingLevel;
  /** human words for the level — sober, never numeric */
  readonly confidencePhrase: string;
  readonly isStale: boolean;
  readonly isFragile: boolean;
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
      /** defeasible framing sentence — never an order */
      readonly phrase: string;
      readonly reasons: readonly string[];
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
  /** one-sentence synthesis of what Aurora understands right now — always epistemic-marked */
  readonly headline: { readonly text: string; readonly epistemic: Epistemic };
  readonly direction: DirectionSection;
  readonly currentState: NotYetModeledSection;
  readonly capacity: NotYetModeledSection;
  readonly trajectory: NotYetModeledSection;
  readonly understanding: UnderstandingSection;
  readonly attention: AttentionSection;
}

export type AthleteHomeViewModel =
  | { readonly state: "loading" }
  | { readonly state: "error"; readonly message: string }
  | AthleteHomeReady;
