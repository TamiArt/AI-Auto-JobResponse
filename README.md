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
- `/api/jobs/ats`.

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

## Надёжность

- независимые adapters + `Promise.allSettled`;
- capability-check `/api/health`;
- HH вызывается через server-side BFF, а не напрямую из браузера;
- runtime-проверка обязательных полей и URL;
- graceful degradation при частичном отказе источников;
- source-level CDN snapshots для Vercel и memory cache для self-hosted BFF;
- security headers на Node BFF и Vercel;
- `/api/status` не опрашивает внешние API и не расходует их лимиты;
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
