# HuntPulse AI

HuntPulse AI — бесплатное приложение для реального поиска вакансий. Пользователь открывает приложение и сразу попадает на поиск: без обязательной AI-настройки, токенов и автоматических откликов.

Поиск объединяет публичные job boards, ограниченные по частоте feeds и прямые career feeds работодателей. Каждая нормализованная вакансия хранит безопасную ссылку для просмотра; для «Работа России» приложение может использовать собственный viewer, сохраняя ссылку на оригинальный источник.

## Быстрый старт

Требования: Node.js 20+ и npm 10+.

```bash
npm ci
npm run dev
```

Production/self-hosted:

```bash
npm ci
npm run build
npm start
```

Полная проверка:

```bash
npm run check:full
```

Проверочный контур включает structure guard, syntax-check Node/Vercel API, контрактные `node:test`, `tsc --noEmit`, Vite production build, production server smoke и browser E2E в Google Chrome.

## Реальные источники

- Работа России;
- HH.ru;
- Arbeitnow;
- Remote OK;
- We Work Remotely;
- Jobicy;
- Remotive;
- Greenhouse;
- Lever;
- Ashby;
- SmartRecruiters;
- Recruitee;
- Workable.

ATS registry содержит 34 публичных employer boards и расширяется данными в `server/atsRegistry.mjs`, а не новым React-кодом.

## Vercel

Для Vite deployment серверные маршруты находятся в корневом `api/`. Локальный `server/index.mjs` остаётся для self-hosted режима.

Основные endpoints:

- `/api/health`;
- `/api/status`;
- `/api/jobs/hh`;
- `/api/jobs/trudvsem`;
- `/api/jobs/trudvsem-view`;
- `/api/jobs/remoteok`;
- `/api/jobs/weworkremotely`;
- `/api/jobs/remotive`;
- `/api/jobs/jobicy`;
- `/api/jobs/ats`;
- `/api/telegram/auth` — server-side validation of Telegram Mini App `initData`.

### Source-level snapshot cache

Remote OK, We Work Remotely, Jobicy, Remotive и ATS на Vercel запрашиваются как query-независимые snapshots. Поисковый текст не входит в URL snapshot-запроса; фильтрация выполняется во frontend после получения нормализованных данных.

Это важно для источников с временными ограничениями: разные запросы пользователя (`QA`, `Java`, `Designer`) не создают отдельные upstream refresh-окна.

CDN TTL:

- Remote OK / We Work Remotely — 10 минут;
- ATS — 30 минут;
- Jobicy — 1 час;
- Remotive — 6 часов.

HH и «Работа России» остаются query-dependent API, потому что upstream поддерживает серверный поиск по параметрам. Для них используются отдельные короткие cache windows.

Функции возвращают браузеру `Cache-Control: no-store`, а Vercel CDN управляется через `Vercel-CDN-Cache-Control` с `s-maxage`, `stale-while-revalidate` и `stale-if-error`.

## Прямые ссылки и просмотр вакансий

`SearchResult.url` — обязательная безопасная `http/https` ссылка. Карточка показывает кнопку **«Открыть вакансию»**.

Для большинства источников это оригинальное объявление. Для «Работа России», если публичная карточка портала нестабильна, используется `/api/jobs/trudvsem-view`, который загружает данные из официального Open Data API; ссылка на оригинал сохраняется внутри viewer.

## Production audit status

### Product definition — JOBOS

JOBOS (AI Career Operating System) is not just a vacancy aggregator. The product flow is:

**Search settings → real vacancies → normalization/validation → user filters → separate Career Profile matching → Application Studio → AI assistance → user review → original vacancy → application history.**

The ordinary **Search** mode answers: “What real vacancies exist for my query and filters?”  
The separate **Подбор** mode answers: “Which of these vacancies match my Career Profile?”  
**Search results must never be silently re-ranked by the user's Career Profile.**

### Current development stage

**Milestone: Production hardening / Search correctness.**

Current work is focused on proving that existing sources, normalization, filtering, deduplication, caching, AI Workspace persistence, Application Studio confirmation flow and Telegram security work with real production-shaped data.

A feature is considered complete only when its implementation, tests, CI and documented behavior agree. A green unit test alone does not prove that a real upstream source works.

### Mandatory development sequence

1. **Search correctness** — verify every current upstream with real responses; malformed payloads; required fields; safe URLs; salary amount/range/currency/period; work mode; employment; HH pagination; cross-source deduplication; source-failure isolation; original links.
2. **Search UX** — source status/capabilities; publication-date filter; sorting; pagination/load-more; vacancy details; stale-cache and partial-source visibility.
3. **Career Intelligence** — Career Profile; separate matching mode; explainable compatibility facts; gaps/requirements; no unconfirmed AI facts.
4. **Application OS** — Application Studio; material versions; notes; status history; application date; tracker/dashboard.
5. **AI Workspace** — vacancy-linked materials; imported external-AI answers; structured re-analysis only through a selected AI provider; no mandatory paid provider.
6. **Persistence and identity** — secure Telegram identity/session; server-side user data; cross-device persistence.
7. **Monitoring** — saved searches; new-vacancy detection; optional notifications.
8. **Telegram Mini App** — complete authenticated user flow and shared web/Mini App data.
9. **Only after the above:** additional sources and any permitted official application automation.

### What is allowed

- Real public APIs/feeds and permitted public web previews.
- Server-side BFF/proxy where required by source policy.
- Query-independent source snapshots where upstream limits require them.
- Contract fixtures captured from real upstream responses.
- Local browser persistence as an interim MVP mechanism.
- User-provided AI API keys.
- Manual application submission after explicit user confirmation.
- New sources only when their public API/feed/usage model is verified and documented.

### What is forbidden

- Fake vacancy data presented as real.
- Tests claiming an upstream works without verifying the upstream.
- Silent profile-based re-ranking of ordinary Search.
- AI-invented education, certificates, employment history or other unconfirmed facts.
- Automatic application submission by default.
- CAPTCHA bypass, hidden scraping, scraping-as-a-service or bypassing access controls.
- Sending user secrets/tokens to the browser when they must remain server-side.
- Treating Telegram `initDataUnsafe` as trusted identity.
- Marking a backlog feature as implemented when it is only a placeholder.
- Adding a mandatory paid API for basic job search.
- Large unrelated refactors while fixing a production bug.
- Committing generated/broken source with literal escaped newlines such as `\
` where a real line break is required.

### Verification rule for every change

Use the smallest atomic change possible:

**inspect → reproduce → identify root cause → patch → targeted test → `npm run check:full` → inspect CI → document status.**

Never declare a fix complete from a patch alone. If CI fails, continue from the actual failure output rather than guessing.

### File/documentation rule

`README.md` is the high-level product and engineering contract.  
`docs/TECHNICAL_ROADMAP.md` is the executable development plan and current-state ledger.

Every meaningful product/architecture change must update the roadmap when it changes:
- current milestone;
- implemented/not implemented status;
- allowed/forbidden behavior;
- architecture constraints;
- future work or implementation order.

Every future agent must read both files before making architectural changes.

## Надёжность

- независимые adapters + `Promise.allSettled`;
- capability-check `/api/health`;
- HH вызывается через server-side BFF, а не напрямую из браузера;
- runtime-проверка обязательных полей и URL;
- graceful degradation при частичном отказе источников;
- source-level CDN snapshots для Vercel и memory cache для self-hosted BFF;
- security headers на Node BFF и Vercel;
- `/api/status` не опрашивает внешние API и не расходует их лимиты;
- Telegram webhook требует `TELEGRAM_WEBHOOK_SECRET`, а Mini App identity не принимается из `initDataUnsafe` без серверной HMAC-проверки;
- лимит 800 строк проверяется для кодовых директорий и build/test-конфигов.

## Отложенные функции

Незавершённые продуктовые функции не считаются удалёнными. Они документированы в [`docs/TECHNICAL_ROADMAP.md`](docs/TECHNICAL_ROADMAP.md) и до реализации должны показывать честный статус **«Будет реализовано позже»**, а не имитировать успешную работу.

В backlog сохранены:

- AI-помощник для подготовки черновика отклика;
- HH OAuth / выбор резюме;
- job application tracker;
- сохранённые поиски и мониторинг;
- безопасный официальный flow отправки отклика после отдельного проектирования.

## Архитектура

```text
api/
  _shared.mjs          Vercel Functions orchestration + CDN snapshot policy
  health.mjs
  status.mjs
  jobs/*.mjs
server/
  index.mjs            self-hosted HTTP/static/cache orchestration
  httpPolicy.mjs
  hh.mjs
  atsRegistry.mjs
  atsFeeds.mjs
  publicFeeds.mjs
  trudvsem.mjs
  trudvsemView.mjs
src/app/features/search/
  SearchPanel.tsx
  searchService.ts
  sourceRequestPolicy.js
  searchContract.js
  searchStorage.ts
```

Frontend использует один контракт `/api/*` и не зависит от конкретного hosting runtime.

## Бесплатность и безопасность

- нет платных обязательных API;
- нет обязательных API keys для поиска;
- нет стороннего CORS-proxy;
- нет CAPTCHA bypass;
- нет scraping-as-a-service;
- поиск не принимает пользовательские пароли или HH-токены.

## Git

При конфликте сохраняется текущий новый вариант. Старые конфликтующие блоки не возвращаются; `accept both` не используется.
