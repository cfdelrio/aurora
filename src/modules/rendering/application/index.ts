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

// Real-provider-ready boundary (Impl 019) — async client boundary + fake client; same validator, no real SDK.
export type { ProviderClientBoundary } from "./provider-client-boundary.ts";
export { FakeProviderClient } from "./fake-provider-client.ts";
export type { FakeProviderClientScenario } from "./fake-provider-client.ts";
export { realProviderAdapter } from "./real-provider-adapter.ts";
export type { RealProviderAdapter } from "./real-provider-adapter.ts";
export { requestRealProviderRendering } from "./real-provider-rendering-service.ts";
export type { RequestRealProviderRenderingInput } from "./real-provider-rendering-service.ts";
