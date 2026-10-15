# Source usage policy — JOBOS

Last reviewed: 2026-10-13

This document records the current evidence for using external vacancy sources in JOBOS. It is an engineering decision register, not legal advice or a claim that a provider has granted JOBOS permission.

## Status meanings

- **Eligible with conditions** — published rules appear to allow the documented use, provided the integration follows attribution, link, cache, freshness, and rate-limit requirements.
- **Permission / access confirmation required** — an API or feed exists, but credentials, approval, geographic coverage, or the right to operate a third-party vacancy aggregator is not established.
- **Do not ingest pending clarification** — public documentation includes a material restriction or evidence is insufficient to justify ingestion.
- **External search link only** — JOBOS opens the provider's own search page; no vacancy data is imported.

## Automated feeds and APIs

| Source | Current evidence and constraints | JOBOS decision |
|---|---|---|
| Remote OK | Public JSON/RSS feeds. Attribute Remote OK and link directly to the original listing; do not use its logo without written permission. | Eligible with conditions; keep attribution and original link. |
| Jobicy | Public Jobs API. Its published rules allow use in apps/websites/research/AI products subject to canonical links, attribution, and polling no more frequently than hourly. | Eligible with conditions; enforce at least a 1-hour refresh interval. |
| Remotive | Public API has delayed listings and attribution/link-back requirements. Terms prohibit submitting its jobs to third-party websites; a private paid API is separately offered. | Do not ingest into a third-party public job-search service unless Remotive confirms this exact use in writing. |
| We Work Remotely | Public RSS exists, but its API terms prohibit building a job advertising or job-search service that competes with or replaces WWR. | Do not ingest into the unified JOBOS search without written permission. |
| Arbeitnow | Public API exists and asks for a link back, but the general site license and API-specific permissions are not fully clear for a public/commercial aggregator. | Permission clarification required before relying on it for public/commercial aggregation. |
| Работа России (trudvsem.ru) | Official Open Data API documentation describes JSON results and pagination. The API page alone does not conclusively establish every republication/licensing condition. | Existing adapter may remain; verify data-use/license terms and keep source links. |
| HeadHunter (HH.ru) | Official API requires app registration/credentials and has restrictions around access, data use, freshness, and redistribution. Current production access may return 403/access restrictions; cause and permission are not established. | Keep explicit source errors. Do not represent inaccessible results as an empty successful search. Confirm access and intended aggregator use with HH. |
| SuperJob | Official API provides vacancy search; app registration and server-side `X-Api-App-Id` key are required. Key possession alone does not prove permission for every aggregation scenario. | Optional source only after credentials and applicable terms are confirmed. Keep key server-side as `SUPERJOB_APP_ID`. |
| Habr Career | API requires app activation and OAuth 2.0; its API rules limit use to the service provided to users of the developer's application and constrain how materials are handled. | Do not ingest until activation and JOBOS-specific permission are confirmed. |
| Avito Работа | Developer API exists, but the permitted scopes, price, and right to search/redisplay the general vacancy catalogue in JOBOS have not been established. | External search link only until written/official confirmation. |
| Adzuna | Search API requires application credentials and imposes request quotas and use/attribution terms. Russian-catalogue coverage and ongoing JOBOS permission are unverified. | Do not enable until RU coverage, licensing, and post-trial terms are confirmed. |
| Jooble | Public company notice says commercial operations in Russia and Belarus were discontinued and warns that jooble.ru is not its domain. | Do not add as a Russian-market source unless the provider officially confirms resumed service. |
| Recruitee | Public Careers Site API currently exposes published company jobs; its documentation announces an authorization change from 2027-02-10. | Existing ATS integration must be monitored for the announced authentication migration; re-verify before that date. |
| Greenhouse / Lever / Ashby / SmartRecruiters / Workable | Public company-specific career endpoints can expose vacancies, but each employer's endpoint and provider terms must be respected; a public endpoint is not a blanket licence for bulk collection. | Use only documented company career endpoints, retain canonical job links, avoid bulk crawling, and verify provider-specific restrictions. |
| Telegram public channel previews | Public web previews may be parsed only as a limited fallback; public visibility is not a guarantee of stable access or permission to republish. | Isolate parser, preserve channel/message links, respect access limits, and keep failures source-local. No auth bypass or hidden scraping. |

## External search links — not data integrations

The following are user-initiated links to provider search pages. They must not be described as automatically searched, imported, or aggregated by JOBOS unless a separate authorized integration is implemented:

- Avito Работа, Работа.ру, Зарплата.ру, GeekJob, Finder.work, Getmatch
- LinkedIn, Indeed, Glassdoor, Wellfound, USAJOBS, EURES, Djinni
- Remote.co, Behance, Dribbble, ArtStation
- Upwork, Freelancer, Kwork
- Telegram public-channel search links

LinkedIn's user terms prohibit unauthorized scraping/copying. A manual search link does not grant permission to ingest its content. Apply the same distinction to every external link: navigation is not integration.

## Required engineering behavior

1. A source's registry entry or presence in the UI is not proof that an adapter works or that its data use is permitted.
2. Keep source status distinct from result count: configured, not configured, access restricted, rate limited, timed out, malformed response, upstream failure, and successful empty response must not be conflated.
3. A source requiring a secret must read it only on the server. Never put secrets in source control, client bundles, or user-facing diagnostics.
4. Preserve source attribution and the original vacancy URL where the source permits it. Reject malformed/non-vacancy URLs instead of substituting an employer homepage.
5. Do not bypass CAPTCHA, authentication, rate limits, paywalls, or access controls. Do not use scraping-as-a-service to circumvent provider restrictions.
6. Cache and refresh only within the source's published limits; never infer a permission from a technically accessible endpoint.
7. When terms are ambiguous, disable automated ingestion and ask the provider for confirmation. Record the date, contact/reference, and exact approved use if permission is granted.
8. Keep the external-search links available where useful, but label them as external search rather than integrated results.

## Official documentation and terms

- Remote OK: https://remoteok.com/remote-jobs/api
- Jobicy: https://jobicy.com/jobs-rss-feed
- Remotive API: https://remotive.com/remote-jobs/api
- We Work Remotely API terms: https://weworkremotely.com/api-terms-and-guidelines
- Arbeitnow terms: https://www.arbeitnow.com/terms
- Работа России API: https://trudvsem.ru/opendata/api
- HH API conditions: https://hh.ru/article/15116
- SuperJob API: https://api.superjob.ru/
- Habr Career API: https://career.habr.com/info/api
- Habr Career API rules: https://career.habr.com/info/legal/api_rules
- Avito developer portal: https://developers.avito.ru/
- Avito Public API terms: https://www.avito.ru/legal/pro_tools/public-api
- Adzuna API terms: https://developer.adzuna.com/docs/terms_of_service
- Jooble API: https://jooble.org/api/about
- Jooble Russia/Belarus notice: https://jooble.org/insights/jooble-brand-misused-in-russia-and-belarus/
- Recruitee Careers Site API: https://recruitee.com/
- LinkedIn User Agreement: https://www.linkedin.com/legal/user-agreement

## Review boundary

This register summarizes publicly available documentation checked on the date above. It does not claim that providers were contacted, that written permissions were obtained, or that all production endpoints were tested live. Re-check official terms before enabling a new adapter or materially changing how data is stored, displayed, or redistributed.
