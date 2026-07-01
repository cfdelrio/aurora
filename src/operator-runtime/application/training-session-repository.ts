// operator-runtime application: the TrainingSessionRecord repository PORT.
// Minimal operational surface: save / findById / listByAthlete. It is a store only — it owns no
// domain, appends no event, delivers nothing, and creates no AthleteDecision.

import type { TrainingSessionId, TrainingSessionRecord } from "./training-session-record.ts";

export interface TrainingSessionRepository {
  save(record: TrainingSessionRecord): Promise<void>;
  findById(id: TrainingSessionId): Promise<TrainingSessionRecord | undefined>;
  listByAthlete(athleteRef: string): Promise<readonly TrainingSessionRecord[]>;
}
