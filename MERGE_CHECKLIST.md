# Ready-to-Merge Checklist

## Reviewer Quickstart (2-min)

```bash
# fresh build (lint bypass is expected at build time)
npm run build

# run the one-shot verifier
chmod +x scripts/verify-fix-pack.sh
./scripts/verify-fix-pack.sh

# (optional) e2e guardrails
npm run e2e
```

**Expect:**
- Build succeeds
- `/favicon.ico` and `/manifest.webmanifest` return 200
- App routes behave normally (middleware doesn't touch assets)

## Ready-to-Merge Checklist

- [ ] `PR_DESCRIPTION.md` present & accurate
- [ ] `FIX_PACK_CHECKLIST.md` included
- [ ] `verify-fix-pack.sh` runs clean locally
- [ ] `middleware.ts` has `isPublicAsset()` and strict `config.matcher`
- [ ] `instrumentation.ts` is no-op (no OTEL errors)
- [ ] Next.js 15 dynamic route params updated (where applicable)

## Post-Merge (fast wins)

### 1. Re-tighten lint in CI
Keep `ignoreDuringBuilds: true` for local builds, but ensure CI fails on lint:
```bash
npm run lint -- --max-warnings=0
```
(Already in your notes, just make sure the workflow enforces it.)

### 2. Add a tiny E2E smoke for assets
Assert `/favicon.ico` and `/manifest.webmanifest` are 200.
Guards against regressions in middleware matching.

### 3. Track an issue: OTEL real setup
Replace no-op `instrumentation.ts` with real config when we're ready.
Keep the no-op until keys/pipeline exist.

### 4. Gradual lint hardening
Convert a few high-noise rules from `warn` → `error` behind the scenes (app code only; tests can stay relaxed).

## Next PR Suggestions (small, surgical)

### PR: "A11y Meta Sweep"
Ensure every route has `generateMetadata` (title/og), add a Playwright check that `<title>` is non-empty.

### PR: "Static Asset E2E"
One spec that hits `/favicon.ico` + `/manifest.webmanifest` and asserts 200 (desktop+mobile).

### PR: "Lint Gates in CI"
Workflow step that runs `npm run lint -- --max-warnings=0` and comments on PR with a short summary.
