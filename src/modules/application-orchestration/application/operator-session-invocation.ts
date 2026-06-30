// application-orchestration application: the PRODUCTION operator invocation helper (Spec 041 / Tech Spec 041A).
//
// invokeOperatorSession is the SINGLE SAFE HANDLE for running the offline reflection runtime once. It exists to
// make redaction UNBYPASSABLE at the invocation seam: it awaits offlineReflectionRuntime, immediately maps the
// outcome through toOperatorSessionEnvelope, and returns ONLY the OperatorSessionEnvelope — so no caller (today's
// tests or a future CLI/API behind this helper) can receive or forward the raw OfflineReflectionRuntimeOutcome
// (its reflection.text, full trace, etc.). It is a SAFETY BOUNDARY, not a product surface.
//
// It assembles nothing, creates no deps, reads no process environment, resolves no secret, selects no provider, calls no
// live client (except through the runtime via the explicitly-injected deps), calls no delivery sink, persists
// nothing, and creates no AthleteDecision. There is NO helper-level try/catch: offlineReflectionRuntime already
// wraps its body and returns a safe `unexpected-failure` outcome on any error (it never throws / never leaks), so
// the helper is a pure pass-through to the mandatory mapper.
//
// invocation helper ≠ CLI ≠ script ≠ package command ≠ deployment ≠ API/UI ≠ live-provider enablement ≠ delivery
// mechanism ≠ persistence/session record ≠ whole-core composer ≠ AthleteDecision creator ≠ truth validator ≠
// recommendation quality proof · OperatorSessionEnvelope ≠ raw runtime outcome · reflection-ready ≠ delivered ≠
// AthleteDecision · deliveryWithheld ≠ delivery failure · decisionCapture invitation ≠ AthleteDecision ·
// Aurora advises, the athlete decides; Aurora never presents inference as fact.

import { offlineReflectionRuntime } from "./offline-reflection-runtime.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
} from "./offline-reflection-runtime.ts";
import { toOperatorSessionEnvelope } from "./operator-session-envelope.ts";
import type { OperatorSessionEnvelope } from "./operator-session-envelope.ts";

/**
 * Invoke the offline reflection runtime ONCE and return ONLY a safe OperatorSessionEnvelope. The caller assembles
 * the command (incl. the RenderingRequest) and injects the dependencies; this helper composes nothing and returns
 * no raw runtime outcome. The mandatory `toOperatorSessionEnvelope` projection is the only path out.
 */
export async function invokeOperatorSession<TSubmission>(
  command: OfflineReflectionRuntimeCommand<TSubmission>,
  deps: OfflineReflectionRuntimeDependencies<TSubmission>,
): Promise<OperatorSessionEnvelope> {
  const outcome = await offlineReflectionRuntime(command, deps);
  return toOperatorSessionEnvelope(outcome);
}
