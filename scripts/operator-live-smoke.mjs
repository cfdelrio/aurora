// Aurora — manual operator live-smoke entrypoint (Impl 027). Plain ESM. NOT part of the default test suite, NOT
// part of `npm run check`, NOT an npm script, NO dependency. Run it manually, e.g.:
//
//   AURORA_LIVE_PROVIDER_SMOKE=1 AURORA_LIVE_PROVIDER_ENDPOINT=https://example/endpoint \
//   AURORA_PROVIDER_CREDENTIAL=… node scripts/operator-live-smoke.mjs
//
// It lives OUTSIDE `src` on purpose: it may read narrowly-scoped, non-secret operator flags (opt-in / CI /
// endpoint) from the process environment here without adding a new in-`src` read site — the production
// process-environment seal (one approved file) is untouched. The SECRET credential is read ONLY through the
// approved ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver chain. It wires the
// existing public live-provider surfaces and calls the existing liveProviderSmoke helper ONCE — it duplicates no
// smoke semantics and bypasses neither liveProviderSmoke nor requestRealProviderRendering nor validateDraft. It
// prints ONE redacted JSON object and exits per the 027A policy. It performs no persistence, no delivery, no
// event recording, no orchestration delivery path, no evidence/athlete-decision/domain mutation, and no repeated
// or looping call. Smoke proves wiring, not wisdom; a `passed` result is wiring success only, never product-ready.

import {
  liveProviderSmoke,
  LiveCallPolicy,
  LiveProviderClient,
  liveProviderHttpTransport,
  EnvironmentProviderCredentialResolver,
  processEnvironmentCredentialSourceAdapter,
  APPROVED_PROVIDER_CREDENTIAL_KEY,
  parseOperatorSmokeEnv,
  syntheticSmokeRenderingRequest,
  operatorSmokeOutput,
  operatorSmokeExitCode,
  OPERATOR_SMOKE_ENDPOINT_KEY,
} from "../src/modules/rendering/index.ts";

// 1. Parse the narrowly-scoped operator indicators (opt-in / CI). The helper owns the gates; this only supplies
//    the booleans. The endpoint is a non-secret operator URL read here, outside `src`.
const indicators = parseOperatorSmokeEnv(process.env);
const endpoint = process.env[OPERATOR_SMOKE_ENDPOINT_KEY] ?? "";

// 2. Resolve the credential ONLY through the approved adapter chain (the secret read stays in the one approved
//    in-`src` file; this script never reads the credential value itself).
const source = processEnvironmentCredentialSourceAdapter().toEnvironmentCredentialSource();
const resolver = new EnvironmentProviderCredentialResolver({ keyName: APPROVED_PROVIDER_CREDENTIAL_KEY, source });

// 3. Wire the existing live-provider surfaces for THIS invocation only (enabled policy; the single approved
//    native transport behind the injected endpoint).
const policy = LiveCallPolicy.enabled({ source: "operator-live-smoke" });
const transport = liveProviderHttpTransport({ endpoint });
const client = new LiveProviderClient({ policy, resolver, transport });

// 4. ONE call to the existing helper — it enforces opt-in → CI → credential → live policy (each before any
//    provider call), the single bounded call, the mandatory validateDraft, and the redacted result.
const result = await liveProviderSmoke(
  { optIn: indicators.optIn, ci: indicators.ci, request: syntheticSmokeRenderingRequest() },
  { client, policy, resolver, config: { providerKind: "live" } },
);

// 5. Print ONE redacted JSON object and exit per the 027A policy. No raw body / secret / env value is emitted.
process.stdout.write(`${JSON.stringify(operatorSmokeOutput(result))}\n`);
process.exitCode = operatorSmokeExitCode(result.status);
