// Implementation 011 — negative capability + boundary guards. These make the dangerous shapes
// structurally impossible: no bus, no publish/subscribe/dispatch, no handler registry, no infra,
// no DB/event-sourcing, and a dependency-neutral module (imports only shared-kernel).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // .../event-recording/tests
const eventRecordingDir = join(here, ".."); // .../event-recording
const modulesDir = join(eventRecordingDir, ".."); // .../modules
const srcDir = join(modulesDir, ".."); // .../src

const DOMAIN_MODULES = ["observation", "reasoning", "understanding", "decision-support", "athlete"];

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
  return collectTsFiles(dir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("__tests__") && !f.includes("/tests/"),
  );
}

function importSpecs(src: string): string[] {
  const specs: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) specs.push(m[1] ?? "");
  return specs;
}

test("event-recording imports only shared-kernel + its own module (no domain module)", () => {
  for (const f of productionFiles(eventRecordingDir)) {
    for (const spec of importSpecs(readFileSync(f, "utf8"))) {
      if (!spec.startsWith(".")) continue; // only relative imports cross module lines here
      const reachesDomainModule = DOMAIN_MODULES.some((m) => new RegExp(`(^|/)${m}/`).test(spec));
      assert.equal(reachesDomainModule, false, `event-recording must not import a domain module: ${spec} in ${f}`);
    }
  }
});

test("no domain module imports event-recording in this slice", () => {
  for (const mod of DOMAIN_MODULES) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      assert.equal(
        /["'][^"']*event-recording[^"']*["']/.test(src),
        false,
        `${mod} must not import event-recording: ${f}`,
      );
    }
  }
});

test("no bus / queue / broker / event-sourcing / infrastructure layer exists", () => {
  for (const forbidden of [
    "infrastructure",
    "event-bus",
    join("modules", "event-bus"),
    join("modules", "event-sourcing"),
    join("modules", "message-broker"),
    join("modules", "queue"),
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("event-recording production code contains no bus/dispatch/transport tokens", () => {
  const forbidden = /\b(publish|subscribe|dispatch|emit|enqueue|broker|messagequeue|pubsub)\b/i;
  for (const f of productionFiles(eventRecordingDir)) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden transport token in ${f}`);
  }
});

test("event-recording production code chooses no DB/ORM/schema/serialization/event-sourcing tech", () => {
  const forbidden =
    /\b(sqlite|postgres|postgresql|mysql|mongodb|mongoose|typeorm|prisma|knex|sequelize|drizzle|redis|migration|eventbus|event-bus|event-sourcing|eventsourcing|protobuf|avro)\b/i;
  for (const f of productionFiles(eventRecordingDir)) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden persistence/serialization token in ${f}`);
  }
});

test("the module surface exists (domain + application)", () => {
  assert.ok(existsSync(join(eventRecordingDir, "domain", "index.ts")));
  assert.ok(existsSync(join(eventRecordingDir, "application", "index.ts")));
  assert.ok(existsSync(join(eventRecordingDir, "index.ts")));
});
