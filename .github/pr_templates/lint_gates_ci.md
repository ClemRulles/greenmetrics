# ci(lint): Lint Gates in CI — Enforce Code Quality Without Blocking Local Dev

## Summary

Adds strict ESLint enforcement in CI while keeping local development unblocked. PRs will receive automated lint feedback and must pass linting to merge.

## Why

- Local builds shouldn't be blocked by lint issues (developer productivity)
- CI must enforce code quality standards (code health)
- PRs need immediate feedback on style violations
- Gradual improvement without breaking existing workflow

## What Changed

- **CI Lint Job**: New workflow step running `npm run lint -- --max-warnings=0`
- **PR Comments**: Automated lint summary posted to PRs
- **Local Dev Preserved**: `eslint.ignoreDuringBuilds: true` remains for local builds
- **Quality Gates**: Merge blocked if lint fails in CI

## Files Touched

- `.github/workflows/ci.yml` – Added lint job
- `.github/workflows/pr-lint.yml` – PR-specific lint feedback (optional)
- `package.json` – Added `lint:ci` script if needed

## Workflow Structure

```yaml
# Example CI job
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run lint -- --max-warnings=0
      name: ESLint (strict)
```

## Verification

```bash
# Test locally (should pass CI standards)
npm run lint -- --max-warnings=0

# Verify build still works locally
npm run build

# Check CI workflow syntax
gh workflow view ci
```

## Expected Results

- PRs with lint violations are blocked from merging
- Developers get clear feedback on style issues
- Local development remains fast and unblocked
- Code quality improves incrementally

## Acceptance Criteria

- [ ] CI runs `npm run lint -- --max-warnings=0`
- [ ] PR merges blocked if lint fails
- [ ] Local builds still bypass lint (`npm run build` works)
- [ ] Clear error messages in CI for lint failures
- [ ] No performance regression in CI pipeline

## Gradual Improvement Plan

1. **Week 1**: Add CI lint job (informational only)
2. **Week 2**: Make lint job required for merge
3. **Week 3**: Convert high-priority warnings to errors
4. **Ongoing**: Address lint backlog incrementally

## Configuration Options

**Strict Mode (recommended):**
```bash
npm run lint -- --max-warnings=0
```

**Gradual Mode (transition):**
```bash
npm run lint -- --max-warnings=10  # Reduce weekly
```

## Follow-up Actions

- Monitor lint failure rate in first week
- Create issues for top lint violations to tackle
- Consider lint-staged for pre-commit hooks
- Add lint performance monitoring

## Risk Mitigation

- Local development remains unaffected
- Can revert by removing workflow job
- Gradual rollout reduces team friction
- Clear documentation for developers
