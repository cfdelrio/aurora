// delivery domain: DeliverySink — a deterministic, test-only exposure surface. It performs NO external call,
// NO provider integration, NO randomness, NO retry, NO scheduling. It does not interpret the message, mutate
// domain state, append events, or create UI/API output. A real provider/channel would later implement this
// same interface behind the same delivery service.

import type { RenderedMessageRecordId } from "../../rendering/index.ts";
import type { DeliveryTarget } from "./delivery-target.ts";

export interface DeliverInput {
  readonly recordRef: RenderedMessageRecordId;
  readonly target: DeliveryTarget;
  /** the already-eligible rendered text (read-only; the sink does not interpret it) */
  readonly text: string;
}

export type SinkResult =
  | { readonly status: "delivered" }
  | { readonly status: "failed"; readonly reason: "sink-unavailable" }
  | { readonly status: "cancelled" };

export interface DeliverySink {
  readonly kind: string; // descriptive label, e.g. "test-sink" — not a channel
  deliver(input: DeliverInput): SinkResult;
}

export type TestSinkBehavior = "deliver" | "fail" | "cancel";

/** The only sink in this slice. Deterministic: its result is fixed at construction; it records each
 *  exposure in-memory for assertions and performs no I/O. */
export class InMemoryTestSink implements DeliverySink {
  readonly kind = "test-sink";
  private readonly behavior: TestSinkBehavior;
  private readonly _delivered: { recordRef: RenderedMessageRecordId; target: DeliveryTarget }[] = [];

  constructor(opts?: { readonly behavior?: TestSinkBehavior }) {
    this.behavior = opts?.behavior ?? "deliver";
  }

  deliver(input: DeliverInput): SinkResult {
    this._delivered.push({ recordRef: input.recordRef, target: input.target });
    if (this.behavior === "fail") return { status: "failed", reason: "sink-unavailable" };
    if (this.behavior === "cancel") return { status: "cancelled" };
    return { status: "delivered" };
  }

  get delivered(): readonly { recordRef: RenderedMessageRecordId; target: DeliveryTarget }[] {
    return Object.freeze([...this._delivered]);
  }
}
