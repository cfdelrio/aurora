# Aurora — Operator Runtime Manual Private-Host Runbook

> **Status (2026-07-01).** Operational checklist — **docs-only**, realizing Spec 043I
> (`docs/specs/043I-non-public-compute-target-boundary.md`, `074a9c4`) Decision 1: **no new compute target is
> selected.** This runbook documents the one execution model that IS approved — an operator manually building
> and running the already-packaged operator-runtime container on a private host they already control — without
> selecting a cloud target, a registry, IaC, or any deployment automation. It is a companion to, not a
> replacement for, `docs/runbooks/operator-runtime-container-smoke.md` (Impl 043-G1), which this runbook
> assumes as background.

---

## 1. Purpose

This runbook exists so an operator can run a **real** operator-runtime session (or an assemble-only health
check) on a machine they already control — their own workstation, or a private server/VM they already have
access to — **without** that becoming a cloud deployment. It documents commands, not infrastructure.

---

## 2. What is approved

```text
manual container execution, triggered by a human operator, one shot, on a private host the operator already
controls (their own machine or an already-controlled private server/VM) — nothing more.
```

## 3. What is NOT approved

```text
cloud compute target (ECS/Fargate/Batch/App Runner/Lambda/etc.) · image registry / registry push ·
Terraform/CDK/Pulumi/Kubernetes / any IaC · deploy automation of any kind · scheduler/cron/systemd timer ·
long-running/always-on service · public endpoint · API/UI/server
```

None of these are introduced by this runbook. If any of them is ever needed, it requires its own
evidence-based spec (Spec 043I §4 item 20 lists what evidence is still missing).

---

## 4. Required host assumptions

- [ ] A Docker-compatible container runtime is installed on the host (`docker build` / `docker run` or an
      equivalent).
- [ ] The host has network reachability to whatever Postgres and S3-compatible endpoints the operator intends
      to use — this runbook assumes the operator already has (or has separately provisioned) those endpoints;
      it does not create, choose, or configure them.
- [ ] The host is **private** — reachable only by the operator (their own machine, or a server they access via
      SSH/console) — never a publicly routable service.
- [ ] Any host-level or platform-level credentials needed to reach the database/object-storage endpoints (for
      example, network-level auth, an S3-compatible access key, or a VPN) are **externally provided runtime/
      platform credentials** the operator supplies to `docker run` as env values (§6) — they are **not** Aurora
      source configuration, and this runbook documents no generic AWS-credential handling inside the image.

## 5. Required local files

- [ ] A checkout of this repository (for `Dockerfile` and, if building locally, the full source tree it copies).
- [ ] Optionally, a caller module file (see §8) — a local `.mjs` file the operator has written or obtained,
      never downloaded at run time.

---

## 6. Environment surface

The container reads **exactly** this allowlist (via `loadOperatorRuntimeConfigFromEnv`) — no other key, and no
new key is introduced by this runbook:

**Required**

- `AURORA_OPERATOR_DATABASE_URL`
- `AURORA_OPERATOR_ARTIFACT_BUCKET`

## 7. Optional environment keys

- `AURORA_OPERATOR_ARTIFACT_REGION`
- `AURORA_OPERATOR_ARTIFACT_ENDPOINT`
- `AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE`
- `AURORA_OPERATOR_SESSION_FACTORY_MODULE`

No other environment variable is recognized by the image. Generic AWS-credential variables
(`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) are never documented here as Aurora source config — if the
S3-compatible endpoint needs credentials, the operator supplies them the same way any other externally-provided
runtime credential reaches a container on a host they control (e.g. an env value passed at `docker run`, an
instance role, or a mounted credentials file the operator manages) — this is host/platform policy, outside
Aurora's `AURORA_OPERATOR_*` allowlist.

---

## 8. Caller-module path behavior

- [ ] `AURORA_OPERATOR_SESSION_FACTORY_MODULE`, when set, must be a path **inside the container** that resolves
      to a file the operator **mounted in** from the host (a bind mount) — never a package name, remote URL, or
      glob.
- [ ] The image bakes **no** default caller module (see `docs/runbooks/operator-runtime-container-smoke.md`
      §3) — the operator provides one only if they intentionally want to run a real session, by mounting it in
      at `docker run` time (§13).

## 9. Safe assemble-only mode (the default)

- [ ] Running the container with **no** `AURORA_OPERATOR_SESSION_FACTORY_MODULE` set assembles persistence
      (row-store/blob-store clients + repositories) and **exits without running any session** — status
      `assembled-no-session`. This is the safe default for a first run on any new host.

## 10. Missing-configuration behavior

- [ ] If a required key is absent, the container logs **only the missing key NAMES** (e.g. `operator runtime
      config invalid; missing required env keys: AURORA_OPERATOR_DATABASE_URL`) and exits non-zero. It never
      logs a value, a connection string, or any credential.

---

## 11. Build the image locally

```bash
docker build --file Dockerfile --tag aurora-operator-runtime:local .
```

Run this on whichever host will run the container — there is no registry step; the image is built where it is
used.

## 12. Run assemble-only smoke locally

```bash
docker run --rm \
  -e AURORA_OPERATOR_DATABASE_URL="postgres://user:password@host:5432/aurora" \
  -e AURORA_OPERATOR_ARTIFACT_BUCKET="aurora-artifacts" \
  aurora-operator-runtime:local
```

> The `postgres://user:password@host:5432/aurora` value above is a **placeholder** — substitute the operator's
> own real (or local/fake) connection string at run time. **Never** commit a real connection string, bucket
> name, or credential into this repository or any file tracked by it.

A successful run prints the assemble-only confirmation and exits `0`. A missing/invalid config prints only the
missing key names and exits non-zero (§10).

## 13. Run with a mounted caller module (only if intentionally provided)

```bash
docker run --rm \
  -e AURORA_OPERATOR_DATABASE_URL="postgres://user:password@host:5432/aurora" \
  -e AURORA_OPERATOR_ARTIFACT_BUCKET="aurora-artifacts" \
  -e AURORA_OPERATOR_SESSION_FACTORY_MODULE="/operator-input/caller-module.mjs" \
  -v "$PWD/operator-input:/operator-input:ro" \
  aurora-operator-runtime:local
```

The caller module directory is mounted **read-only** from the host; the operator authored or obtained
`caller-module.mjs` themselves — it is never downloaded, fetched, or resolved from a package name at run time.

---

## 14. What output is safe to inspect

- [ ] The assemble-only confirmation message, or the missing-key-names message (§10).
- [ ] If a session ran (§13): the printed **safe refs/status only** — run ref, envelope-record ref,
      decision-capture-link ref, and `sessionStatus` — never reflection text, raw provider output, or a secret.

## 15. What output must not be expected

- [ ] No reflection text, no raw `OfflineReflectionRuntimeOutcome`, no delivered message, no provider secret, no
      database connection string, no S3 credential — none of these are ever printed by the executable.

## 16. Stop / clean up

- [ ] The container is invoked with `docker run --rm` above, so it removes itself on exit — there is nothing
      further to stop or clean up. It is not started as a background/detached service (`-d`) by this runbook.

---

## 17. What this runbook does NOT prove

```text
not recommendation quality · not delivery · not AthleteDecision creation · not Garmin parsing ·
not live-provider quality · not public-service readiness · not cloud-platform readiness ·
not registry readiness · not IaC readiness · not secret-manager readiness
```

A successful manual run on a private host proves the image runs correctly on **that** host against **that**
operator's own endpoints. It proves nothing about recommendation quality, delivery, `AthleteDecision` behavior,
Garmin parsing, live-provider quality, or readiness for any cloud platform, registry, IaC, or secret-manager
integration — every one of those remains a separate, deferred, evidence-gated decision (Spec 043I §4 item 20).

## 18. Deferred boundaries

```text
registry / image distribution · cloud compute target (ECS/Fargate/Batch/App Runner/Lambda/etc.) · IaC ·
secret-manager integration · scheduler/worker model · API/UI/server · delivery channel ·
Garmin integration/parser · live-provider default · automatic AthleteDecision · production whole-core composer
```

---

## 19. Approved runtime model (summary)

```text
manual · operator-triggered · one-shot · private host only · no public endpoint · no scheduler · no worker
loop · no always-on service
```

## 20. Safety distinctions

```text
manual host run ≠ cloud deployment · manual container execution ≠ SaaS ·
container starts ≠ recommendation quality · container build ≠ runtime correctness ·
operator-triggered run ≠ scheduler · caller module ≠ remote plugin system ·
TrainingSessionRecord ≠ Evidence · raw artifact ≠ truth · OperatorSessionEnvelope ≠ delivered message ·
delivery withheld ≠ delivery failure · session run ≠ AthleteDecision ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```
