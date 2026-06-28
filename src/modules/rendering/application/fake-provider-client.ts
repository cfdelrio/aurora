// rendering application: FakeProviderClient — a DETERMINISTIC, in-process provider client. No real provider,
// no SDK, no network, no HTTP client, no environment reads, no secret. It exists only to prove the
// real-provider-ready boundary + failure mapping: per a fixed scenario it returns either a draft (safe, or
// deliberately unsafe to exercise the validator) or an operational failure. The validator — not this
// client — remains the safety guarantee.

import type {
  ProviderClientRequest,
  ProviderClientResponse,
  ProviderInstruction,
  ProviderOperationalFailure,
} from "../domain/index.ts";
import type { ProviderClientBoundary } from "./provider-client-boundary.ts";

export type FakeProviderClientScenario =
  | "safe"
  | "voice-escalating"
  | "invented-fact"
  | "hidden-uncertainty"
  | "missing-credential"
  | "invalid-credential"
  | "timeout"
  | "rate-limited"
  | "refused"
  | "unavailable"
  | "empty"
  | "malformed"
  | "unsafe-request";

function body(instruction: ProviderInstruction): string {
  return instruction.allowedClaims.join("; ");
}

function limitationsClause(instruction: ProviderInstruction): string {
  return instruction.limitations.length > 0 ? ` Limitations: ${instruction.limitations.join(", ")}.` : "";
}

/** A faithful draft that passes the mandatory validator for the instruction's kind/voice. */
function safeText(instruction: ProviderInstruction): string {
  const b = body(instruction);
  if (instruction.kind === "inquiry") {
    return `Aurora needs to ask: ${b}?`;
  }
  if (instruction.kind === "withholding") {
    return `Aurora is not offering guidance here. Reason: ${b}.${limitationsClause(instruction)}`;
  }
  return `Reflecting on what we have: ${b}. This may be incomplete.${limitationsClause(instruction)}`;
}

export class FakeProviderClient implements ProviderClientBoundary {
  readonly kind = "fake";
  private readonly scenario: FakeProviderClientScenario;

  constructor(opts?: { readonly scenario?: FakeProviderClientScenario }) {
    this.scenario = opts?.scenario ?? "safe";
  }

  requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse> {
    const instruction = input.instruction;
    const b = body(instruction);
    const drafted = (text: string): ProviderClientResponse =>
      Object.freeze({ status: "draft", text, metadata: Object.freeze({ providerKind: this.kind }) });
    const failed = (failure: ProviderOperationalFailure): ProviderClientResponse =>
      Object.freeze({ status: "failed", failure });

    switch (this.scenario) {
      case "safe":
        return Promise.resolve(drafted(safeText(instruction)));
      case "voice-escalating":
        return Promise.resolve(drafted(`You should ${b}. This may be incomplete.${limitationsClause(instruction)}`));
      case "invented-fact": {
        const fact = instruction.forbiddenClaims[0] ?? "an invented detail not in the approved content";
        return Promise.resolve(drafted(`Reflecting on what we have: ${b}. ${fact}. This may be incomplete.`));
      }
      case "hidden-uncertainty":
        return Promise.resolve(drafted(`Here is the assessment: ${b}.`));
      case "missing-credential":
        return Promise.resolve(failed("missing-credential"));
      case "invalid-credential":
        return Promise.resolve(failed("invalid-credential"));
      case "timeout":
        return Promise.resolve(failed("provider-timeout"));
      case "rate-limited":
        return Promise.resolve(failed("provider-rate-limited"));
      case "refused":
        return Promise.resolve(failed("provider-refused"));
      case "unavailable":
        return Promise.resolve(failed("provider-unavailable"));
      case "empty":
        return Promise.resolve(failed("provider-returned-empty-response"));
      case "malformed":
        return Promise.resolve(failed("provider-returned-malformed-response"));
      case "unsafe-request":
        return Promise.resolve(failed("unsafe-provider-request"));
    }
  }
}
