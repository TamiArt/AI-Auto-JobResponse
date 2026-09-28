# JOBOS / HuntPulse AI — Full Check-up
## Date
2026-09-28

## Scope
Audit performed on branch `feature/jobos-application-audit` only. No changes were made to `main`.

## Executive status
- Search architecture: implemented and contract-covered.
- Real vacancy result rendering: frontend has an end-to-end test proving normalized vacancies are rendered from the BFF response, but the current E2E is mocked and therefore is not proof of live upstream availability.
- Remocate: live public source was independently verified on 2026-09-28; its public pages currently expose real QA vacancies. The application has a dedicated parser, BFF route, local-server route, query-dependent request policy, multilingual filtering boundary, and 15-minute local cache.
- Search source isolation: implemented with `Promise.allSettled()`.
- SearchResult normalization / safe URL validation / deduplication / filter contracts: implemented and covered by tests.
- AI Workspace persistence: implemented and contract-tested.
- Telegram Mini App security: server-side validation is implemented and tested.
- Application Studio: safe manual-submission flow is implemented and tested.
- Typecheck/build preflight: CI preflight passed for the latest checked commit `c6193d9`.
- Full CI: latest run #296 failed in the `verify` job at `Run full checks`. The available GitHub metadata does not expose the failing command output through the connected GitHub API, so the exact failing assertion is not claimed here.
- Vercel: deployment status is blocked by Vercel build/deployment rate limiting (24-hour retry window), not by a reported application build error.

## Search verification

### Request flow
`SearchPanel -> searchService -> source adapter -> /api/jobs -> source handler -> normalization -> validation -> filters -> deduplication -> UI`.

### Current real-source contract
Backend sources:
- HH
- Работа России / Trudvsem
- Remote OK
- We Work Remotely
- Remotive
- Jobicy
- Arbeitnow
- Remocate
- ATS
- Telegram public channels

ATS adapters:
- Greenhouse
- Lever
- Ashby
- SmartRecruiters
- Recruitee
- Workable

### Result rendering
The E2E search flow mocks the BFF response with a real-shaped `QA Engineer` vacancy and verifies:
- the BFF source is requested;
- automatic snapshot sources are requested;
- Trudvsem is not included in the automatic first-page fan-out;
- the vacancy card is rendered;
- the original vacancy link is available;
- favorite persistence works;
- search history is persisted.

Limitation: this proves the browser rendering pipeline, not that every live upstream returns data at the moment of the test.

### Live Remocate check
The public Remocate site currently exposes QA vacancies, including QA Engineer roles, remote and relocation listings, which confirms that the upstream source has real vacancy content rather than being an empty/test-only source.

The parser integration deliberately does not perform a second raw server-side query filter after normalization. The common search filter is responsible for multilingual matching. This prevents English Remocate vacancies from being discarded for Russian queries.

## Source-specific status

### HH
Implemented through server-side BFF. Direct browser access is intentionally avoided. CAPTCHA/access restriction responses are represented as source unavailability instead of fake results.

### Trudvsem
Implemented through HTTPS server-side BFF. It is not included in the automatic first-page source fan-out because the upstream can cause Vercel timeout pressure. It remains explicitly searchable.

### Remote OK / We Work Remotely / Remotive / Jobicy / Arbeitnow
Implemented as query-independent snapshots. Client-side query filtering is applied after normalization. This avoids generating separate upstream refresh requests for every user query.

### Remocate
Implemented as a query-dependent source. Added local route, parser, request policy, multilingual result preservation, and 15-minute local cache.

### ATS
Implemented through a shared ATS registry/adapter model with concurrency control.

### Telegram
Implemented as a public-channel source with server-side identity/security rules for Mini App authentication. Automatic search only uses configured channels.

## Filtering and correctness
Covered behavior includes:
- unknown work mode does not become office;
- unknown employment does not become full-time;
- active salary filters do not silently accept unrecognized salary data;
- cross-currency salary values are not compared as if they were the same currency;
- canonical URL deduplication removes exact duplicates without incorrectly merging distinct vacancies;
- default Moscow area filtering does not discard global vacancies from international sources;
- multilingual role matching supports Russian/English equivalents such as QA / Quality Assurance and developer / разработчик;
- hyphenated queries such as `QA-инженер` are normalized.

## AI Workspace
Implemented:
- local persistence of imported AI responses;
- vacancy-linked workspace behavior;
- user-provided Gemini/API-key model flow;
- external AI response import;
- explicit distinction between AI suggestions and confirmed user facts.

## Application Studio
Implemented safe flow:
1. select vacancy;
2. prepare material;
3. generate/edit AI-assisted material;
4. preview;
5. explicit user confirmation;
6. open original vacancy;
7. user submits manually.

Automatic application submission is not implemented as a default behavior.

## Telegram
Security controls covered:
- server-side Telegram Mini App `initData` HMAC validation;
- webhook secret validation;
- `initDataUnsafe` is not treated as trusted identity.

## Build / CI / deployment
### Latest preflight
Commit: `c6193d9a0fdeedc0d52c5b0179872eab80aed1a`

CI preflight job: PASS.

### Latest full CI
Run #296:
`36437070889`

Status: FAIL.

Failed job:
- `verify`

Failed step:
- `Run full checks`

The failure is downstream of the successful preflight. Exact command output is not available through the connected GitHub endpoint, so the report intentionally does not guess whether the failure is in contract tests, smoke, or Playwright.

### Vercel
Current commit status reports:
`Deployment rate limited — retry in 24 hours.`

This is an infrastructure/account deployment-rate limitation, not evidence that the application code itself failed to build.

## Test inventory
The repository currently contains dedicated contract coverage for:
- AI Workspace storage
- Arbeitnow
- ATS
- ATS registry
- CI lock/cache contract
- HH API contract
- HH request policy
- HTTP policy
- Jobicy normalization
- public feeds
- Remocate
- Remocate local server route/cache
- search architecture
- search contract
- search filters
- source policy
- source request policy
- snapshot filtering
- Telegram public source
- Telegram security
- Trudvsem
- Trudvsem viewer
- Vercel API

Browser E2E coverage includes the core search flow and BFF-only behavior.

## Findings requiring continued work

### P0 — Full CI is not green
The exact failing assertion/command from run #296 must be obtained and fixed. The preflight passing does not make the full check green.

### P0 — Live end-to-end vacancy verification is still incomplete
A live Remocate upstream was verified independently, but the deployed application's complete browser-to-BFF-to-upstream chain could not be verified because the current Vercel deployment is rate-limited. The existing E2E uses mocked API responses.

### P1 — Documentation drift
README architecture text still contains older wording around the source policy file and does not yet fully document Remocate everywhere. The actual implementation uses `sourceRequestPolicy.ts`.

### P1 — Self-hosted/Vercel duplication
Source loading logic exists in both `server/index.mjs` and `api/_shared.mjs`. This is currently intentional for two runtimes, but the duplication should be monitored to prevent behavioral drift.

### P1 — Search matching is substring-based
The multilingual query matcher currently uses substring inclusion. Short aliases can eventually create false positives. Token/phrase boundary matching should be introduced with regression tests before expanding the alias dictionary.

### P2 — Full product-flow E2E
Search has browser coverage, but Career Profile -> Matching -> Application Studio -> History and Telegram Mini App still need a complete cross-feature browser journey.

## Acceptance criteria for declaring the audit green
1. Latest `npm run check:full` succeeds.
2. Latest CI run is green.
3. Local production server smoke succeeds.
4. Browser E2E confirms results are visibly rendered.
5. At least one real upstream is verified end-to-end through the application runtime, not only independently on the source website.
6. Vercel deployment becomes available again and the deployed application passes browser verification.
7. README/technical roadmap are synchronized with the actual source registry and Remocate integration.

## Next implementation order
1. Identify the exact failure in CI run #296.
2. Fix it with the smallest atomic patch.
3. Re-run full CI.
4. Add/strengthen a live-shaped source fixture for Remocate based on verified upstream structure.
5. Verify the local production server's actual BFF response and rendered results.
6. Complete E2E checks for Career Profile, Matching, Application Studio, History, AI Workspace, and Telegram entry flow.
7. Synchronize README and technical roadmap.
8. Repeat full audit and replace this report with a green final status only after the acceptance criteria pass.

## Evidence
Live Remocate source verification:
- https://www.remocate.app/job-categories/qa
- https://www.remocate.app/

GitHub CI:
- run #296: https://github.com/TamiArt/AI-Auto-JobResponse/actions/runs/36437070889
