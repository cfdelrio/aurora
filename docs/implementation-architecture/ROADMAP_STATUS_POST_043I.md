# Aurora — Roadmap Status Checkpoint (post Specification 043I / Docs 043-I1)

> **Status (2026-07-01).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It closes the **operator-runtime deployability arc** (Specs 043 → 043I, Impls 043-F1/F2/F3/G1/H1, Docs
> 043-I1) and states, per lane, exactly what evidence is required before continuing. Validation at authorship:
> `tsc --noEmit` clean; `node --test` **995/995**. Prior checkpoints:
> `...POST_035/037/038/039/040/041/042`.

---

## 1. The arc just closed

```text
Spec 043 (cloud operator runtime + persistence boundary)
  → 043A/043A-R/043B/043C (persistence home + plan) → Impl C1/C2/C3 (persistence skeleton/artifact store/run service)
  → Spec 043D (dependency approval plan) → Impl D1 (zero-dep contracts)
  → Spec 043E (async re-decision) → Impl E1 (async migration)
  → Impl D2-R (pg adapter) → Impl D3 (S3 adapter) → Impl D4 (config assembly) → Impl D4A (repository bridge)
  → Impl D5A (env-config loader) → Impl D5B (out-of-src executable)
  → Spec 043F (caller-provided module/factory input contract) → Tech Spec 043F-A (implementation plan)
  → Impl 043-F1 (safe request envelope + caller factory contract, 2074248)
  → Impl 043-F2 (out-of-src caller module loader, fe895e6)
  → Impl 043-F3 (reference caller module fixture + real end-to-end proof, 0907200)
  → Spec 043G (deployment packaging boundary, c5f2cb1) → Impl 043-G1 (Dockerfile + container smoke runbook, f612e4e)
  → Spec 043H (deployment automation / IaC boundary — CI build-only, 5d9796a) → Impl 043-H1 (Docker build CI guard, e7a2509)
  → Spec 043I (non-public compute target boundary — no target selected, 074a9c4) → Docs 043-I1 (manual private-host runbook, d372512)
```

`[FACT]` This is the **entire evidence-gated arc** the "run Aurora in the cloud with real Garmin/manual
training sessions" trigger opened (Spec 042 §7 persistence + provider/deployment lanes). Every step was gated
by explicit prior approval; every dependency was approved one at a time and token-pinned; every packaging/
automation increment was the smallest one the available evidence supported. **995/995**; `tsc --noEmit` clean;
AC20 untouched throughout.

---

## 2. Current architectural state

### 2.1 What is now proven
1. **A training session can be represented operationally without becoming Evidence.** `TrainingSessionRecord`
   is a reference + provenance record (athlete ref, source kind, artifact handle, occurred-at) — never treated
   as `Evidence`/`Signal`/`ObservationSet` at rest (Spec 043 §4.6; Impl C1/D4A).
2. **Raw artifacts can be stored as provenance without becoming truth.** `TrainingArtifactObjectStore` persists
   Garmin/manual bytes opaquely, keyed by provenance — never parsed, never interpreted as truth (Impl C2/D3).
3. **A caller-supplied `RenderingRequest` can be admitted without proving recommendation quality.** The
   reference caller module fixture threads its own renderable through `admitExternalRenderable`/
   `offlineReflectionRuntime` — admission proves shape, never truth or recommendation quality (Impl 043-F3).
4. **A caller module can provide function-bearing command/deps.** The 043F caller-factory contract
   (`OperatorSessionCallerFactory<T>`) carries real functions (manual intake, provider client) that no JSON/
   CLI/stdin format could represent — validated structurally, never trusted blindly (Impl 043-F1).
5. **`runOperatorSession` can produce a safe `OperatorSessionEnvelope`.** The full chain — caller module →
   validate → `runOperatorSession` → `invokeOperatorSession` → runtime — persists **only** the redacted
   envelope; the raw `OfflineReflectionRuntimeOutcome` is structurally unreachable (Impl 043-F2/F3).
6. **Delivery can remain withheld** end-to-end through the real chain, proven (not merely asserted) by Impl
   043-F3's end-to-end test (`deliveryWithheld: true`, `rawRetained: false` on the persisted record).
7. **`DecisionCaptureLink` can exist without creating `AthleteDecision`.** The envelope carries only an
   invitation/ref; no `AthleteDecision` is ever created by the runtime (unchanged since Spec 043 §6.8; reproven
   at 043-F3).
8. **The operator runtime can be packaged in a container.** The Dockerfile runs the repository's TypeScript
   source directly under Node's native type-stripping (confirmed unflagged at ≥22.18) — zero new build tooling,
   zero transpiler, zero package script (Impl 043-G1).
9. **CI can build the image without pushing or deploying.** The GitHub Actions workflow builds the Dockerfile
   on every push/PR with `contents: read` only — no registry, no cloud auth, no secrets (Impl 043-H1).
10. **Manual private-host execution can be documented without selecting a cloud target.** Docs 043-I1 shows an
    operator can build/run the image on any host they already control, using only the existing env allowlist
    and mounted caller-module path — no registry, no IaC, no platform decision required (Docs 043-I1).

### 2.2 What is deployable
- A **container image** that runs the operator-runtime executable, source-direct, on stock Node 22.
- CI **build validation** of that image on every push/PR (build-only; no push/deploy).
- A **documented manual execution path** on any private host the operator already controls.

### 2.3 What is intentionally NOT selected
```text
no registry · no image-distribution policy · no cloud compute target · no IaC (Terraform/CDK/Pulumi/Kubernetes) ·
no GitHub Actions deploy workflow · no cloud auth/OIDC · no secret-manager integration · no scheduler ·
no worker loop · no API/UI/server · no delivery channel · no Garmin parser/integration · no live-provider default ·
no automatic AthleteDecision · no production whole-core composer
```
Each of these was evaluated at least once across Specs 043G/043H/043I and explicitly deferred for lack of
evidence — not overlooked.

### 2.4 What remains manual/operator-mediated
- **Training-session intake** — manual/exported artifact upload, never automatic Garmin API pull.
- **Caller-module composition** — the caller (a human operator, or a script they author) assembles
  `command`/`deps`, including the `RenderingRequest`; Aurora validates and runs, never composes.
- **Execution** — a human triggers `node scripts/operator-runtime-executable.mjs` (bare or containerized), once,
  on a host they control; there is no scheduler, no daemon, no standing service.
- **Envelope review** — the operator reviews the persisted `OperatorSessionEnvelope` manually; delivery stays
  withheld; any athlete decision is later, separate, and athlete-declared/reported only.

### 2.5 What must NOT be inferred from the current state
- That a container image existing means Aurora is **deployed** anywhere. It is not.
- That CI build success means the image is **verified against a real, network-reachable** Postgres/S3. It is
  not — CI never sets `AURORA_OPERATOR_DATABASE_URL`/`AURORA_OPERATOR_ARTIFACT_BUCKET` by design.
- That a documented manual-host runbook means a **specific host has been provisioned**. None has.
- That any of the above imply a **product surface** (API/UI/CLI-as-product), a **registry**, an **IaC** choice,
  a **secret-manager** integration, a **scheduler**, **delivery**, **Garmin integration**, or an **AC20
  amendment** is imminent, implied, or half-decided. None is.

---

## 3. Evidence gates for future work

| Lane | Evidence required before reopening |
| --- | --- |
| **Registry / image distribution** | Image naming convention, retention policy, credentials owner, target registry, and a push-trigger decision (manual vs. CI-triggered). |
| **Cloud compute target** | A concrete platform choice, private-networking needs (VPC/subnet/security-group reachability to Postgres/S3), a DB/S3 access path, a caller-module delivery path compatible with that platform, and an operator-trigger model for that platform. |
| **IaC** | A selected compute target (above), an env/secrets policy, a networking policy, and a rollback/deletion policy. |
| **Scheduler** | A product/ops reason for recurrence, and safe recurrence-condition semantics (what triggers a run, what prevents duplicate/overlapping runs). |
| **Secret-manager integration** | A provider selection and a source-of-truth decision (which config lives in the manager vs. platform env). |
| **Delivery** | A selected, athlete-consented delivery boundary decision and a recipient/consent model. |
| **Garmin integration** | A separate artifact-parser/intake boundary spec, with its own provenance/truth rules (a parsed field is still not Evidence until the domain says so). |
| **API/UI** | A product runtime surface decision (Spec 031/032's still-unmet "runtime fit" criterion — an identified remote/sessionful product user). |
| **Automatic `AthleteDecision`** | Remains **forbidden** unless the athlete-declared/reported decision-capture boundary (Impl 037-A) is itself revisited and changed — not merely "convenient." |
| **Production whole-core composition** | Remains **forbidden by AC20** unless explicitly amended in its own, separate architecture-decision spec (per 034R's standing conclusion). |

---

## 4. Allowed next missions — only if evidence appears

```text
Spec 043J   — Registry & Image Distribution Boundary        (needs: registry-lane evidence, §3)
Spec 043K   — Private Compute Target Selection               (needs: compute-lane evidence, §3)
Tech Spec 043K-A — ECS RunTask / Batch / Private Host Implementation Plan  (needs: 043K selection)
Spec 044    — Product Runtime Surface Reopen                 (needs: API/UI-lane evidence, §3)
Spec [TBD]  — Garmin Intake Boundary                         (needs: Garmin-lane evidence, §3)
Spec [TBD]  — Delivery Channel Boundary                      (needs: delivery-lane evidence, §3)
```

None of these is recommended **now** — each requires its own future evidence, documented in its own spec, per
the gates in §3. Listing them here is not a queue; it is a map of *where* re-entry is legible if and when
evidence appears.

---

## 5. Forbidden next missions without evidence

```text
proceeding directly to Terraform/CDK/Pulumi/Kubernetes · GitHub Actions deploy workflow · docker push ·
registry auth · cloud credentials · public API/server · scheduler · worker loop · Garmin parser · delivery ·
automatic AthleteDecision · production whole-core composer
```

Each requires a **separate spec** with its own evidence (§3) — never a direct implementation jump from this
checkpoint or from any future "seems like the next logical step" instinct.

---

## 6. Central distinctions (carried through the whole arc)

```text
deployable ≠ deployed · container build success ≠ runtime correctness ·
manual private-host run ≠ cloud target selection · CI image build ≠ registry release ·
registry release ≠ production rollout · compute target ≠ product API ·
operator execution ≠ AthleteDecision · OperatorSessionEnvelope ≠ delivered message ·
delivery withheld ≠ delivery failure · TrainingSessionRecord ≠ Evidence · raw artifact ≠ truth ·
caller-supplied RenderingRequest ≠ recommendation-quality proof ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 7. Recommendation

`[RECOMMENDATION] Pause until real evidence appears for registry, compute target, product surface, Garmin
intake, or delivery.`

- **Current confirmed state.** The operator-runtime persistence + execution + packaging + build-CI + manual-
  execution chain is **complete and proven** end-to-end with deterministic fakes and real token-pinned adapters
  (pg/S3); no cloud target, registry, IaC, secret-manager, scheduler, API/UI, delivery, Garmin integration, or
  AC20 amendment exists or is implied. **995/995**; `tsc --noEmit` clean; AC20 intact.
- **Why pause, not another build.** Every remaining lane (§3) is gated on evidence that does not exist in this
  repository today. Manufacturing a registry, a compute target, or IaC now — the way every prior step in this
  arc explicitly declined to do — would repeat exactly the premature-commitment mistake Specs 031/043H/043I
  each independently rejected.
- **What is NOT lost by pausing.** The domain kernel, the safe invocation chain, the persistence layer, the
  packaged container, the CI build guard, and the manual-host runbook all keep working exactly as documented.
  Nothing here decays while idle.
- **What would restart each lane.** See §3 (evidence gates) and §4 (the map of specs each lane would open).
- **What must remain protected during the pause.** AC20 intact (no production whole-core composer, no
  `reflection-composition` revival, no top-level module sprawl); no-default-live-call; delivery-withheld;
  athlete sole decision owner; the caller-composes/Aurora-validates split (never inverted); no registry/IaC/
  secret-manager/scheduler/API/UI/Garmin/delivery without their own future evidence-based spec.

---

## 8. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **995/995**. AC20 unchanged; no production whole-core composer; no
`reflection-composition` module; delivery withheld; no `AthleteDecision` auto-created; decision capture explicit
athlete-declared/reported only; `runOperatorSession`/`invokeOperatorSession` return only the safe envelope; the
Dockerfile, CI workflow, and manual-host runbook are unchanged by this checkpoint; no package/dependency/
runtime/API/UI/CLI/worker/deployment/CI/SDK change. This checkpoint is docs-only.
