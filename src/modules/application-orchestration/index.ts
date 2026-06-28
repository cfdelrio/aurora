// application-orchestration module — PUBLIC SURFACE.
// An APPLICATION COMPOSITION module, not a domain capability module: it owns no domain model, no repository,
// and no persistence; it introduces no bounded context. Its one surface, orchestrateRenderDeliver, composes
// the EXISTING public services of rendering / delivery / event-recording in a fixed, explicit order over
// INJECTED collaborators, returning a closed result + a ref-only trace. It coordinates boundaries; it does
// not dissolve them. It is NOT a workflow engine / event bus / scheduler / retry engine: no event or
// repository write triggers the next step, delivery is never automatic, and nothing here mutates domain
// state, treats provider success as evidence, or treats delivery success as an athlete decision. No domain
// module imports it; rendering/delivery/event-recording do not depend on it.

export * from "./application/index.ts";
