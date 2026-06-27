// Implementation 010 — structural guards: persistence is ports + in-memory only. No infrastructure
// layer, no persistence/repository top-level module, no DB/ORM/schema/migration/event-bus/cache.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const modulesDir = join(here, ".."); // __tests__ -> modules
const srcDir = join(modulesDir, ".."); // -> src

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

test("no infrastructure / persistence / repositories top-level layer exists", () => {
  for (const forbidden of ["infrastructure", join("modules", "persistence"), join("modules", "repositories")]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("no DB/ORM/schema/migration/event-bus/cache token leaks into production code", () => {
  const forbidden = /\b(sqlite|postgres|postgresql|mysql|mongodb|mongoose|typeorm|prisma|knex|sequelize|drizzle|redis|migration|eventbus|event-bus)\b/i;
  const production = collectTsFiles(modulesDir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("__tests__") && !f.includes("/tests/"),
  );
  for (const f of production) {
    const src = readFileSync(f, "utf8");
    assert.equal(forbidden.test(src), false, `forbidden persistence-tech token in ${f}`);
  }
});

test("repository ports + in-memory adapters import only their own module and shared-kernel", () => {
  const repoFiles = collectTsFiles(modulesDir).filter(
    (f) => /(-repository|in-memory-).*\.ts$/.test(f) && !f.endsWith(".test.ts"),
  );
  assert.ok(repoFiles.length >= 8, "expected the repository ports + adapters to exist");
  for (const f of repoFiles) {
    // owning module is the path segment after /modules/
    const rel = f.slice(modulesDir.length + 1);
    const owningModule = rel.split("/")[0];
    const src = readFileSync(f, "utf8");
    const re = /from\s+["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const spec = m[1] ?? "";
      if (!spec.startsWith(".")) continue;
      const reachesOtherModule = /\.\.\/\.\.\/[a-z-]+\//.test(spec) && !spec.includes("shared-kernel");
      assert.equal(
        reachesOtherModule,
        false,
        `repository file ${owningModule}/... must not import another module: ${spec}`,
      );
    }
  }
});
