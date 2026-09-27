# HuntPulse AI — Technical Roadmap

Этот файл является техническим backlog проекта. Отложенные или частично реализованные функции не считаются удалёнными из продукта: до реализации они должны оставаться явно помеченными как `TODO: будет реализовано позже`, без ложного рабочего поведения.

## Текущий milestone: Production hardening

### P0
- [x] Source-level snapshot policy для Remote OK / We Work Remotely / Jobicy / Remotive: пользовательский `q` не входит в Vercel cache key, фильтрация выполняется после получения snapshot.
- [x] Jobicy: один source snapshot с TTL 1 час вместо отдельного cache key для каждого поискового текста.
- [x] Remotive: один source snapshot с TTL 6 часов вместо отдельного cache key для каждого поискового текста.
- [x] ATS: query-independent snapshot; поисковый текст фильтруется после получения нормализованных вакансий.
- [x] `lastUpdated` / `nextRefresh` описывают snapshot источника, а не отдельный search query.
- [x] CI выполняется для PR в `main` и для push в `main`.
- [ ] Включить branch protection для `main` и сделать CI required check (операционная настройка GitHub).

### P1
- [x] Старый browser-side search service больше не делает прямые запросы к HH/RemoteOK/Arbeitnow; он сохранён как deprecated-заглушка `Будет реализовано позже`.
- [x] Vercel и self-hosted runtime используют единый `ATS_CONCURRENCY` из registry.
- [x] README синхронизирован с `/api/jobs/hh`, `/api/jobs/trudvsem-view` и snapshot cache policy.
- [ ] Оптимизировать PWA icon и статические assets.
- [ ] Добавить расширенный deployment smoke для публичного Vercel URL без расходования лимитированных upstream.

## Telegram job channels

Telegram является отдельным источником вакансий и должен объединяться с общим `SearchResult`, а не существовать отдельным поиском.

### Публичные каналы без авторизации — ближайшая реализация
- [ ] Пользователь добавляет публичные `@channel` или `https://t.me/channel` в настройках поиска.
- [ ] Никаких ботов, прав администратора или изменений канала не требуется.
- [ ] BFF получает публичный web-preview `https://t.me/s/<channel>` и создаёт query-independent snapshot конкретного канала.
- [ ] Snapshot кэшируется по каналу; поисковый `q` применяется после получения нормализованных сообщений.
- [ ] Из публикации извлекаются текст, дата, channel/message id и прямая ссылка `https://t.me/<channel>/<message_id>`.
- [ ] Сообщения проходят общий runtime-контракт и dedup вместе с job boards/ATS.
- [ ] Недоступный/закрытый/изменившийся канал не ломает остальные источники.
- [ ] Web-preview ingestion считается fallback-интеграцией: парсер должен быть изолирован и покрыт fixture/contract tests, потому что HTML Telegram может измениться.

### Авторизованный Telegram — будет реализовано позже
Обычный Telegram Login Widget не даёт доступ к истории каналов пользователя. Для чтения подключённых пользователю публичных и приватных каналов нужен полноценный user-session через MTProto/TDLib.

Целевая схема исследования:
`HuntPulse -> Cloudflare Worker -> Durable Object / D1 -> Telegram MTProto`

- [ ] Исследовать чистую JS/TS MTProto-библиотеку, совместимую с Cloudflare Workers runtime.
- [ ] Durable Object рассматривать для долгоживущего состояния/координации пользовательской Telegram session.
- [ ] D1/KV использовать только после security review для необходимых persistent metadata/session данных; секреты должны храниться зашифрованно.
- [ ] Авторизация: телефон/QR, Telegram confirmation и 2FA при необходимости.
- [ ] После авторизации показывать список доступных пользователю каналов и позволять выбирать источники вакансий.
- [ ] Для приватного канала читать данные только если авторизованный пользователь уже имеет к нему доступ.
- [ ] Историю получать через официальный MTProto/TDLib flow; новые сообщения — через updates.
- [ ] Проверить ограничения Cloudflare Workers/Durable Objects на TCP/WebSocket/длительные соединения конкретной MTProto-библиотеки до выбора реализации.
- [ ] TDLib напрямую внутри обычного Worker не считать утверждённой архитектурой: ему нужны нативная среда/persistent database; сначала прототип.
- [ ] До успешного прототипа UI для авторизованного режима показывает `Будет реализовано позже`, а не имитирует подключение.

### Что не используем
- Telegram Bot API для чтения пользовательских job-каналов: он требует участия бота и не решает задачу произвольных подключённых пользователю каналов.
- CAPTCHA bypass, закрытые Telegram endpoints и платный scraping-as-a-service.

## Отложенные продуктовые функции — НЕ УДАЛЯТЬ

Следующие функции являются backlog, а не мусором. Если UI/модель уже содержит их элементы, до реализации показывать нейтральную заглушку «Будет реализовано позже» и не запрашивать секреты пользователя без необходимости.

### AI / Career Intelligence
- [x] Разделить «Поиск вакансий» и отдельный режим «Подбор вакансий» по Career Profile.
- [x] Зафиксировать AI inference workflow: факт пользователя → AI-предположение → пользователь подтверждает/изменяет/удаляет → только подтверждённое попадает в Career Profile.
- [x] Запретить AI придумывать образование и сертификаты.
- [x] Реализовать отдельный режим «Подбор вакансий»: анализ Career Profile против выбранного набора вакансий без изменения обычной поисковой выдачи.
- [x] Реализовать универсальный «Открыть в AI» с провайдерами Gemini / ChatGPT / Qwen как внешними чатами.
- [x] Реализовать Gemini API через собственный API key пользователя как основной API-режим; не считать ChatGPT Free автоматически бесплатным API.
- [x] AI Workspace: принять ответ внешнего AI обратно в JOBOS, определить/выбрать тип результата, привязать его к вакансии и сохранить в Application Studio.
- [ ] Структурированный повторный AI-анализ импортированного ответа — только через выбранного AI provider.
- [x] Preview перед любым откликом и обязательное явное подтверждение пользователя перед отправкой.
- [ ] Не вводить обязательный платный AI API и не разворачивать локальную LLM.

### HH account integration
- [ ] HH OAuth/token integration.
- [ ] Resume selection / resumeId.
- [ ] Отправка отклика через разрешённый официальный flow, если это допускается API и условиями HH.
- [ ] До реализации не просить HH token; показывать «Будет реализовано позже».

### Job application workflow
- [ ] Статусы: интересно / откликнулся / интервью / оффер / отказ / архив.\n- [x] Базовый Application Studio tracker: сохранение подготовленных материалов и статуса открытия вакансии в localStorage.
- [ ] Заметки к вакансии.
- [ ] Дата отклика и история изменения статуса.
- [ ] Pipeline/dashboard.
- [ ] Daily limit — применять только если появится реальная функция отправки/автоматизации; до этого это legacy placeholder.

### Saved search / monitoring
- [ ] Сохранённые поиски.
- [ ] Новые вакансии с момента последнего просмотра.
- [ ] Локальные уведомления/опциональный monitoring после отдельного решения по инфраструктуре.

## Search correctness

- [ ] Ввести source capabilities: `supportsRegion`, `supportsSalary`, `supportsRemote`, `supportsPagination`, `searchMode`, currency semantics.
- [ ] Нормализовать location/remote semantics.
- [ ] Нормализовать salary: amount/range/currency/period вместо фильтрации форматированной строки.
- [ ] Не применять RUB threshold к источнику, если зарплата в другой валюте без корректной конвертации.
- [ ] Улучшить query normalization: RU/EN aliases, ё/е, punctuation, common role synonyms.
- [ ] Улучшить dedup между агрегаторами и employer ATS: canonical URL + company/title/location fingerprint.
- [ ] Определить единый порядок сортировки и обработку вакансий без даты.
- [ ] Сделать source errors/capabilities понятными пользователю.

## Search UX

- [ ] Фильтр источников в результирующей выдаче.
- [x] Remote / hybrid / onsite filter.
- [x] Employment type filter.
- [x] Salary range filter with currency-aware normalization (from/to; unknown salary excluded when salary filter is active).
- [ ] Фильтр по дате публикации.
- [ ] Сортировка по дате/релевантности/зарплате.
- [ ] Пагинация/подгрузка для источников, которые её поддерживают.
- [ ] Карточка/панель деталей вакансии без потери оригинальной ссылки.
- [ ] Понятное отображение stale cache и частично недоступных источников.

## Источники

Текущие источники сначала стабилизируются; массовое добавление новых источников отложено до завершения correctness/UX.

Кандидаты, которые уже присутствовали в продуктовой модели или интерфейсе, но не должны притворяться рабочими до отдельной реализации:
- Habr Career — будет реализовано позже / требуется повторная проверка публичного API и условий использования.
- Djinni — будет реализовано позже / требуется повторная проверка доступного публичного интерфейса.
- Remote.co — будет реализовано позже / требуется проверка разрешённого feed/API.
- Telegram public channels — fallback web-preview ingestion описан выше; авторизованный MTProto режим будет реализован позже.
- LinkedIn, Indeed, Glassdoor, Wellfound, Behance, Dribbble, ArtStation и другие external sources — пока только внешние направления/ссылки; автоматический ingestion не заявлять без поддерживаемого публичного API/feed.

## Архитектурные правила

1. Frontend не обращается напрямую к upstream, требующему server-side proxy/cache/policy.
2. Один нормализованный `SearchResult` contract для всех источников.
3. Частичный отказ одного источника не ломает общую выдачу.
4. Никакого CAPTCHA bypass, scraping-as-a-service или скрытого обхода ограничений сайтов.
5. Не добавлять платный обязательный API для базового поиска.
6. Не удалять незавершённую продуктовую функцию только потому, что она временно отключена: сохранить контракт/roadmap или безопасную заглушку.
7. Заглушка не должна имитировать успех: текст — «Будет реализовано позже» / `not_implemented`, действие отключено.
8. Каждый production PR проходит `npm run check:full`.
9. Изменения источников сопровождаются contract tests и документированной cache/rate policy.

## Порядок реализации

1. Search correctness: salary/location/work-mode/employment-type normalized contracts.
2. Search UX: salary + work mode + employment type + job details without profile-based filtering.
3. Separate «Подбор вакансий» mode using Career Profile and AI analysis.
4. Application Studio + universal «Открыть в AI» + AI Workspace import/processing.
5. Preview → explicit user approval → apply flow + application tracker.
6. Saved searches and monitoring.
7. Telegram authorized MTProto prototype.
8. Only after the above: expand sources and permitted application automation.


# JOBOS — Agent execution contract

## Product truth

JOBOS is an AI Career Operating System:

**Search settings → real vacancies → normalization/validation → filters → separate Career Profile matching → Application Studio → AI assistance → user review → original vacancy → history/tracking.**

Search and matching are separate product modes. Ordinary Search must not silently use Career Profile data to re-rank results.

## Current state — 2026-09

**Milestone: Production hardening / Search correctness.**

### Implemented and must not be regressed

- Unified runtime-validated SearchResult contract with required id, title, company, url and safe HTTP(S) URL validation.
- Canonical URL deduplication with common tracking-parameter removal.
- Independent source execution with Promise.allSettled.
- HH pagination policy and upstream result limits.
- Currency-aware salary filtering without fake cross-currency conversion.
- Remote / hybrid / office and employment-type filtering.
- AI Workspace import persistence in local browser storage.
- Application Studio Preview → explicit user confirmation → manual opening of original vacancy.
- Telegram Mini App initData HMAC validation and webhook secret validation.
- Vercel/self-hosted shared source architecture and cache policy.

### Current priority — do next

1. Verify every active upstream with real responses.
2. Capture representative real payload fixtures and test each normalizer.
3. Test malformed/incomplete upstream payloads and missing id/title/company/url.
4. Verify real vacancy URLs and source-specific viewer behavior.
5. Verify salary amount/range/currency/period semantics.
6. Verify remote/hybrid/office and employment semantics from structured source fields before heuristic fallback.
7. Verify cross-source deduplication.
8. Verify HH pagination and source failure isolation.
9. Verify result filters against real payloads.
10. Make source capabilities/errors/cache freshness visible to the user.
11. Add publication-date filtering, sorting, load-more/pagination and vacancy details.
12. Then strengthen Career Profile → separate matching → explainable compatibility.
13. Then expand Application Tracker, persistent user data and Telegram Mini App synchronization.

## Explicit product invariants

1. Search means “what vacancies exist for my query and filters”; it is not profile matching.
2. Matching is a separate operation over vacancies and Career Profile.
3. Unknown work mode is not office; unknown employment type is not full-time.
4. When a salary filter is active, an unrecognized salary must not pass as if it matched.
5. Different currencies must not be compared without an explicit, correct conversion policy.
6. A malformed vacancy must be rejected rather than partially displayed as a valid result.
7. One failing source must not fail the entire search.
8. Duplicate canonical URLs must produce one vacancy.
9. Original vacancy URLs must remain available where the source permits.
10. AI suggestions are not user facts until the user confirms/edits them.
11. AI must not invent education, certificates or professional history.
12. JOBOS must not automatically submit an application.
13. Preview and explicit user confirmation are mandatory before the manual application step.
14. Telegram identity must be server-validated; initDataUnsafe is never trusted as authentication.
15. Backlog UI must not simulate a successful feature; unimplemented actions must say “Будет реализовано позже”.
16. Basic job search must not require a paid AI/API service.

## Agent workflow

1. Read README.md and this roadmap before architectural changes.
2. Identify the exact feature, invariant and files involved.
3. Inspect existing implementation and tests before editing.
4. Reproduce the failure or prove the missing behavior.
5. Make the smallest atomic change that fixes one coherent problem.
6. Add or update targeted tests in the same change when behavior changes.
7. Run the relevant targeted check.
8. Run npm run check:full before declaring the work complete.
9. Inspect the actual CI result; never infer success from the patch.
10. Update this roadmap when milestone/status/constraints change.
11. Document unresolved issues explicitly instead of hiding them.
12. Do not mix unrelated refactors into a production bug fix.

## CI / Git hygiene

- Never commit literal escaped newlines (\\n) into source/test files when a real newline is required.
- Structure/syntax checks are mandatory; a syntactically broken test blocks the whole pipeline.
- Prefer atomic commits with one clear purpose.
- Do not use accept both during conflict resolution.
- Preserve the newer intended implementation when resolving conflicts.
- Do not claim “fixed” until the corresponding CI run has actually passed.
- If CI fails, use the exact failure output as the next debugging input.
- Before changing a source adapter, verify whether its upstream contract or cache policy is documented.
- Do not delete roadmap items merely because they are unfinished.

## Definition of done

A production task is done only when all applicable conditions are true:

- implementation exists;
- behavior is covered by targeted tests;
- malformed/error paths are covered;
- real upstream behavior has been verified when the task concerns an external source;
- npm run check:full passes;
- CI passes on the resulting commit;
- README/roadmap reflects the new state;
- no forbidden behavior or fake success was introduced.

## Future roadmap

### Phase A — Search correctness
- [ ] Real upstream verification for every active source.
- [ ] Real-response fixtures and regression tests.
- [ ] Source capabilities and error visibility.
- [ ] Correct salary/location/work-mode/employment semantics.
- [ ] Robust cross-source deduplication.

### Phase B — Search UX
- [ ] Source filter/status.
- [ ] Publication-date filter.
- [ ] Sorting.
- [ ] Load-more/pagination.
- [ ] Vacancy details.
- [ ] Stale-cache indicators.

### Phase C — Career Intelligence
- [ ] Career Profile data model.
- [ ] Separate matching mode.
- [ ] Explainable compatibility analysis.
- [ ] Confirm/edit/delete flow for AI-inferred profile facts.
- [ ] Skill/requirement gaps.

### Phase D — Application OS
- [ ] Full status lifecycle.
- [ ] Notes.
- [ ] Application date/history.
- [ ] Material versions.
- [ ] Pipeline/dashboard.

### Phase E — Persistence and Telegram
- [ ] Server-side user identity/session.
- [ ] Persistent cross-device data.
- [ ] Full Telegram Mini App flow.
- [ ] Web ↔ Mini App synchronization.

### Phase F — Monitoring
- [ ] Saved searches.
- [ ] New-vacancy detection.
- [ ] Optional notifications.

### Phase G — Additional integrations
- [ ] Telegram public-channel ingestion via permitted public preview.
- [ ] Authorized Telegram channel mode only after separate security/architecture research.
- [ ] Additional job sources only after API/feed/usage verification.
- [ ] Official application automation only after separate design, permission and safety review.

## Explicitly not planned / not allowed

- [ ] CAPTCHA bypass.
- [ ] Hidden scraping or access-control bypass.
- [ ] Fake vacancy records used to simulate integrations.
- [ ] Automatic job applications by default.
- [ ] Mandatory paid AI provider.
- [ ] Unverified claims that a source integration is working.
