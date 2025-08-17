# Fix Pack Checklist Template

Use this checklist for reviewing Fix Pack PRs that unblock builds and fix infrastructure issues.

## 🔧 Build Infrastructure

- [ ] **Build Process**: `npm run build` completes successfully
- [ ] **ESLint Configuration**: Build bypass implemented (`eslint.ignoreDuringBuilds: true`)
- [ ] **CI Enforcement**: ESLint still enforced in CI/pre-commit (no quality regression)
- [ ] **TypeScript**: All type errors resolved (`npm run typecheck` passes)

## 🛡️ Static Asset Protection

- [ ] **Middleware Guard**: `isPublicAsset()` function implemented
- [ ] **Favicon**: `/favicon.ico` returns 200 OK (bypasses middleware)
- [ ] **Manifest**: `/manifest.webmanifest` returns 200 OK (bypasses middleware)
- [ ] **Static Files**: `/_next/*`, `/images/*`, `/fonts/*` bypass middleware
- [ ] **App Routes**: Protected routes still require middleware processing

## 🔗 Routing & Compatibility

- [ ] **Next.js 15**: Dynamic route params use `Promise<{}>` format
- [ ] **Component Props**: All prop type mismatches resolved
- [ ] **Model References**: Prisma model names updated (if applicable)
- [ ] **Middleware Config**: `config.matcher` excludes static assets properly

## 📊 Observability & Monitoring

- [ ] **OpenTelemetry**: No module resolution errors
- [ ] **Instrumentation**: `instrumentation.ts` exists (no-op or configured)
- [ ] **Error Tracking**: Sentry/monitoring still functional
- [ ] **Analytics**: PostHog/analytics still functional

## 🧪 Quality Guardrails

- [ ] **E2E Tests**: Smoke tests pass
- [ ] **Accessibility**: A11y tests pass
- [ ] **Performance**: Performance budgets maintained
- [ ] **Test Infrastructure**: All test tooling intact

## 📋 Verification Commands

```bash
# Build verification
npm run build

# Static asset verification
scripts/verify-fix-pack.sh

# E2E verification
npm run e2e

# Lint verification (CI equivalent)
npm run lint -- --max-warnings=0
```

## 🚨 Risk Assessment

- [ ] **Low Risk**: Changes are minimal and targeted
- [ ] **Reversible**: All changes can be easily reverted
- [ ] **No Breaking Changes**: Existing functionality preserved
- [ ] **Quality Maintained**: Code standards not compromised

## ✅ Acceptance Criteria

- [ ] Build process unblocked
- [ ] Static assets serve correctly
- [ ] No OpenTelemetry errors
- [ ] E2E guardrails functional
- [ ] CI quality gates preserved

## 📝 Follow-up Actions

- [ ] Monitor build performance post-merge
- [ ] Schedule ESLint rule tightening (if needed)
- [ ] Plan OpenTelemetry real implementation (if applicable)
- [ ] Update team documentation

---

**Reviewer Note**: This Fix Pack focuses on infrastructure stability. All changes are designed to be conservative, reversible, and maintain existing quality standards while unblocking critical build processes.
