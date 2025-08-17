# Testing Strategy [DRAFT]
- **Unit (Vitest)**: calculations, factor resolution, validators, RBAC guards.
- **Integration**: REST handlers with Prisma test DB (transactional tests).
- **E2E (Playwright)**: signup → org → data wizard → PDF download (EN/FR flows).
- **i18n**: snapshot tests to ensure no missing keys in EN/FR; ICU formatting cases.
- **Accessibility (axe-core)**: CI checks for core pages; keyboard navigation tests.
- **Security**: Zod schemas fuzzed with malicious payloads; header/assertions (CSP, no sniff, frameguard).
- **Performance**: simple k6 (optional) for /api/reports generate path.
- **OpenAPI**: spectral lint + contract tests against handlers.
- **Coverage**: ≥80% on calculation/critical flows.

## 5. Continuous Integration

The **docs-ci.yml** workflow validates our approval pack integrity:

- **Trigger**: Any changes to `docs/` directory on main branch or PRs
- **Jobs**:
  - `openapi-lint`: uses Redocly CLI to lint `docs/openapi.yaml`. **Pass** = no errors.
  - `i18n-parity`: runs `docs/scripts/check-i18n-parity.sh docs/locales-samples`. **Pass** = EN/FR key parity across all sample namespaces.
- **Gate**: Both jobs must be green before the Approval Pack is considered **Ready for Phase 2**.

## Docs CI (OpenAPI & i18n parity) — Direct Commands

- **Scope**: Runs on pull requests that modify `docs/**` or `.github/**`.
- **Jobs**:
  - `OpenAPI Lint`: installs Redocly CLI and runs `redocly lint docs/openapi.yaml`. **Pass** = 0 errors.
  - `i18n Key Parity`: installs `jq` and runs `bash docs/scripts/check-i18n-parity.sh docs/locales-samples`. **Pass** = EN/FR parity across all sample namespaces.
- **Note**: CI uses **direct commands**, not `npm run` scripts, to avoid coupling with application code.
- **Gate**: Both jobs must be green before the approval pack is considered **Ready for Phase 2**.
