// athlete application: thin coordinators. They COORDINATE, they do not reason.
// All purpose/history invariants live in the Athlete aggregate. This file imports only the
// athlete domain (and, transitively, shared-kernel) -- never any downstream module.

import { Athlete } from "../domain/index.ts";
import type { Purpose, PurposeChangeReason } from "../domain/index.ts";

export interface DeclarePurposeInput {
  readonly athlete: Athlete;
  readonly purpose: Purpose;
}

export function declarePurpose(input: DeclarePurposeInput): Athlete {
  return input.athlete.declarePurpose(input.purpose);
}

export interface ChangePurposeInput {
  readonly athlete: Athlete;
  readonly purpose: Purpose;
  readonly reason?: PurposeChangeReason;
}

export function changePurpose(input: ChangePurposeInput): Athlete {
  return input.athlete.changePurpose(input.purpose, input.reason);
}
