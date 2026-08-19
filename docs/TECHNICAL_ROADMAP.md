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

## Отложенные продуктовые функции — НЕ УДАЛЯТЬ

Следующие функции являются backlog, а не мусором. Если UI/модель уже содержит их элементы, до реализации показывать нейтральную заглушку «Будет реализовано позже» и не запрашивать секреты пользователя без необходимости.

### AI-помощник отклика
- [ ] Подготовка черновика сопроводительного письма по вакансии и профилю.
- [ ] Поддержка AI providers (Gemini / Groq / OpenRouter или актуальные бесплатные/опциональные варианты после отдельного security review).
- [ ] Безопасное хранение/использование API key — решение принять до включения функции.
- [ ] Анализ соответствия вакансии профилю.
- [ ] Никакой автоматической отправки отклика без отдельного проектирования и явного действия пользователя.

### HH account integration
- [ ] HH OAuth/token integration.
- [ ] Resume selection / resumeId.
- [ ] Отправка отклика через разрешённый официальный flow, если это допускается API и условиями HH.
- [ ] До реализации не просить HH token; показывать «Будет реализовано позже».

### Job application workflow
- [ ] Статусы: интересно / откликнулся / интервью / оффер / отказ / архив.
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
- [ ] Remote / hybrid / onsite filter.
- [ ] Фильтр по дате публикации.
- [ ] Корректный salary filter с валютой.
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
- Telegram job channels — будет реализовано позже / нужен отдельный ingestion design.
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

1. Production hardening и cache correctness.
2. Search correctness / source capabilities / salary-location model.
3. Search UX.
4. Job application tracker.
5. Saved searches и monitoring.
6. Опциональная AI-помощь.
7. Только затем — расширение числа источников и автоматизация отклика.
