// rendering application: public surface.

export type { RenderedMessageRecordRepository } from "./rendered-message-record-repository.ts";
export { InMemoryRenderedMessageRecordRepository } from "./in-memory-rendered-message-record-repository.ts";

// Provider adapter seam (Impl 017) — a draft source behind the rendering boundary; the validator decides.
export type { ProviderAdapter } from "./provider-adapter.ts";
export { FakeProviderAdapter } from "./fake-provider-adapter.ts";
export type { FakeProviderScenario } from "./fake-provider-adapter.ts";
export { requestProviderRendering } from "./provider-rendering-service.ts";
export type { ProviderRenderOutcome, RequestProviderRenderingInput } from "./provider-rendering-service.ts";

// Provider attempt audit (Impl 018) — observe-only audit of the seam; repository + in-memory adapter.
export type { ProviderAttemptRecordRepository } from "./provider-attempt-record-repository.ts";
export { InMemoryProviderAttemptRecordRepository } from "./in-memory-provider-attempt-record-repository.ts";
export { auditProviderAttempt } from "./provider-attempt-audit-service.ts";
export type { AuditProviderAttemptInput } from "./provider-attempt-audit-service.ts";
