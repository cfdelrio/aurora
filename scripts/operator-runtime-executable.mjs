// Aurora — out-of-`src` operator runtime executable (Implementation 043-D5B). Plain ESM. NOT part of the
// default test suite, NOT part of `npm run check`, NOT an npm script, NO new dependency. Run it manually:
//
//   AURORA_OPERATOR_DATABASE_URL=postgresql://host/db \
//   AURORA_OPERATOR_ARTIFACT_BUCKET=aurora-operator-artifacts \
//   node scripts/operator-runtime-executable.mjs
//
// It lives OUTSIDE `src` on purpose: it is the ONE place that reads the real process environment and lets the
// in-`src` token-pinned factories construct the concrete pg Pool / S3 client. The src-scoped process-env seal
// (one approved core file) is untouched — those guards scan `src` only. It reads ONLY via
// loadOperatorRuntimeConfigFromEnv (the AURORA_OPERATOR_* allowlist), never ad-hoc env parsing, and resolves no
// secret manager.
//
// It ASSEMBLES persistence (repositories + artifact store) and STOPS. It runs NO session: there is no approved
// caller-supplied OfflineReflectionRuntimeCommand/deps input format yet, so it does not call runOperatorSession,
// invokeOperatorSession, or the underlying runtime, builds no whole-core command from raw/Garmin data, parses no
// artifact, delivers nothing, and creates no AthleteDecision.
//
//   out-of-`src` executable ≠ API ≠ SaaS ≠ deployment IaC · environment read ≠ secret manager ·
//   client construction ≠ live service verification · repository assembly ≠ session execution ·
//   storage wiring success ≠ understanding ≠ delivery ≠ AthleteDecision · Aurora advises, the athlete decides.

import { pathToFileURL } from "node:url";

import { loadOperatorRuntimeConfigFromEnv } from "../src/operator-runtime/deployment/operator-runtime-env-config.ts";
import { createOperatorRuntimePersistenceFromEnvironmentConfig } from "../src/operator-runtime/deployment/operator-runtime-assembly.ts";
import { runOperatorSessionFromCallerModule } from "../src/operator-runtime/deployment/operator-session-module-runner.ts";

// The ONE explicit local caller-module path key (043-F2). Absent ⇒ assemble-only. It is a local filesystem
// path — never a package name, remote URL, glob, or directory scan; there is no JSON/stdin/CLI command API.
const SESSION_FACTORY_MODULE_KEY = "AURORA_OPERATOR_SESSION_FACTORY_MODULE";

/**
 * Read the environment (defaults to the real process environment), validate it through the loader, and
 * assemble the storage-backed repositories + artifact store. Returns a safe status object; runs no session.
 */
export async function createOperatorRuntimeFromEnvironment(env = process.env) {
  const loaded = loadOperatorRuntimeConfigFromEnv(env);
  if (loaded.status !== "ok") {
    return { status: "config-invalid", missing: loaded.missing };
  }
  const bundle = createOperatorRuntimePersistenceFromEnvironmentConfig(loaded.config);
  return {
    status: "assembled",
    rowStore: bundle.rowStore,
    blobStore: bundle.blobStore,
    repositories: bundle.repositories,
    artifactStore: bundle.artifactStore,
  };
}

/**
 * Assemble persistence and, ONLY if an explicit local caller-module path is configured, dynamic-import that
 * one module and run a session through the in-`src` module runner (which validates the F1 contract and calls
 * runOperatorSession). Returns only safe refs/status. Absent module path ⇒ assemble-only, no session.
 */
export async function runOperatorRuntime(env = process.env) {
  const assembled = await createOperatorRuntimeFromEnvironment(env);
  if (assembled.status !== "assembled") return assembled; // config-invalid

  const modulePath = env[SESSION_FACTORY_MODULE_KEY];
  if (modulePath === undefined || modulePath.length === 0) {
    return { status: "assembled-no-session" };
  }
  // dynamic import of the ONE explicit local path — the runner (in-`src`) owns validation + runOperatorSession
  const callerModule = await import(pathToFileURL(modulePath).href);
  const result = await runOperatorSessionFromCallerModule(callerModule, assembled);
  return { status: "session", result };
}

// Manual entrypoint guard — only runs when executed directly, never on import.
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  const outcome = await runOperatorRuntime();
  if (outcome.status === "config-invalid") {
    // report only the MISSING KEY NAMES — never any value or secret
    console.error(`operator runtime config invalid; missing required env keys: ${outcome.missing.join(", ")}`);
    process.exitCode = 1;
  } else if (outcome.status === "assembled-no-session") {
    console.log(
      "operator runtime persistence clients/repositories assembled; session execution requires caller-supplied command/deps",
    );
  } else {
    // safe refs/status only — never reflection text, raw outcome, provider output, secrets, or delivery ids
    console.log(JSON.stringify(outcome.result));
  }
}
