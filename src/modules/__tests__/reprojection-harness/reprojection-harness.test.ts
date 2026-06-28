// Implementation 012 — reprojection harness behavior (UC1-UC13). Check-only: recompute + compare +
// report; mutate nothing. Negative cases are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { runReprojection } from "./reprojection-harness.ts";
import type { ReprojectionInputSet } from "./reprojection.ts";
import { produceUnderstandingAssessment, projectionTrace } from "../../understanding/index.ts";
import type { UnderstandingProfile, UnderstandingProfileId } from "../../understanding/index.ts";
import {
  AT,
  assessmentTarget,
  athleteDecisionRecorded,
  evidenceAttached,
  observationSuperseded,
  purposeChanged,
  runId,
  supportedProfile,
  terminalOutputSelected,
  T,
} from "./fixtures.ts";

function baseInput(over: Partial<ReprojectionInputSet> = {}): ReprojectionInputSet {
  return { runId: runId("run-1"), startedAt: T("2026-03-01T10:00:00.000Z"), requestedTargets: [], ...over };
}

function only(run: ReturnType<typeof runReprojection>) {
  const r = run.results[0];
  assert.ok(r, "expected exactly one result");
  return r;
}

// UC1 — recompute current UnderstandingAssessment (check-only) -------------------------------------
test("UC1 — recomputes an UnderstandingAssessment with freshness/source refs/derivedAt/limitations", () => {
  const f = supportedProfile();
  const run = runReprojection(baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, at: AT }));
  const r = only(run);
  assert.ok(r.recomputed);
  assert.equal(r.recomputed.freshness?.status, "current");
  assert.ok(r.sourceRefs.length >= 1);
  assert.equal(r.recomputed.derivedAt?.iso, AT.iso);
  assert.equal(r.traceability, "verified");
  assert.ok(Array.isArray(r.limitations));
});

// UC2 — stale after PurposeChanged; Purpose + profile not overwritten ------------------------------
test("UC2 — PurposeChanged makes the assessment stale without overwriting Purpose or the profile", () => {
  const f = supportedProfile();
  const before = JSON.stringify(f.repo.findById(f.profile.id)?.toState());
  const run = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, events: [purposeChanged(f.profileId)], at: AT }),
  );
  const r = only(run);
  assert.ok(r.findings.includes("stale"));
  assert.equal(r.freshness?.status, "stale");
  assert.equal(JSON.stringify(f.repo.findById(f.profile.id)?.toState()), before); // profile unchanged
});

// UC3 — invalid/source-superseded after ObservationSuperseded -------------------------------------
test("UC3 — ObservationSuperseded marks the derived view invalid + source-superseded", () => {
  const f = supportedProfile();
  const run = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, events: [observationSuperseded(f.profileId)] }),
  );
  const r = only(run);
  assert.ok(r.findings.includes("invalid"));
  assert.ok(r.findings.includes("source-superseded"));
  assert.equal(r.freshness?.status, "invalid");
});

// UC4 — missing traceability constrains downstream use --------------------------------------------
test("UC4 — an existing view with no source refs yields missing-traceability + constrain-voice", () => {
  const f = supportedProfile();
  const base = produceUnderstandingAssessment({ profile: f.profile, dimensionKey: f.dimensionKey });
  assert.ok(base);
  const target = assessmentTarget(f);
  const stripped = Object.freeze({ ...base, sourceRefs: projectionTrace([]) });
  const run = runReprojection(
    baseInput({ requestedTargets: [target], understandingProfiles: f.repo, existingViews: [{ target, view: stripped }] }),
  );
  const r = only(run);
  assert.ok(r.findings.includes("missing-traceability"));
  assert.equal(r.safeAction, "constrain-voice");
});

// UC5 — events identify candidates but execute nothing --------------------------------------------
test("UC5 — events identify candidate targets without executing commands", () => {
  const f = supportedProfile();
  const before = JSON.stringify(f.repo.findById(f.profile.id)?.toState());
  const run = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, events: [purposeChanged(f.profileId)] }),
  );
  assert.equal(run.eventsConsidered.length, 1);
  assert.equal(run.errors.length, 0);
  assert.equal(JSON.stringify(f.repo.findById(f.profile.id)?.toState()), before);
});

// UC6 — event log alone cannot rebuild aggregate state --------------------------------------------
test("UC6 — empty repository + events does not rebuild an aggregate (event-record-only)", () => {
  const f = supportedProfile();
  const run = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], events: [purposeChanged(f.profileId)] }), // no repository
  );
  const r = only(run);
  assert.ok(r.findings.includes("event-record-only"));
  assert.equal(r.recomputed, undefined); // no aggregate synthesized
});

test("UC6b — no profile and no referencing event yields missing-source", () => {
  const f = supportedProfile();
  const run = runReprojection(baseInput({ requestedTargets: [assessmentTarget(f)] })); // no repository
  assert.ok(only(run).findings.includes("missing-source"));
});

// UC7 — new reasoning outcomes require a policy transition (not applied) ---------------------------
test("UC7 — hypothesis-related events require a policy transition instead of a direct update", () => {
  const f = supportedProfile();
  const before = JSON.stringify(f.repo.findById(f.profile.id)?.toState());
  const run = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, events: [evidenceAttached(f.profileId)] }),
  );
  assert.ok(only(run).findings.includes("requires-policy-transition"));
  assert.equal(JSON.stringify(f.repo.findById(f.profile.id)?.toState()), before); // profile not updated
});

// UC8 — DecisionSupport review is not a TerminalOutput --------------------------------------------
test("UC8 — a stale-dependent case yields a review finding, never a TerminalOutput", () => {
  const f = supportedProfile();
  const run = runReprojection(
    baseInput({
      requestedTargets: [assessmentTarget(f)],
      understandingProfiles: f.repo,
      events: [purposeChanged(f.profileId), terminalOutputSelected()],
    }),
  );
  assert.ok(only(run).findings.includes("stale"));
  const json = JSON.stringify(run).toLowerCase();
  for (const banned of ["terminaloutput", "recommendation", "voicemode", '"inquiry"']) {
    assert.ok(!json.includes(banned), `run must not contain '${banned}'`);
  }
});

// UC9/UC11 — athlete outcome does not validate support / no compliance score -----------------------
test("UC9/UC11 — an AthleteDecision outcome does not rewrite SupportQuality or score compliance", () => {
  const f = supportedProfile();
  const run = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, events: [athleteDecisionRecorded()] }),
  );
  const json = JSON.stringify(run).toLowerCase();
  for (const banned of ["supportquality", "compliance", "obedien", "correctness", "score"]) {
    assert.ok(!json.includes(banned), `run must not contain '${banned}'`);
  }
});

// UC10 — check-only default mutates nothing -------------------------------------------------------
test("UC10 — no explicit mode runs check-only and mutates nothing", () => {
  const f = supportedProfile();
  const before = JSON.stringify(f.repo.findById(f.profile.id)?.toState());
  const run = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, events: [purposeChanged(f.profileId)] }),
  );
  assert.equal(run.mode, "check-only");
  assert.equal(JSON.stringify(f.repo.findById(f.profile.id)?.toState()), before);
});

// UC12 — drift is reported, not overwritten -------------------------------------------------------
test("UC12 — drift between a stored view and the recomputed view is reported as 'changed'", () => {
  const f = supportedProfile();
  const base = produceUnderstandingAssessment({ profile: f.profile, dimensionKey: f.dimensionKey });
  assert.ok(base);
  const target = assessmentTarget(f);
  const drifted = Object.freeze({ ...base, level: "Mature" as const, safeVoiceCeiling: "confident" as const });
  const before = JSON.stringify(f.repo.findById(f.profile.id)?.toState());
  const run = runReprojection(
    baseInput({ requestedTargets: [target], understandingProfiles: f.repo, existingViews: [{ target, view: drifted }] }),
  );
  const r = only(run);
  assert.ok(r.findings.includes("changed"));
  assert.ok((r.differences?.length ?? 0) >= 1);
  assert.equal(JSON.stringify(f.repo.findById(f.profile.id)?.toState()), before); // not overwritten
});

// UC13 — stale/invalid freshness does not strengthen voice ----------------------------------------
test("UC13 — a stale recompute only lowers the ceiling, never raises it", () => {
  const f = supportedProfile();
  const fresh = runReprojection(baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo }));
  const stale = runReprojection(
    baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo, events: [purposeChanged(f.profileId)] }),
  );
  assert.equal(only(fresh).recomputed?.safeVoiceCeiling, "tentative");
  assert.equal(only(stale).recomputed?.safeVoiceCeiling, "none"); // lowered, never raised
});

// mutation safety — a throwing save is never called -----------------------------------------------
test("check-only never calls a write method (a throwing save is never reached)", () => {
  const f = supportedProfile();
  const throwingRepo = {
    findById: (id: UnderstandingProfileId): UnderstandingProfile | undefined => f.repo.findById(id),
    save: (): void => {
      throw new Error("check-only must never call save()");
    },
  };
  assert.doesNotThrow(() =>
    runReprojection(
      baseInput({ requestedTargets: [assessmentTarget(f)], understandingProfiles: throwingRepo, events: [purposeChanged(f.profileId)] }),
    ),
  );
});

// reserved modes throw ----------------------------------------------------------------------------
test("reserved modes (refresh-derived / mark-stale) are not implemented and throw", () => {
  const f = supportedProfile();
  for (const mode of ["refresh-derived", "mark-stale"] as const) {
    assert.throws(
      () => runReprojection(baseInput({ mode, requestedTargets: [assessmentTarget(f)], understandingProfiles: f.repo })),
      /not implemented in this slice/,
    );
  }
});
