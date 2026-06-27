// rendering domain: the constrain-only policy. It supplies the cue vocabularies and pure predicates the
// validator uses. The policy can only PRESERVE or CONSTRAIN — it never strengthens, never hides
// uncertainty, and never turns Inquiry/Withholding into advice.

/** Phrases that assert a directive/recommendation. Allowed ONLY when the domain voice is Recommendation. */
export const RECOMMENDATION_CUES: readonly string[] = [
  "you should",
  "you must",
  "you need to",
  "i recommend",
  "we recommend",
  "my recommendation",
  "my advice",
  "i advise",
  "do this",
  "the answer is",
];

/** Advice cues that must never appear in an Inquiry or Withholding rendering. */
export const ADVICE_CUES: readonly string[] = [...RECOMMENDATION_CUES, "you ought to", "best to", "just do"];

/** Markers that make uncertainty visible. */
export const UNCERTAINTY_MARKERS: readonly string[] = [
  "may",
  "might",
  "could",
  "uncertain",
  "not certain",
  "tentative",
  "limited",
  "incomplete",
  "unknown",
  "not offering guidance",
  "not giving guidance",
  "needs to ask",
  "?",
];

/** Phrases that falsely assert a complete/proven chain. */
export const COMPLETENESS_CLAIMS: readonly string[] = [
  "fully traced",
  "complete evidence",
  "fully proven",
  "proven",
  "traced to recorded observations",
  "completely traced",
];

/** Forbidden domain incursions: athlete-state inference, purpose overwrite, compliance, event commands. */
export const FORBIDDEN_DOMAIN_CUES: readonly string[] = [
  "your readiness is",
  "you are fatigued",
  "your fatigue is",
  "your capacity is",
  "set your purpose",
  "overwrite purpose",
  "your purpose is now",
  "compliance score",
  "you complied",
  "you disobeyed",
  "obedience",
  "emit event",
  "dispatch",
];

function containsAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function hasRecommendationCue(text: string): boolean {
  return containsAny(text.toLowerCase(), RECOMMENDATION_CUES);
}

export function hasAdviceCue(text: string): boolean {
  return containsAny(text.toLowerCase(), ADVICE_CUES);
}

export function hasUncertaintyMarker(text: string): boolean {
  return containsAny(text.toLowerCase(), UNCERTAINTY_MARKERS);
}

export function hasCompletenessClaim(text: string): boolean {
  return containsAny(text.toLowerCase(), COMPLETENESS_CLAIMS);
}

export function hasForbiddenDomainCue(text: string): boolean {
  return containsAny(text.toLowerCase(), FORBIDDEN_DOMAIN_CUES);
}
