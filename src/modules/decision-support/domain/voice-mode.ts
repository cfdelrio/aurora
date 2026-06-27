// decision-support domain: VoiceMode + the SafeVoiceCeiling -> VoiceMode mapping.
//
// SafeVoiceCeiling is NOT a VoiceMode. The ceiling (from understanding) is the MAXIMUM
// assertiveness; this table maps it to the strongest VoiceMode it permits. Warning is reachable
// only via the RiskGate caution path, so it is NOT part of the ceiling ladder.

import type { SafeVoiceCeiling } from "../../understanding/index.ts";

export type VoiceMode = "Silence" | "Reflection" | "Framing" | "Warning" | "Recommendation";

// The ceiling ladder excludes Warning (which is a risk-only, cautionary mode).
const CEILING_LADDER: readonly VoiceMode[] = ["Silence", "Reflection", "Framing", "Recommendation"];

export function maxVoiceForCeiling(ceiling: SafeVoiceCeiling): VoiceMode {
  switch (ceiling) {
    case "none":
      return "Silence";
    case "tentative":
      return "Reflection";
    case "qualified":
      return "Framing"; // qualified permits Framing, NOT Recommendation
    case "confident":
      return "Recommendation";
  }
}

/** Rank within the ceiling ladder; -1 for Warning (handled separately, via risk). */
export function ceilingLadderRank(voice: VoiceMode): number {
  return CEILING_LADDER.indexOf(voice);
}

export function lowerInCeilingLadder(voice: VoiceMode): VoiceMode {
  const i = CEILING_LADDER.indexOf(voice);
  if (i <= 0) {
    return "Silence";
  }
  return CEILING_LADDER[i - 1] as VoiceMode;
}
