// athlete domain — PUBLIC SURFACE (Purpose-first slice).
// Owns the athlete's declared, versioned, append-only Purpose. It exposes NO inferred state,
// capacity, readiness, or fatigue -- those are not in scope and not reachable here. This module
// imports only shared-kernel; it never imports observation/reasoning/understanding/decision-support.

export { Athlete } from "./athlete.ts";
export type { CreateAthleteInput, CurrentPurposeView } from "./athlete.ts";
export type { AthleteId, PurposeVersionId } from "./ids.ts";
export { newAthleteId, newPurposeVersionId } from "./ids.ts";

export { purpose, ambiguousPurpose } from "./purpose.ts";
export type {
  Purpose,
  DeclaredPurpose,
  AmbiguousPurposeInput,
  PurposeStatus,
  PurposeSource,
  PurposeChangeReason,
} from "./purpose.ts";

export { purposeVersion, purposeVersionRefOf } from "./purpose-version.ts";
export type { PurposeVersion, PurposeVersionRef, CreatePurposeVersionInput } from "./purpose-version.ts";

export { purposeChanged } from "./purpose-changed.ts";
export type { PurposeChanged } from "./purpose-changed.ts";

export { purposeReinterpretationResult } from "./reinterpretation.ts";
export type {
  PurposeReinterpretationStatus,
  PurposeReinterpretationResult,
} from "./reinterpretation.ts";

export { revealedPurposeSignal } from "./revealed-purpose.ts";
export type { RevealedPurposeSignal } from "./revealed-purpose.ts";
