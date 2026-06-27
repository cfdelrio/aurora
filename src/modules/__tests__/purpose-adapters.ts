// Neutral cross-module adapters for Implementation 007 (test harness only; NOT a .test file).
//
// These live here -- not in `athlete` -- precisely because converting purpose to a decision-support
// PurposeContext, or applying a PurposeChanged as understanding staleness, requires importing those
// downstream modules. `athlete` must never import them (it is the upstream context). This harness is
// the seam: it COORDINATES (it does not reason), exactly as a future application service would.

import type { CurrentPurposeView, PurposeChanged } from "../athlete/index.ts";
import { purposeContext } from "../decision-support/index.ts";
import type { PurposeContext } from "../decision-support/index.ts";
import { markUnderstandingStale } from "../understanding/index.ts";
import type { UnderstandingProfile } from "../understanding/index.ts";

/** Map the athlete's current purpose view to the decision-support PurposeContext vocabulary. */
export function toPurposeContext(view: CurrentPurposeView): PurposeContext {
  switch (view.status) {
    case "declared":
      return purposeContext("declared", view.statement);
    case "ambiguous":
      return purposeContext("ambiguous");
    case "unknown":
      return purposeContext("unknown");
  }
}

export interface ApplyPurposeChangeInput {
  readonly profile: UnderstandingProfile;
  readonly dimensionKey: string;
  readonly change: PurposeChanged;
}

/**
 * Apply a PurposeChanged to understanding by marking ONE dimension stale (reason "purpose-change").
 * Staleness is owned by UnderstandingProfile; this only triggers it, selectively, for the dimension
 * the caller names. It never resets understanding globally and never mutates the profile in place.
 */
export function applyPurposeChangeToUnderstanding(input: ApplyPurposeChangeInput): UnderstandingProfile {
  return markUnderstandingStale({
    profile: input.profile,
    dimensionKey: input.dimensionKey,
    reason: "purpose-change",
    at: input.change.at,
  });
}
