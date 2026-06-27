// signal sub-boundary: the SignalDetectionPolicy.
//
// Deterministic and rule-based only (no ML, no statistical scoring, no formula). It decides
// Signal-vs-Rejection, relevance, direction (relative to context), qualitative salience, and
// rejection reason. It must NOT decide evidence, hypothesis, cause, impact, fatigue, readiness,
// capacity, recommendation, or athlete decision.

import type { ObservationQualityStatus } from "../observation-quality.ts";
import type { ContextualizedObservation } from "./contextualized-observation.ts";
import { signal } from "./signal.ts";
import type { Signal, SignalDirection, SignalSalience } from "./signal.ts";
import { signalRejection } from "./signal-rejection.ts";
import type { SignalRejection } from "./signal-rejection.ts";

export type SignalDetectionPolicy = (ctx: ContextualizedObservation) => Signal | SignalRejection;

function isDegraded(status: ObservationQualityStatus): boolean {
  return status !== "complete";
}

/**
 * The first built-in policy: deviation from an expected range for measured observations,
 * meaningful-absence for missing data, and report-relevance for subjective observations.
 * Fully explainable; every branch returns a Signal or an auditable SignalRejection.
 */
export const expectedRangeDeviationPolicy: SignalDetectionPolicy = (ctx) => {
  const o = ctx.observation;
  const q = ctx.quality;
  const source = [o.provenance.source];

  // Corrupted data cannot signal; the conflict/quality is preserved, never resolved away.
  if (q.status === "corrupted") {
    return signalRejection({
      trace: ctx.trace,
      frame: ctx.frame,
      reason: "insufficient-quality",
      quality: q,
      note: "observation marked corrupted",
    });
  }
  if (q.status === "source-conflicted") {
    return signalRejection({
      trace: ctx.trace,
      frame: ctx.frame,
      reason: "source-conflict-unresolved",
      quality: q,
      note: "sources disagree; conflict preserved, not resolved here",
    });
  }

  switch (o.kind) {
    case "measured": {
      const range = ctx.frame.expectedRange;
      if (range === undefined || ctx.frame.missingContext.includes("baseline")) {
        return signalRejection({
          trace: ctx.trace,
          frame: ctx.frame,
          reason: "missing-baseline",
          quality: q,
          note: "no expected range to judge against",
        });
      }
      const magnitude = o.measurement.magnitude;
      let direction: SignalDirection;
      if (magnitude > range.high) {
        direction = "above-expected";
      } else if (magnitude < range.low) {
        direction = "below-expected";
      } else {
        return signalRejection({
          trace: ctx.trace,
          frame: ctx.frame,
          reason: "expected-normal-variation",
          quality: q,
          note: "within expected range",
        });
      }
      const salience: SignalSalience = isDegraded(q.status) ? "weak" : "notable";
      return signal({
        trace: ctx.trace,
        frame: ctx.frame,
        questionTopic: `deviation:${o.measurement.quantity}`,
        direction,
        salience,
        quality: q,
        source,
        ...(isDegraded(q.status) ? { limitation: `observation quality is ${q.status}` } : {}),
      });
    }

    case "missing-data": {
      // Absence may matter, but only when there is enough context to say so.
      if (ctx.frame.purpose === undefined || ctx.frame.missingContext.includes("purpose")) {
        return signalRejection({
          trace: ctx.trace,
          frame: ctx.frame,
          reason: "insufficient-context",
          quality: q,
          note: "absence may matter, but context is insufficient to say",
        });
      }
      return signal({
        trace: ctx.trace,
        frame: ctx.frame,
        questionTopic: `absence:${o.expected}`,
        direction: "absent",
        salience: "notable",
        quality: q,
        source,
      });
    }

    case "subjective": {
      if (q.status === "context-missing") {
        return signalRejection({
          trace: ctx.trace,
          frame: ctx.frame,
          reason: "insufficient-context",
          quality: q,
          note: "self-report lacks the context to be situated",
        });
      }
      // The athlete's verbatim words remain reachable via trace -> original observation.
      return signal({
        trace: ctx.trace,
        frame: ctx.frame,
        questionTopic: "athlete-reported-state",
        direction: "deviates",
        salience: "notable",
        quality: q,
        source,
      });
    }
  }
};
