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

// Concrete-provider adapter shell (Impl 020) — first selected-provider adapter, NEUTRAL in code; disabled by
// default, deterministic serializer / parser / error-mapper, no SDK/network/secret/live-call. Same validator.
export { ConcreteProviderClient } from "./concrete-provider-client.ts";
export type {
  ConcreteProviderClientOptions,
  ConcreteProviderFixture,
  ConcreteProviderTransport,
} from "./concrete-provider-client.ts";
export { serializeProviderInstruction } from "./concrete-provider-prompt-serializer.ts";
export type { ConcreteProviderRequestPayload } from "./concrete-provider-prompt-serializer.ts";
export { parseProviderResponse } from "./concrete-provider-response-parser.ts";
export type { ConcreteProviderResponseShape } from "./concrete-provider-response-parser.ts";
export { mapProviderError } from "./concrete-provider-error-mapper.ts";
export type { ConcreteProviderErrorKind, ConcreteProviderErrorShape } from "./concrete-provider-error-mapper.ts";

// Live provider call enablement (Impl 021) — opt-in, fail-closed live client behind the same async
// ProviderClientBoundary; native HTTP in one approved transport file; disabled by default; no SDK, no env read.
export { LiveCallPolicy } from "./live-call-policy.ts";
export { providerCredentialToken } from "./provider-credential-resolver.ts";
export type {
  ProviderCredentialResolver,
  ProviderCredentialResolution,
  ProviderCredentialToken,
} from "./provider-credential-resolver.ts";
export { StaticProviderCredentialResolver } from "./static-provider-credential-resolver.ts";
export type { StaticCredentialStatus } from "./static-provider-credential-resolver.ts";
export { liveProviderHttpTransport } from "./live-provider-http-transport.ts";
export type { LiveProviderTransport, LiveProviderTransportResult } from "./live-provider-http-transport.ts";
export { LiveProviderClient } from "./live-provider-client.ts";
export type { LiveProviderClientDeps } from "./live-provider-client.ts";

// Environment secret resolver (Impl 022) — injected env-map ProviderCredentialResolver; no process environment
// read, no real secret, transient opaque token only; credential availability is NOT live-call enablement.
export { EnvironmentProviderCredentialResolver } from "./environment-provider-credential-resolver.ts";
export type {
  EnvironmentCredentialSource,
  EnvironmentResolverConfig,
  CredentialValidationPolicy,
} from "./environment-provider-credential-resolver.ts";

// Direct process-environment adapter (Impl 023) — the one approved file that reads the real process environment;
// it feeds the injected EnvironmentCredentialSource shape, never replaces the resolver, never enables live calls.
export {
  ProcessEnvironmentCredentialSourceAdapter,
  processEnvironmentCredentialSourceAdapter,
  defaultProcessEnvironmentAccessor,
  APPROVED_PROVIDER_CREDENTIAL_KEY,
} from "./process-environment-credential-source-adapter.ts";
export type {
  ProcessEnvironmentAccessor,
  ProcessEnvironmentAdapterConfig,
} from "./process-environment-credential-source-adapter.ts";
