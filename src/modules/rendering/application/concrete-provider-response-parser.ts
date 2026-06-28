// rendering application: concrete-provider response parser (Impl 020). A PURE, deterministic parser over a
// neutral, provider-shaped response object (a local fixture this slice — never a real network response). It
// extracts ONLY draft text as an UNTRUSTED draft (+ operational metadata only) or maps an empty/malformed
// response to an operational failure. It never creates a RenderedMessage, never treats the response as
// evidence, and retains NO raw provider payload in the returned state.

import type { ProviderClientResponse, ProviderClientMetadata } from "../domain/index.ts";

/** A neutral, provider-shaped successful response. Mirrors a generic completion shape; no vendor specifics. */
export interface ConcreteProviderResponseShape {
  readonly choices?: readonly { readonly text?: unknown }[];
  readonly finishReason?: unknown;
  readonly usage?: { readonly totalTokens?: unknown };
  readonly latencyMs?: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Parse a provider-shaped response object into the existing ProviderClientResponse union. */
export function parseProviderResponse(raw: unknown, providerKind: string): ProviderClientResponse {
  // malformed: not an object, or no choices array
  if (raw === null || typeof raw !== "object") {
    return Object.freeze({ status: "failed", failure: "provider-returned-malformed-response" });
  }
  const shape = raw as ConcreteProviderResponseShape;
  if (!Array.isArray(shape.choices) || shape.choices.length === 0) {
    return Object.freeze({ status: "failed", failure: "provider-returned-malformed-response" });
  }

  const first = shape.choices[0];
  const text = asString(first?.text);
  if (text === undefined) {
    return Object.freeze({ status: "failed", failure: "provider-returned-malformed-response" });
  }
  // empty: present but no usable content
  if (text.trim().length === 0) {
    return Object.freeze({ status: "failed", failure: "provider-returned-empty-response" });
  }

  // operational metadata only — never domain authority, never evidence; the raw payload is NOT retained
  const finishReason = asString(shape.finishReason);
  const tokenCount = asNumber(shape.usage?.totalTokens);
  const latencyMs = asNumber(shape.latencyMs);
  const metadata: ProviderClientMetadata = Object.freeze({
    providerKind,
    ...(finishReason !== undefined ? { finishReason } : {}),
    ...(tokenCount !== undefined ? { tokenCount } : {}),
    ...(latencyMs !== undefined ? { latencyMs } : {}),
  });

  // untrusted draft — only the validator (never this parser) may turn it into a RenderedMessage
  return Object.freeze({ status: "draft", text, metadata });
}
