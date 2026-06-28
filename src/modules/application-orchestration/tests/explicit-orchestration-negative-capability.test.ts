// Implementation 025 — negative capability for the explicit application orchestration boundary. The module is
// application composition only: ref-only trace/result, raw-free, dependency-only on the PUBLIC surfaces of
// rendering/delivery/event-recording (+ shared-kernel), never importing live transport / credential resolver /
// process-env adapter / concrete provider internals, never imported by those modules, and never an
// event-bus/scheduler/queue/retry/workflow module. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { orchestrateRenderDeliver } from "../index.ts";
import type { ExplicitOrchestrationDependencies } from "../index.ts";
import { FakeProviderClient, InMemoryRenderedMessageRecordRepository, InMemoryProviderAttemptRecordRepository } from "../../rendering/index.ts";
import { req, supportRenderable } from "../../rendering/tests/fixtures.ts";
import { InMemoryTestSink, InMemoryDeliveryRecordRepository } from "../../delivery/index.ts";
import { InMemoryDomainEventRecordRepository } from "../../event-recording/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const here = dirname(fileURLToPath(import.meta.url)); // .../application-orchestration/tests
const moduleDir = join(here, ".."); // .../application-orchestration
const modulesDir = join(moduleDir, ".."); // .../modules
const srcDir = join(modulesDir, ".."); // .../src
const repoRoot = join(srcDir, ".."); // repo root

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}
function productionFiles(dir: string): string[] {
  return collectTsFiles(dir).filter((f) => !f.endsWith(".test.ts") && !f.includes("/tests/") && !f.includes("__tests__"));
}
function importSpecs(src: string): string[] {
  const specs: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) specs.push(m[1] ?? "");
  return specs;
}

const TIMING = {
  occurredAt: timestamp("2026-09-01T10:00:00.000Z"),
  recordedAt: timestamp("2026-09-01T10:00:05.000Z"),
  requestedAt: timestamp("2026-09-01T10:00:00.000Z"),
  completedAt: timestamp("2026-09-01T10:00:01.000Z"),
  createdAt: timestamp("2026-09-01T10:00:02.000Z"),
  now: timestamp("2026-09-01T10:00:03.000Z"),
} as const;

function deliveredHarness(): { deps: ExplicitOrchestrationDependencies; eventRepo: InMemoryDomainEventRecordRepository } {
  const eventRepo = new InMemoryDomainEventRecordRepository();
  const deps: ExplicitOrchestrationDependencies = {
    client: new FakeProviderClient({ scenario: "safe" }),
    config: { providerKind: "fake" },
    secret: { status: "present", ref: "ref:fake" },
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: new InMemoryRenderedMessageRecordRepository(),
    providerAttemptRepository: new InMemoryProviderAttemptRecordRepository(),
    deliverySink: new InMemoryTestSink({ behavior: "deliver" }),
    deliveryRecordRepository: new InMemoryDeliveryRecordRepository(),
    eventRepository: eventRepo,
  };
  return { deps, eventRepo };
}

// --- ref-only / raw-free ---------------------------------------------------------------------------

test("the result trace contains safe refs only (strings / enums / string arrays — no objects, no raw content)", async () => {
  const { deps } = deliveredHarness();
  const out = await orchestrateRenderDeliver(
    {
      request: req(supportRenderable()),
      timing: TIMING,
      recordEvents: true,
      review: { decision: "approved-for-display", reasons: ["faithful-to-domain-output"], reviewerKind: "test" },
      delivery: { target: "test-sink", requesterKind: "test" },
    },
    deps,
  );
  assert.equal(out.kind, "delivered");
  for (const [key, value] of Object.entries(out.trace)) {
    if (Array.isArray(value)) {
      assert.ok(value.every((v) => typeof v === "string"), `trace.${key} must be a string[]`);
    } else {
      assert.equal(typeof value, "string", `trace.${key} must be a string/enum, not ${typeof value}`);
    }
  }
});

test("no raw draft/prompt/payload/secret/env value/message body in result or recorded events", async () => {
  const { deps, eventRepo } = deliveredHarness();
  const out = await orchestrateRenderDeliver(
    {
      request: req(supportRenderable()),
      timing: TIMING,
      recordEvents: true,
      review: { decision: "approved-for-display", reasons: ["faithful-to-domain-output"], reviewerKind: "test" },
      delivery: { target: "test-sink", requesterKind: "test" },
    },
    deps,
  );
  const json = (
    JSON.stringify(out) + JSON.stringify(eventRepo.all().map((r) => r.toState()))
  ).toLowerCase();
  for (const banned of [
    "ref:fake", // the operational secret ref must never enter the result/trace/events
    "bearer",
    "authorization",
    "apikey",
    "api_key",
    "secret",
    "process.env",
    "chain-of-thought",
    "energy felt low", // the rendered message body must never be copied into trace/events
  ]) {
    assert.equal(json.includes(banned), false, `result/events must not contain '${banned}'`);
  }
});

// --- import boundaries -----------------------------------------------------------------------------

test("orchestration imports only the PUBLIC surfaces of rendering/delivery/event-recording (+ shared-kernel)", () => {
  for (const f of productionFiles(moduleDir)) {
    for (const spec of importSpecs(readFileSync(f, "utf8"))) {
      if (!spec.startsWith(".")) continue; // only relative cross/within-module imports matter here
      // forbidden upstream/domain internals
      assert.equal(
        /(^|\/)(observation|reasoning|understanding|athlete)\//.test(spec),
        false,
        `orchestration must not import an upstream domain module: ${spec} in ${f}`,
      );
      // rendering/delivery/event-recording may be imported ONLY through their public index
      if (/(^|\/)(rendering|delivery|event-recording)\//.test(spec)) {
        assert.ok(
          /(rendering|delivery|event-recording)\/index\.ts$/.test(spec),
          `orchestration must import ${spec} only via its module index (public surface) in ${f}`,
        );
      }
    }
  }
});

test("orchestration imports no live transport / credential resolver / process-env adapter / concrete provider internals", () => {
  // tokens assembled from fragments so this test file is not itself a token site
  const liveTransport = "live-provider-http" + "-transport";
  const liveCallPolicy = "live-call" + "-policy";
  const credentialResolver = "credential" + "-resolver";
  const processEnvAdapter = "process-environment-credential" + "-source-adapter";
  const concreteProvider = "concrete-provider" + "-";
  for (const f of productionFiles(moduleDir)) {
    const src = readFileSync(f, "utf8");
    for (const forbidden of [liveTransport, liveCallPolicy, credentialResolver, processEnvAdapter, concreteProvider]) {
      assert.equal(src.includes(forbidden), false, `orchestration must not reference internal '${forbidden}' in ${f}`);
    }
  }
});

test("rendering / delivery / event-recording do not import application-orchestration", () => {
  for (const mod of ["rendering", "delivery", "event-recording"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      assert.equal(
        /from\s+["'][^"']*application-orchestration[^"']*["']/.test(readFileSync(f, "utf8")),
        false,
        `${mod} must not import application-orchestration: ${f}`,
      );
    }
  }
});

// --- structural / package --------------------------------------------------------------------------

test("no event-bus / queue / scheduler / retry / workflow / telemetry / evaluation / provider / DB module exists", () => {
  for (const forbidden of [
    join("modules", "workflow"), join("modules", "orchestrator"), join("modules", "event-bus"),
    join("modules", "events-bus"), join("modules", "queue"), join("modules", "scheduler"),
    join("modules", "retry"), join("modules", "telemetry"), join("modules", "evaluation"),
    join("modules", "provider"), join("modules", "llm"),
    "api", "infrastructure", "db", "database", "migrations",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("orchestration owns no domain model and no repository (application-only)", () => {
  assert.equal(existsSync(join(moduleDir, "domain")), false, "application-orchestration must own no domain/ model");
  for (const f of productionFiles(moduleDir)) {
    const src = readFileSync(f, "utf8");
    assert.equal(/Repository\s*{/.test(src) && /class\s+\w*Repository/.test(src), false, `orchestration must define no repository: ${f}`);
  }
});

test("no SDK / dependency change", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0, true, "no runtime dependency may be added");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "typescript"], "devDependencies must remain only typescript + @types/node");
});
