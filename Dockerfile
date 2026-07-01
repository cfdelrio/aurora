# Aurora — operator runtime container image (Implementation 043-G1 / Spec 043G). Minimal, non-public.
#
# What this proves: the operator runtime EXECUTABLE (scripts/operator-runtime-executable.mjs) is DEPLOYABLE as a
# container — it assembles injected-config persistence clients/repositories and exits safely. Deployability is
# the only claim; see docs/runbooks/operator-runtime-container-smoke.md for the full scope of what it does and
# does not demonstrate.
#
# No exposed network port, no server/API/UI start, no periodic/background job runner, no baked caller module,
# no baked secrets, no Terraform/CDK/IaC. Runs the repository's TypeScript SOURCE DIRECTLY via Node's built-in
# type stripping — no tsx/ts-node/esbuild/transpiler, no new package script, no tsconfig change (verified
# runnable this way before this file was written; see the 043-G1 report).
#
#   this image ≠ API ≠ SaaS ≠ deployment IaC · container health ≠ session execution ·
#   assemble-only default ≠ session execution · Aurora advises, the athlete decides.

# pinned to a Node 22 patch >= 22.18, where native TypeScript type-stripping runs unflagged by default
# (verified in this repository's own sandbox at v22.22.2 before this file was written; see the 043-G1 report)
FROM node:22.22-slim

WORKDIR /app

# dependency layer first for build-cache efficiency
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# only the files the operator runtime executable needs at runtime
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

# the caller module is NEVER baked into the image — it is supplied at run time via a mounted local path and
# AURORA_OPERATOR_SESSION_FACTORY_MODULE (see the runbook); this image ships no fixtures/ directory.

# approved env surface only (values are supplied at `docker run` / by the platform, never baked here):
#   AURORA_OPERATOR_DATABASE_URL
#   AURORA_OPERATOR_ARTIFACT_BUCKET
#   AURORA_OPERATOR_ARTIFACT_REGION
#   AURORA_OPERATOR_ARTIFACT_ENDPOINT
#   AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE
#   AURORA_OPERATOR_SESSION_FACTORY_MODULE

CMD ["node", "scripts/operator-runtime-executable.mjs"]
