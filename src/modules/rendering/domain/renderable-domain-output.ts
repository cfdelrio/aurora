// rendering domain: RenderableDomainOutput — a read-only PROJECTION of a domain-approved TerminalOutput
// that is safe to render. The domain decided what may be said and how strongly; this carries exactly
// that, plus the constraints the renderer must honor. It carries no raw reasoning internals, no hidden
// facts, no unbounded prompt, no new recommendation, and no mutable aggregate ref.

import type { TerminalOutput, VoiceMode, SupportIntent, TraceabilityStatus } from "../../decision-support/index.ts";

export type RenderableKind = "support" | "inquiry" | "withholding";

/** A module-local freshness label (Spec 014A Decision 3) — rendering never imports `understanding`. */
export type RenderableFreshness = "current" | "stale" | "partial" | "invalid" | "unknown";

export interface RenderableTraceability {
  readonly status: TraceabilityStatus;
  readonly summary: string; // human-readable, taken from the domain reason — never invented
  readonly observationSetId?: string; // only when the domain resolved one
}

export interface RenderableDomainOutput {
  readonly sourceCaseRef: string;
  readonly kind: RenderableKind;
  /** present for `support`; it IS the tone ceiling — the renderer may match or soften, never exceed it */
  readonly voice?: VoiceMode;
  readonly intent?: SupportIntent;
  /** domain-approved content pieces (reasons / question+whatNeeded / reason) */
  readonly contentAtoms: readonly string[];
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitations: readonly string[];
  readonly freshness?: RenderableFreshness;
  readonly traceability?: RenderableTraceability;
  readonly agencyRequired: boolean;
  readonly conditions: readonly string[];
}

export interface RenderableFromTerminalOutputInput {
  readonly sourceCaseRef: string;
  readonly output: TerminalOutput;
  readonly freshness?: RenderableFreshness;
  readonly limitations?: readonly string[];
  readonly allowedClaims?: readonly string[];
  readonly forbiddenClaims?: readonly string[];
  readonly conditions?: readonly string[];
}

/**
 * Build a RenderableDomainOutput from a COMPLETED TerminalOutput (read-only). It evaluates no gate,
 * selects no voice, creates no output, and inspects nothing beyond what the terminal output exposes.
 */
export function renderableFromTerminalOutput(
  input: RenderableFromTerminalOutputInput,
): RenderableDomainOutput {
  const out = input.output;
  const limitations = Object.freeze([...(input.limitations ?? [])]);
  const forbiddenClaims = Object.freeze([...(input.forbiddenClaims ?? [])]);
  const conditions = Object.freeze([...(input.conditions ?? [])]);

  if (out.outcome === "support") {
    const contentAtoms = Object.freeze([...out.reasons]);
    const traceability: RenderableTraceability = Object.freeze({
      status: out.trace.status,
      summary: out.trace.reason,
      ...(out.trace.resolvedTo !== undefined ? { observationSetId: out.trace.resolvedTo.observationSetId } : {}),
    });
    return Object.freeze({
      sourceCaseRef: input.sourceCaseRef,
      kind: "support",
      voice: out.voice,
      intent: out.intent,
      contentAtoms,
      allowedClaims: Object.freeze([...(input.allowedClaims ?? out.reasons)]),
      forbiddenClaims,
      uncertaintyVisibleRequired: out.uncertaintyVisible,
      limitations,
      ...(input.freshness !== undefined ? { freshness: input.freshness } : {}),
      traceability,
      agencyRequired: out.preservesAgency,
      conditions,
    });
  }

  if (out.outcome === "inquiry") {
    const contentAtoms = Object.freeze([out.question, out.whatNeeded]);
    return Object.freeze({
      sourceCaseRef: input.sourceCaseRef,
      kind: "inquiry",
      contentAtoms,
      allowedClaims: Object.freeze([...(input.allowedClaims ?? contentAtoms)]),
      forbiddenClaims,
      uncertaintyVisibleRequired: true, // an inquiry is inherently a request, never a settled answer
      limitations,
      ...(input.freshness !== undefined ? { freshness: input.freshness } : {}),
      agencyRequired: true,
      conditions,
    });
  }

  // withholding
  const contentAtoms = Object.freeze([out.reason]);
  return Object.freeze({
    sourceCaseRef: input.sourceCaseRef,
    kind: "withholding",
    contentAtoms,
    allowedClaims: Object.freeze([...(input.allowedClaims ?? contentAtoms)]),
    forbiddenClaims,
    uncertaintyVisibleRequired: true,
    limitations,
    ...(input.freshness !== undefined ? { freshness: input.freshness } : {}),
    agencyRequired: true,
    conditions,
  });
}
