// application-orchestration application: admitExternalRenderable (Implementation 035-A) — the Tier 2 admission
// check for the External Renderable Assembly Contract (Spec 035). It is a PURE, SYNCHRONOUS structural
// pre-screen of a caller-supplied RenderingRequest / RenderableDomainOutput: it inspects ONLY the structural
// contract fields already on the renderable and returns a closed admission result. It owns/sequences NO
// whole-core chain, imports NO observation/reasoning/understanding/athlete module (Impl 025 guard intact),
// adds NO module (AC20 intact), calls NO provider, runs NO validateDraft, performs NO delivery, creates NO
// AthleteDecision, reads NO process environment, and records NO events.
//
// IMPORTANT — what `admitted` means and does NOT mean:
//   admitted ≠ true · admitted ≠ evidence-backed fact · admitted ≠ recommendation quality · admitted ≠ wisdom.
//   `admitted` means ONLY: the renderable is STRUCTURALLY admissible for downstream rendering validation
//   (Tier 3 `validateDraft`). Tier 2 CANNOT verify Tier 1 truth — whether the allowedClaims are actually
//   evidence-traceable, whether confidence is justified, whether a claim is wise, whether the caller followed
//   the whole-core harness, or whether a recommendation is high quality. Those remain the caller's contractual
//   guarantee (Tier 1) and the whole-core test harness's proof (Impl 006) — never re-derived in production.
//
// external renderable ≠ truth · caller guarantee ≠ machine proof · admission check ≠ validateDraft
// RenderableDomainOutput ≠ RenderedMessage · RenderingRequest ≠ provider call · reflection ≠ prescription
// AC20 seam ≠ whole-core composer

import type { RenderingRequest, RenderableDomainOutput } from "../../rendering/index.ts";

/** Closed admission status catalog. `admitted` + the structurally-checkable rejection reasons (Tier 2 only). */
export type ExternalRenderableAdmissionStatus =
  | "admitted"
  | "rejected-missing-provenance" // sourceCaseRef absent/blank
  | "rejected-unsupported-kind" // kind not in { support, inquiry, withholding }
  | "rejected-claim-fields-missing" // allowedClaims/forbiddenClaims not arrays (support also needs ≥1 allowedClaim)
  | "rejected-agency-missing" // agencyRequired !== true
  | "rejected-uncertainty-hidden" // claim-bearing (support/inquiry) with uncertaintyVisibleRequired !== true
  | "rejected-missing-traceability" // claim-bearing without traceability.status + non-empty summary
  | "rejected-unsafe-voice"; // support voice absent / "Silence" / "Recommendation" (prescriptive ceiling)

export const EXTERNAL_RENDERABLE_ADMISSION_STATUSES: readonly ExternalRenderableAdmissionStatus[] = [
  "admitted",
  "rejected-missing-provenance",
  "rejected-unsupported-kind",
  "rejected-claim-fields-missing",
  "rejected-agency-missing",
  "rejected-uncertainty-hidden",
  "rejected-missing-traceability",
  "rejected-unsafe-voice",
];

/** Closed rejection reason (everything except "admitted"). A safe code only — never raw content. */
export type ExternalRenderableRejectionReason = Exclude<ExternalRenderableAdmissionStatus, "admitted">;

export interface ExternalRenderableAdmission {
  readonly status: ExternalRenderableAdmissionStatus;
  readonly admitted: boolean;
  /** present only on rejection — a safe closed code; never hidden reasoning, never raw renderable content */
  readonly reason?: ExternalRenderableRejectionReason;
}

const SAFE_KINDS: readonly string[] = ["support", "inquiry", "withholding"];
// Reflection ceiling for an athlete-facing `support` reflection: Reflection / Framing / Warning are advisory
// (Aurora advises, never prescribes). "Recommendation" is the prescriptive ceiling and "Silence" must be
// realized as a `withholding` kind, not a voiced `support` — both are rejected here.
const UNSAFE_SUPPORT_VOICES: readonly string[] = ["Recommendation", "Silence"];

function reject(reason: ExternalRenderableRejectionReason): ExternalRenderableAdmission {
  return Object.freeze({ status: reason, admitted: false, reason });
}

const ADMITTED: ExternalRenderableAdmission = Object.freeze({ status: "admitted", admitted: true });

/**
 * Structurally pre-screen a caller-supplied renderable before it enters render-only orchestration. Pure and
 * synchronous; fails closed on the first unmet structural requirement. It never proves Tier 1 truth (see the
 * file header) — `admitted` means only "structurally admissible for downstream rendering validation".
 */
export function admitExternalRenderable(request: RenderingRequest): ExternalRenderableAdmission {
  const r: RenderableDomainOutput = request.renderable;

  // 1. Provenance — a non-empty source handle is required for any renderable.
  if (typeof r.sourceCaseRef !== "string" || r.sourceCaseRef.trim().length === 0) {
    return reject("rejected-missing-provenance");
  }

  // 2. Kind — must be one of the safe terminal kinds (defensive against untyped external input).
  if (!SAFE_KINDS.includes(r.kind)) {
    return reject("rejected-unsupported-kind");
  }

  // 3. Claim fields — both must be arrays (present). NB: an empty forbiddenClaims is admissible (the canonical
    //    safe support renderable carries forbiddenClaims: []). A `support` renderable must carry ≥1 allowedClaim.
  if (!Array.isArray(r.allowedClaims) || !Array.isArray(r.forbiddenClaims)) {
    return reject("rejected-claim-fields-missing");
  }
  if (r.kind === "support" && r.allowedClaims.length === 0) {
    return reject("rejected-claim-fields-missing");
  }

  // 4. Agency — the athlete's agency must be required (Aurora advises; the athlete decides).
  if (r.agencyRequired !== true) {
    return reject("rejected-agency-missing");
  }

  // 5/6. Claim-bearing renderables (support/inquiry) must keep uncertainty visible and carry traceability.
  const claimBearing = r.kind === "support" || r.kind === "inquiry";
  if (claimBearing) {
    if (r.uncertaintyVisibleRequired !== true) {
      return reject("rejected-uncertainty-hidden");
    }
    const t = r.traceability;
    if (t === undefined || typeof t.status !== "string" || typeof t.summary !== "string" || t.summary.trim().length === 0) {
      return reject("rejected-missing-traceability");
    }
  }

  // 7. Voice ceiling — a `support` reflection must carry an advisory voice, never prescriptive/absent/Silence.
  if (r.kind === "support") {
    if (r.voice === undefined || UNSAFE_SUPPORT_VOICES.includes(r.voice)) {
      return reject("rejected-unsafe-voice");
    }
  }

  return ADMITTED;
}
