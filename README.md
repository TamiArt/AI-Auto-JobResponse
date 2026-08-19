# HuntPulse AI

HuntPulse AI — бесплатное приложение для реального поиска вакансий. Пользователь открывает приложение и сразу попадает на поиск: без AI-настройки, токенов и автоматических откликов.

Поиск объединяет публичные job boards, ограниченные по частоте feeds и прямые career feeds работодателей. Каждая нормализованная вакансия хранит оригинальную публичную ссылку, которую можно открыть непосредственно из карточки кнопкой **«Открыть вакансию»**.

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

Полная проверка без браузерного E2E:

```bash
npm run check
```

Полная CI-проверка с browser E2E:

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

Для обычного Vite deployment серверные маршруты находятся в корневом `api/` и автоматически становятся Vercel Functions. Локальный `server/index.mjs` остаётся для self-hosted режима.

Vercel endpoints:

- `/api/health`;
- `/api/status`;
- `/api/jobs/trudvsem`;
- `/api/jobs/remoteok`;
- `/api/jobs/weworkremotely`;
- `/api/jobs/remotive`;
- `/api/jobs/jobicy`;
- `/api/jobs/ats`.

Ограниченные и remote feeds кэшируются на Vercel CDN, а не в памяти serverless instance:

- Работа России — 5 минут;
- Remote OK / We Work Remotely — 10 минут;
- ATS — 30 минут;
- Jobicy — 1 час;
- Remotive — 6 часов.

Функции возвращают браузеру `Cache-Control: no-store`, а Vercel CDN управляется отдельным `Vercel-CDN-Cache-Control` с `s-maxage`, `stale-while-revalidate` и `stale-if-error`.

## Прямые ссылки

`SearchResult.url` — обязательная безопасная `http/https` ссылка. Карточка вакансии показывает кнопку **«Открыть вакансию»** и открывает оригинальное объявление в новой вкладке с `noopener noreferrer`.

## Надёжность

- независимые adapters + `Promise.allSettled`;
- capability-check `/api/health`: статический preview без BFF не пытается вызывать `/api/jobs/*`;
- runtime-проверка обязательных полей и URL;
- graceful degradation при частичном отказе источников;
- CDN cache для Vercel и memory cache для self-hosted BFF;
- security headers на Node BFF и Vercel;
- `/api/status` не опрашивает внешние API и не расходует их лимиты;
- лимит 800 строк проверяется для `src/`, `server/`, `api/`, `tests/`, `e2e/`, `scripts/` и build/test-конфигов.

## Архитектура

```text
api/
  _shared.mjs          Vercel Functions orchestration + CDN policy
  health.mjs
  status.mjs
  jobs/*.mjs
server/
  index.mjs            self-hosted HTTP/static/cache orchestration
  httpPolicy.mjs       общая HTTP security policy
  atsRegistry.mjs
  atsFeeds.mjs
  publicFeeds.mjs
  trudvsem.mjs
src/app/features/search/
  SearchPanel.tsx
  searchService.ts
  searchContract.js
  searchStorage.ts
```

Frontend использует один контракт `/api/*` и не зависит от конкретного hosting runtime.

## Бесплатность и безопасность

- нет платных API;
- нет обязательных API keys для поиска;
- нет стороннего CORS-proxy;
- нет CAPTCHA bypass;
- нет scraping-as-a-service;
- поиск не принимает пользовательские пароли или HH-токены.

## Git

При конфликте сохраняется текущий новый вариант. Старые конфликтующие блоки не возвращаются; `accept both` не используется.
