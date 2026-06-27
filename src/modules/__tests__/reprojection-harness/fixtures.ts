// Implementation 012 — reprojection harness test fixtures. Builds real domain objects via PUBLIC
// surfaces only (understanding + event-recording + shared-kernel). Not a .test. file.

import { timestamp } from "../../../shared-kernel/time.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";
import {
  UnderstandingProfile,
  InMemoryUnderstandingProfileRepository,
  reasoningOutcome,
  understandingDimension,
} from "../../understanding/index.ts";
import type { OutcomeKind, UnderstandingProfileId } from "../../understanding/index.ts";
import type { HypothesisId } from "../../reasoning/index.ts";
import {
  DomainEventRecord,
  domainEventRecordId,
  eventPayloadRef,
  traceabilityEnvelope,
} from "../../event-recording/index.ts";
import type { DomainEventType, EventPayloadRef } from "../../event-recording/index.ts";
import { reprojectionRunId } from "./reprojection.ts";
import type { ReprojectionTarget } from "./reprojection.ts";

export const T = (iso: string): Timestamp => timestamp(iso);
export const AT = T("2026-03-01T10:00:00.000Z");

let hyp = 0;
function hid(): HypothesisId {
  hyp += 1;
  return `hyp-${hyp}` as unknown as HypothesisId;
}

export interface ProfileFixture {
  readonly profile: UnderstandingProfile;
  readonly profileId: string;
  readonly dimensionKey: string;
  readonly repo: InMemoryUnderstandingProfileRepository;
}

/** A profile with one `supported` outcome → dimension at level Working (ceiling tentative). */
export function supportedProfile(kind: OutcomeKind = "supported"): ProfileFixture {
  const d = understandingDimension("aerobic-response", "high-intensity");
  const profile = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    reasoningOutcome({
      hypothesisId: hid(),
      athleteRef: "athlete:1",
      outcomeKind: kind,
      hadDeclaredFalsifier: true,
      conditions: ["c1"],
      dimension: d,
      at: T("2026-02-01T09:00:00.000Z"),
    }),
  );
  const repo = new InMemoryUnderstandingProfileRepository();
  repo.save(profile);
  return { profile, profileId: String(profile.id), dimensionKey: d.key, repo };
}

export function profileId(fixture: ProfileFixture): UnderstandingProfileId {
  return fixture.profile.id;
}

export function assessmentTarget(fixture: ProfileFixture): ReprojectionTarget {
  return {
    kind: "UnderstandingAssessment",
    primaryRef: eventPayloadRef({ kind: "UnderstandingProfile", id: fixture.profileId }),
    dimensionKey: fixture.dimensionKey,
  };
}

export const runId = (s: string) => reprojectionRunId(s);

// --- event builders (each references the affected UnderstandingProfile so candidate detection finds it) ---

function affected(profileIdStr: string): EventPayloadRef {
  return eventPayloadRef({ kind: "UnderstandingProfile", id: profileIdStr, role: "affected" });
}

function record(
  id: string,
  type: DomainEventType,
  category: "occurrence" | "outcome",
  producingModule: "observation" | "reasoning" | "understanding" | "decision-support" | "athlete",
  primary: EventPayloadRef,
  extraPayload: readonly EventPayloadRef[],
): DomainEventRecord {
  return DomainEventRecord.record({
    id: domainEventRecordId(id),
    type,
    category,
    occurredAt: T("2026-02-15T09:00:00.000Z"),
    recordedAt: T("2026-02-15T09:00:01.000Z"),
    producingModule,
    traceability: traceabilityEnvelope({ primaryArtifactRef: primary, sourceRefs: [] }),
    payloadRefs: extraPayload,
  });
}

export function purposeChanged(profileIdStr: string): DomainEventRecord {
  return record(
    "e-purpose",
    "PurposeChanged",
    "outcome",
    "athlete",
    eventPayloadRef({ kind: "Athlete", id: "athlete:1" }),
    [
      eventPayloadRef({ kind: "PurposeVersion", id: "pv:2", role: "subject" }),
      eventPayloadRef({ kind: "PurposeVersion", id: "pv:1", role: "supersedes" }),
      affected(profileIdStr),
    ],
  );
}

export function observationSuperseded(profileIdStr: string): DomainEventRecord {
  return record(
    "e-obs-superseded",
    "ObservationSuperseded",
    "outcome",
    "observation",
    eventPayloadRef({ kind: "ObservationSet", id: "obs:2" }),
    [eventPayloadRef({ kind: "ObservationSet", id: "obs:1", role: "supersedes" }), affected(profileIdStr)],
  );
}

export function evidenceAttached(profileIdStr: string): DomainEventRecord {
  return record(
    "e-evidence",
    "EvidenceAttached",
    "occurrence",
    "reasoning",
    eventPayloadRef({ kind: "Hypothesis", id: "h:1" }),
    [
      eventPayloadRef({ kind: "EvidenceCase", id: "ev:1", role: "evidence" }),
      eventPayloadRef({ kind: "Signal", id: "sig:1", role: "evidence" }),
      affected(profileIdStr),
    ],
  );
}

export function athleteDecisionRecorded(): DomainEventRecord {
  return DomainEventRecord.record({
    id: domainEventRecordId("e-decision"),
    type: "AthleteDecisionRecorded",
    category: "outcome",
    occurredAt: T("2026-02-16T09:00:00.000Z"),
    recordedAt: T("2026-02-16T09:00:01.000Z"),
    producingModule: "athlete",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "AthleteDecision", id: "dec:1" }),
      sourceRefs: [],
      decisionSupportCaseRef: eventPayloadRef({ kind: "DecisionSupportCase", id: "case:1", role: "support-context" }),
    }),
    actor: { kind: "athlete", athleteRef: "athlete:1" },
  });
}

export function terminalOutputSelected(): DomainEventRecord {
  return DomainEventRecord.record({
    id: domainEventRecordId("e-terminal"),
    type: "TerminalOutputSelected",
    category: "outcome",
    occurredAt: T("2026-02-16T09:00:00.000Z"),
    recordedAt: T("2026-02-16T09:00:01.000Z"),
    producingModule: "decision-support",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "DecisionSupportCase", id: "case:1", role: "withholding" }),
      sourceRefs: [],
    }),
  });
}

export { eventPayloadRef };
