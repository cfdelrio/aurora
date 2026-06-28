// Implementation 027 — behavior of the operator live-smoke entrypoint's PURE support helpers. Deterministic,
// fakes only, NO live call, NO real environment, NO CI credential. The helpers parse INJECTED operator
// indicators, build a safe synthetic request, project a redacted output, and map a safe exit code; an
// end-to-end check feeds them through the unchanged liveProviderSmoke with fakes. Negative checks are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseOperatorSmokeEnv,
  syntheticSmokeRenderingRequest,
  operatorSmokeOutput,
  operatorSmokeExitCode,
  OPERATOR_SMOKE_OPT_IN_KEY,
  OPERATOR_SMOKE_OPT_IN_VALUE,
  OPERATOR_SMOKE_CI_KEY,
  liveProviderSmoke,
  FakeProviderClient,
  LiveCallPolicy,
  StaticProviderCredentialResolver,
} from "../index.ts";
import type {
  LiveProviderSmokeResult,
  LiveProviderSmokeStatus,
  LiveProviderSmokeDependencies,
  ProviderClientConfig,
  FakeProviderClientScenario,
} from "../index.ts";

const CONFIG: ProviderClientConfig = { providerKind: "live" };

function deps(over: Partial<LiveProviderSmokeDependencies> = {}): LiveProviderSmokeDependencies {
  return {
    client: new FakeProviderClient({ scenario: "safe" }),
    policy: LiveCallPolicy.enabled(),
    resolver: new StaticProviderCredentialResolver({ status: "available" }),
    config: CONFIG,
    ...over,
  };
}

const ALL_STATUSES: readonly LiveProviderSmokeStatus[] = [
  "not-enabled",
  "ci-disabled",
  "credential-missing",
  "credential-invalid",
  "live-policy-disabled",
  "provider-failed",
  "validation-failed",
  "passed",
  "unexpected-failure",
];

// --- env parsing ----------------------------------------------------------------------------------

test("parseOperatorSmokeEnv: absent opt-in → not enabled", () => {
  assert.equal(parseOperatorSmokeEnv({}).optIn, false);
});

test("parseOperatorSmokeEnv: exact AURORA_LIVE_PROVIDER_SMOKE=1 enables", () => {
  assert.equal(parseOperatorSmokeEnv({ [OPERATOR_SMOKE_OPT_IN_KEY]: OPERATOR_SMOKE_OPT_IN_VALUE }).optIn, true);
});

test("parseOperatorSmokeEnv: malformed opt-in fails closed (truthy variants do NOT enable)", () => {
  for (const v of ["true", "yes", "0", "2", "", " 1 ", "TRUE"]) {
    assert.equal(parseOperatorSmokeEnv({ [OPERATOR_SMOKE_OPT_IN_KEY]: v }).optIn, false, `value '${v}' must not enable`);
  }
});

test("parseOperatorSmokeEnv: CI truthy blocks; absent/empty/false/0 do not", () => {
  for (const v of ["1", "true", "yes", "TRUE"]) {
    assert.equal(parseOperatorSmokeEnv({ [OPERATOR_SMOKE_CI_KEY]: v }).ci, true, `CI='${v}' must block`);
  }
  for (const v of [undefined, "", "0", "false", "FALSE"]) {
    const env = v === undefined ? {} : { [OPERATOR_SMOKE_CI_KEY]: v };
    assert.equal(parseOperatorSmokeEnv(env).ci, false, `CI='${String(v)}' must not block`);
  }
});

// --- output projection (redacted) -----------------------------------------------------------------

function sampleResult(status: LiveProviderSmokeStatus): LiveProviderSmokeResult {
  return Object.freeze({
    status,
    rawRetained: false,
    ...(status === "passed" ? { validationPassed: true } : {}),
    ...(status === "validation-failed" ? { validationPassed: false, reason: "provider-output-failed-validation" } : {}),
    ...(status === "provider-failed" ? { providerFailureCode: "provider-unavailable", reason: "provider-unavailable" } : {}),
  });
}

test("operatorSmokeOutput: redacts — rawRetained false, sideEffects none, no raw/body/secret fields", () => {
  for (const status of ALL_STATUSES) {
    const out = operatorSmokeOutput(sampleResult(status));
    assert.equal(out.rawRetained, false);
    assert.equal(out.sideEffects, "none");
    const json = JSON.stringify(out).toLowerCase();
    for (const banned of [
      "energy felt low",
      "reflecting on what we have",
      "operational smoke check",
      "ref:live",
      "opaque:",
      "bearer",
      "secret",
      "apikey",
      "process" + ".env",
    ]) {
      assert.equal(json.includes(banned), false, `output for '${status}' must not contain '${banned}'`);
    }
  }
});

test("operatorSmokeOutput: wiringOnly true only for passed (product-not-ready elsewhere)", () => {
  for (const status of ALL_STATUSES) {
    assert.equal(operatorSmokeOutput(sampleResult(status)).wiringOnly, status === "passed");
  }
});

// --- exit-code policy -----------------------------------------------------------------------------

test("operatorSmokeExitCode: 0 for passed", () => {
  assert.equal(operatorSmokeExitCode("passed"), 0);
});

test("operatorSmokeExitCode: 0 for the safe skips (not-enabled, ci-disabled)", () => {
  assert.equal(operatorSmokeExitCode("not-enabled"), 0);
  assert.equal(operatorSmokeExitCode("ci-disabled"), 0);
});

test("operatorSmokeExitCode: 1 for credential/provider/validation/unexpected failures", () => {
  for (const status of ["credential-missing", "credential-invalid", "live-policy-disabled", "provider-failed", "validation-failed", "unexpected-failure"] as const) {
    assert.equal(operatorSmokeExitCode(status), 1, `'${status}' must exit 1`);
  }
});

// --- synthetic request ----------------------------------------------------------------------------

test("syntheticSmokeRenderingRequest: contains no athlete-sensitive / real training data", () => {
  const json = JSON.stringify(syntheticSmokeRenderingRequest()).toLowerCase();
  for (const banned of ["energy felt low", "heart rate", "fatigue", "readiness", "athlete:", "training"]) {
    assert.equal(json.includes(banned), false, `synthetic request must not contain '${banned}'`);
  }
  // it is clearly synthetic
  assert.equal(json.includes("synthetic"), true);
});

// --- end-to-end through the UNCHANGED helper, with fakes (no live call) ----------------------------

test("end-to-end (fakes): a safe draft → passed → redacted output, exit 0", async () => {
  const { optIn, ci } = parseOperatorSmokeEnv({ [OPERATOR_SMOKE_OPT_IN_KEY]: "1" });
  const result = await liveProviderSmoke(
    { optIn, ci, request: syntheticSmokeRenderingRequest() },
    deps({ client: new FakeProviderClient({ scenario: "safe" }) }),
  );
  assert.equal(result.status, "passed");
  const out = operatorSmokeOutput(result);
  assert.equal(out.wiringOnly, true);
  assert.equal(out.rawRetained, false);
  assert.equal(operatorSmokeExitCode(result.status), 0);
  // the rendered body must never reach the operator output
  assert.equal(JSON.stringify(out).toLowerCase().includes("operational smoke check"), false);
});

test("end-to-end (fakes): validation failure → validation-failed → exit 1; provider failure → provider-failed → exit 1", async () => {
  const cases: ReadonlyArray<readonly [FakeProviderClientScenario, LiveProviderSmokeStatus]> = [
    ["voice-escalating", "validation-failed"],
    ["unavailable", "provider-failed"],
    ["malformed", "provider-failed"],
  ];
  for (const [scenario, expected] of cases) {
    const result = await liveProviderSmoke(
      { optIn: true, ci: false, request: syntheticSmokeRenderingRequest() },
      deps({ client: new FakeProviderClient({ scenario }) }),
    );
    assert.equal(result.status, expected, `scenario '${scenario}'`);
    assert.equal(operatorSmokeExitCode(result.status), 1);
  }
});

test("end-to-end (fakes): missing credential → credential-missing before transport → exit 1", async () => {
  const result = await liveProviderSmoke(
    { optIn: true, ci: false, request: syntheticSmokeRenderingRequest() },
    deps({ resolver: new StaticProviderCredentialResolver({ status: "missing" }) }),
  );
  assert.equal(result.status, "credential-missing");
  assert.equal(operatorSmokeExitCode(result.status), 1);
});

test("end-to-end (fakes): no opt-in → not-enabled → exit 0; CI → ci-disabled → exit 0", async () => {
  const noOptIn = parseOperatorSmokeEnv({});
  const r1 = await liveProviderSmoke({ optIn: noOptIn.optIn, ci: noOptIn.ci, request: syntheticSmokeRenderingRequest() }, deps());
  assert.equal(r1.status, "not-enabled");
  assert.equal(operatorSmokeExitCode(r1.status), 0);

  const ciOn = parseOperatorSmokeEnv({ [OPERATOR_SMOKE_OPT_IN_KEY]: "1", [OPERATOR_SMOKE_CI_KEY]: "1" });
  const r2 = await liveProviderSmoke({ optIn: ciOn.optIn, ci: ciOn.ci, request: syntheticSmokeRenderingRequest() }, deps());
  assert.equal(r2.status, "ci-disabled");
  assert.equal(operatorSmokeExitCode(r2.status), 0);
});
