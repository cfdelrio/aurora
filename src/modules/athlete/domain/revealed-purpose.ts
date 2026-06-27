// athlete domain: RevealedPurposeSignal — a placeholder marking a possible declared-vs-revealed
// mismatch. It is EVIDENCE/INQUIRY MATERIAL, never a Purpose. It carries NO path to changePurpose:
// declared purpose can only be replaced by an athlete-sourced declaration, never by behavior.

import type { Timestamp } from "../../../shared-kernel/time.ts";

export interface RevealedPurposeSignal {
  readonly note: string;
  readonly at: Timestamp;
}

export function revealedPurposeSignal(note: string, at: Timestamp): RevealedPurposeSignal {
  if (typeof note !== "string" || note.length === 0) {
    throw new Error("A RevealedPurposeSignal requires a non-empty note");
  }
  return Object.freeze({ note, at });
}
