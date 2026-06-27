// rendering module — PUBLIC SURFACE.
// Downstream PRESENTATION only: turns a domain-approved TerminalOutput (as a RenderableDomainOutput)
// into human-facing text via a deterministic fake renderer + a mandatory validator. It selects no
// VoiceMode, creates no TerminalOutput/Recommendation, mutates no aggregate, writes no event, and is
// never domain authority. It imports only shared-kernel + read-only decision-support types; no domain
// module imports it. No real LLM provider, prompt template, UI, API, or external call exists here.

export * from "./domain/index.ts";
