# Aurora — Operator Runtime Container Smoke Runbook

> **Status (2026-07-01).** Operational checklist — **docs-only**, the human-facing companion to the `Dockerfile`
> and the static packaging guard tests (Implementation 043-G1), realizing Spec 043G (`c5f2cb1`). It describes how
> to build and smoke-test the operator runtime container image, and what that smoke test does and does not prove.

> **What this proves.** The container packages `scripts/operator-runtime-executable.mjs` and can start, read its
> injected environment, assemble persistence clients/repositories, and exit safely. **Deployability only.**
>
> **What this does NOT prove.** Recommendation quality · delivery · `AthleteDecision` behavior · Garmin
> parsing/integration · live-provider quality. None of those are exercised by this image or this runbook.
> `container runs ≠ recommendation quality` · `container runs ≠ delivery` · `container runs ≠ AthleteDecision` ·
> `container runs ≠ Garmin integration` · `container runs ≠ live-provider validation`.

---

## 1. Required environment keys

The image reads **exactly** this allowlist (via `loadOperatorRuntimeConfigFromEnv`) — no other key is read, and
none is baked into the image:

- `AURORA_OPERATOR_DATABASE_URL` — required.
- `AURORA_OPERATOR_ARTIFACT_BUCKET` — required.

## 2. Optional environment keys

- `AURORA_OPERATOR_ARTIFACT_REGION` — optional artifact-store region.
- `AURORA_OPERATOR_ARTIFACT_ENDPOINT` — optional S3-compatible endpoint override (for a local/fake endpoint; see
  §6).
- `AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE` — optional path-style flag for S3-compatible endpoints.
- `AURORA_OPERATOR_SESSION_FACTORY_MODULE` — optional; see §3. Absent by default.

No other environment variable is recognized. The runtime never reads a generic AWS credential variable
(`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) or any provider/Garmin/delivery credential — if the platform
needs to supply storage credentials, it injects them outside this allowlist (e.g. an instance role), not through
an Aurora-defined env key.

## 3. Caller-module path behavior

- [ ] `AURORA_OPERATOR_SESSION_FACTORY_MODULE`, when set, must be a **local filesystem path mounted into the
      container** (e.g. a bind mount or a path baked into a *derived*, caller-owned image) — **never** a package
      name, remote URL, or glob.
- [ ] The base image defined by this repository's `Dockerfile` bakes **no** caller module and ships **no**
      `fixtures/` directory. The reference caller module fixture
      (`fixtures/operator-runtime/reference-caller-module.mjs`) exists only for the repository's own test suite
      and is excluded from the build context by `.dockerignore` — it must never become the production default.
- [ ] Composing the caller factory (the `OfflineReflectionRuntimeDependencies` — manual intake, provider client,
      config, secret, renderer/adapter kinds, rendered-message repository) remains the **caller's** responsibility,
      exactly as in `docs/runbooks/operator-session-runbook.md`. The container changes nothing about who composes
      that dependency bundle.

## 4. Safe assemble-only mode (the default)

- [ ] Running the container with **no** `AURORA_OPERATOR_SESSION_FACTORY_MODULE` set assembles persistence
      (row-store/blob-store clients + repositories) and **exits without running any session** — status
      `assembled-no-session`. This is the safe default for a first deploy/health check.

## 5. Missing-configuration fail-safe behavior

- [ ] If a required key (`AURORA_OPERATOR_DATABASE_URL` and/or `AURORA_OPERATOR_ARTIFACT_BUCKET`) is absent, the
      container logs the **missing key NAMES only** (e.g. `missing required env keys:
      AURORA_OPERATOR_DATABASE_URL`) and exits non-zero. It never logs a value, a connection string, a secret, or
      any partial credential.

## 6. Running a local container smoke test

Build the image:

```
docker build -t aurora-operator-runtime .
```

Run it against a **fake/local** database and S3-compatible endpoint (e.g. a local Postgres container and a local
MinIO/S3-compatible container reachable from the same Docker network) — never a real production database or
bucket:

```
docker run --rm \
  -e AURORA_OPERATOR_DATABASE_URL="postgresql://user:pass@local-postgres:5432/db" \
  -e AURORA_OPERATOR_ARTIFACT_BUCKET="local-smoke-bucket" \
  -e AURORA_OPERATOR_ARTIFACT_ENDPOINT="http://local-minio:9000" \
  -e AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE="true" \
  aurora-operator-runtime
```

A successful smoke run assembles clients/repositories against the local fake endpoints and exits
`assembled-no-session` (or, with a mounted `AURORA_OPERATOR_SESSION_FACTORY_MODULE`, completes one session run
against those local fakes). This exercises **deployability**, not the production database/bucket.

To also smoke-test the caller-module path locally, mount the repository's reference fixture read-only and point
the env key at its in-container path:

```
docker run --rm \
  -v "$(pwd)/fixtures/operator-runtime:/callers:ro" \
  -e AURORA_OPERATOR_DATABASE_URL="postgresql://user:pass@local-postgres:5432/db" \
  -e AURORA_OPERATOR_ARTIFACT_BUCKET="local-smoke-bucket" \
  -e AURORA_OPERATOR_SESSION_FACTORY_MODULE="/callers/reference-caller-module.mjs" \
  aurora-operator-runtime
```

## 7. Default automated tests need no live DB/S3

- [ ] The repository's default test suite (`npm run check`) requires **no** live database and **no** live
      object-storage endpoint. The `docker build`/`docker run` steps above are a **separate, optional, manual**
      smoke check — never a required gate of `npm run check` or CI.

## 8. Caller modules are always local, never remote

- [ ] A caller module is **always** a path on the local filesystem the process can see (bind-mounted into the
      container or otherwise placed on disk) — **never** a remote URL, a package registry reference, or content
      fetched over the network at run time. The runtime performs exactly one dynamic `import()` of that one local
      path; it does not resolve a module name, scan a directory, or fetch anything.

## 9. Scope discipline

```text
container build/run ≠ CI/CD pipeline · container ≠ API/UI/server · container ≠ scheduler/cron/supervisor ·
container ≠ Terraform/CDK/IaC · caller module mounted ≠ caller module baked · assemble-only ≠ session execution ·
deployability ≠ recommendation quality · deployability ≠ delivery · deployability ≠ AthleteDecision ·
deployability ≠ Garmin integration · deployability ≠ live-provider validation ·
Aurora advises; the athlete decides
```

## 10. Forbidden behaviors

```text
baking a caller module into the image as a default · baking secrets/credentials into the image ·
exposing a port · starting an API/UI/server · running a scheduler/cron/supervisor loop ·
reading an unapproved environment key · reading a generic AWS credential variable in-source ·
requiring a live DB/S3 for the default automated test suite · treating a successful container smoke run as
recommendation-quality, delivery, AthleteDecision, Garmin-integration, or live-provider-quality evidence
```
