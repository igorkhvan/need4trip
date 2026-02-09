---
Status: DRAFT
Created: 2026-02-09
Author: Cursor AI
Phase: SECURITY_OBSERVABILITY
---

# ANTI_ABUSE_METRICS_VALIDATION

Валидация предложенных метрик и пороговых значений для обнаружения злоупотреблений и аномалий против фактической кодовой базы Need4Trip.

---

## 1. Executive Summary

### Основные выводы

| Показатель | Значение |
|---|---|
| Всего предложенных метрик | 14 |
| ✅ Полностью наблюдаемых | 6 (43%) |
| ⚠️ Частично наблюдаемых | 5 (36%) |
| ❌ Ненаблюдаемых в текущем коде | 3 (21%) |

### Ключевые выводы

1. **Метрики записи (Write Activity)** — в основном наблюдаемы через Vercel Logs / structured logging, но требуют агрегации по пользователю и временному окну, которой сейчас нет.
2. **Метрики ошибок (Error Pressure)** — 429 наблюдаем через Upstash Analytics + middleware logs; 402 и 403 наблюдаемы через structured logger в `respondError()`.
3. **Метрики неэффективных действий** — наименее покрытая группа: нет концепции «publish» (события публикуются сразу), `repeated_identical_payloads` не отслеживается.
4. **AI-метрика** — полностью наблюдаема, rate limit уже установлен на 3 req/min.

### Общая оценка пригодности

Набор метрик **подходит для текущей стадии** при условии устранения 3 ключевых пробелов (см. §2.3, §4). Пороговые значения в целом разумные, но требуют калибровки под реальные rate limits (§3).

---

## 2. Validation of Proposed Metrics

### 2.1 Write Activity Metrics (Per-user, 15 min window)

| Metric | Validity | Source | Current observation point | Notes |
|---|---|---|---|---|
| `events.create.count` | ✅ Directly observable | `POST /api/events` → `events.ts::createEvent()` | Route handler response logs, DB `events.created_at` | Soft-deleted events also counted in DB |
| `events.update.count` | ✅ Directly observable | `PUT /api/events/[id]` → `events.ts::updateEvent()` | Route handler response logs, DB `events.updated_at`, `events.version` (auto-incremented) | `version` column в БД автоматически инкрементируется при каждом update |
| `clubs.create.count` | ✅ Directly observable | `POST /api/clubs` → `clubs.ts::createClub()` | Route handler logs, DB `clubs.created_at`, `club_audit_log` (action: `CLUB_CREATED`) | Club creation требует подписку (free plan не может создавать клубы) — встроенный billing guard |
| `join_requests.create.count` | ✅ Directly observable | `POST /api/clubs/[id]/join-requests` | Route handler logs, DB `club_join_requests.created_at`, `club_audit_log` (action: `JOIN_REQUEST_CREATED`) | UNIQUE constraint `(club_id, requester_user_id) WHERE status = 'pending'` предотвращает дубликаты для одного клуба |
| `participants.register.count` | ⚠️ Partially observable | `POST /api/events/[id]/participants` → `participants.ts::registerParticipant()` | Route handler logs, DB `event_participants.created_at` | **Проблема**: guest registrations (без `user_id`) привязаны к `guest_session_id`, а не к пользователю. Per-user tracking невозможен для анонимных регистраций. Rate limit: guest tier = 5 req/min (по IP) |

**Детали реализации:**

- Все write-операции проходят через единый middleware pipeline (`src/middleware.ts`), где rate limiting применяется **до** аутентификации (по IP).
- Structured logger (`src/lib/utils/logger.ts`) в production выводит JSON в Vercel Logs.
- `club_audit_log` уже записывает `CLUB_CREATED`, `JOIN_REQUEST_CREATED`, `JOIN_REQUEST_CANCELLED` — эти записи можно использовать для агрегации.
- Для **агрегации по пользователю за 15 мин** требуется либо DB query по `created_at`, либо внешняя система (лог-агрегатор).

### 2.2 Error Pressure Metrics (Per-user, 15 min window)

| Metric | Validity | Source | Current observation point | Notes |
|---|---|---|---|---|
| `errors.429.count` | ⚠️ Partially observable | `src/middleware.ts:353-370` | `console.warn('[Middleware] Rate limit exceeded', { pathname, method, tier, identifier, limit, window })` | Логируется в middleware, **но identifier = IP** (не userId). Upstash Analytics (`analytics: true`) собирает статистику на стороне провайдера. Per-user (userId) агрегация невозможна на текущем этапе — auth проверяется ПОСЛЕ rate limit check |
| `errors.402.count` | ✅ Directly observable | `src/lib/api/response.ts:66-79` → `respondError()` обрабатывает `PaywallError` | Structured log при каждом PaywallError; содержит `reason`, `currentPlanId`, `requiredPlanId`. Route handlers логируют контекст (userId, clubId, action) | Все 402 проходят через `respondError()` → можно перехватить централизованно. `accessControl.ts` логирует enforcement decisions |
| `errors.403.count` | ⚠️ Partially observable | Middleware: `forbiddenResponse()` (admin/cron); Service layer: `ForbiddenError`, `AuthError(403)`, `ClubArchivedError` | Middleware 403 логируются через `console.warn`; service-layer 403 через `respondError()` | **Проблема**: middleware-level 403 (invalid admin secret) и service-level 403 (authorization failure) генерируются в разных местах. Middleware 403 не содержит userId (запрос отклонён до аутентификации) |

**Ключевое ограничение:**

Rate limiting выполняется **ДО аутентификации** (`src/middleware.ts:326-330`):
```
// NOTE: At this point we don't have userId yet (auth happens later)
const identifier = getRateLimitIdentifier(null, ip);
```
Это означает, что per-user 429 tracking в текущей архитектуре невозможен — только per-IP.

### 2.3 Ineffective Action Metrics

| Metric | Validity | Source | Current observation point | Notes |
|---|---|---|---|---|
| `events.create_without_publish` | ❌ Not observable | N/A — **концепция «publish» отсутствует** | Нет | В N4T v5+ события публикуются **немедленно** при создании (`POST /api/events`). Нет отдельного шага publish. Нет draft/published статуса в схеме БД. `visibility` (`public`/`unlisted`/`restricted`) — это не то же самое, что publish status |
| `events.create_then_delete` | ⚠️ Partially observable | `POST /api/events` + `DELETE /api/events/[id]` → soft delete (`deleted_at` IS NOT NULL) | DB: `events.created_at` vs `events.deleted_at`; оба timestamp доступны | **Наблюдаемо через DB query**: `SELECT * FROM events WHERE deleted_at IS NOT NULL AND (deleted_at - created_at) < interval '15 minutes' AND created_by_user_id = ?`. Но нет real-time hook — только ретроспективно через DB |
| `repeated_identical_payloads` | ❌ Not observable | Нет механизма сравнения payload | Нет | Idempotency система (`src/lib/db/idempotencyRepo.ts`) хранит ключи и ответы, но по `Idempotency-Key` header, а **не** по content hash. Одинаковые запросы с разными ключами не детектируются. Для детекции нужен payload hashing в route handler |

**Критический вывод по `events.create_without_publish`:**

В кодовой базе N4T **отсутствует двухфазный процесс create → publish**. Событие становится видимым немедленно при успешном `POST /api/events`. Метрика `create_without_publish` **не может быть собрана**, потому что такой бизнес-процесс не существует.

**Возможная альтернатива:** `events.create_as_unlisted` — создание события с `visibility: 'unlisted'`, что может указывать на тестирование или подготовку. Но это легитимный use case.

### 2.4 AI Usage Metrics

| Metric | Validity | Source | Current observation point | Notes |
|---|---|---|---|---|
| `ai.generate_rules.count` | ✅ Directly observable | `POST /api/ai/events/generate-rules` | Rate limiter: **critical tier, 3 req/min per IP**. Route handler logs. OpenAI API call logs | Единственный AI endpoint. Требует аутентификацию. Rate limit = самый строгий tier в системе |

**Детали:**
- Файл: `src/app/api/ai/events/generate-rules/route.ts`
- Модель: `gpt-4o-mini` (настраивается через `OPENAI_MODEL`)
- Max tokens: 1200
- Аутентификация: обязательна (`getCurrentUserFromMiddleware`)
- Rate limit tier: `critical` = 3 req/min

---

## 3. Threshold Assessment

### 3.1 Соответствие пороговых значений текущим rate limits

Текущие rate limits системы (Upstash Redis, sliding window, per IP):

| Tier | Limit | Window | Эффективный лимит за 15 мин |
|---|---|---|---|
| `critical` | 3 req/min | 1 min | ~45 req/15min |
| `write` | 10 req/min | 1 min | ~150 req/15min |
| `read` | 60 req/min | 1 min | ~900 req/15min |
| `guest` | 5 req/min | 1 min | ~75 req/15min |

### 3.2 Оценка по каждой метрике

| Metric | Proposed Threshold (suspicious) | Rate Limit Ceiling (15 min) | Assessment | Recommendation |
|---|---|---|---|---|
| **Event create** | ≥6 | 150 (write) | ✅ **Разумный**. 6 событий за 15 мин — явная аномалия для нормального пользователя. Rate limit позволяет до 150, но бизнес-лимит гораздо ниже | Оставить как есть |
| **Event update** | ≥11 | 150 (write) | ✅ **Разумный**. 11+ правок за 15 мин — высокая активность, но законный сценарий (mass editing после создания). Порог может быть **немного низким** для активных организаторов | Рассмотреть повышение watch до 8–12, suspicious до ≥15 |
| **Club create** | ≥3 | 150 (write) | ✅ **Разумный**. Создание клуба требует подписку + entitlement, это **уже ограничено billing**. 3 клуба за 15 мин = аномалия | Оставить как есть. Billing enforcement уже служит guard |
| **Join requests** | ≥7 | 150 (write) | ✅ **Разумный**. DB unique constraint `(club_id, requester_user_id) WHERE status = 'pending'` предотвращает повторные запросы в один клуб. 7 запросов = 7 разных клубов за 15 мин — подозрительно | Оставить как есть |
| **Participant register** | ≥11 | 75 (guest) / 150 (write) | ⚠️ **Может быть низким**. Организатор может регистрировать участников массово. Guest tier = 5/min. Для auth users = write tier. Но 11 — это легитимный сценарий для организатора, добавляющего участников вручную | Повысить suspicious до ≥16 для auth users. Для guest оставить ≥11 |
| **429 errors** | ≥4 | N/A (это сам rate limit) | ✅ **Разумный**. 4+ 429 ошибок за 15 мин означает, что пользователь регулярно превышает rate limit — возможная автоматизация | Оставить как есть |
| **402 errors** | ≥6 | N/A | ⚠️ **Может быть низким**. PaywallError возникает при превышении billing limits. Пользователь, исследующий лимиты тарифа (пробуя разные настройки), может генерировать 6+ 402 за 15 мин легитимно | Повысить suspicious до ≥8, watch до 4–6 |
| **403 errors** | ≥4 | N/A | ✅ **Разумный**. 4+ 403 = попытки доступа к чужим ресурсам или подбор admin secret | Оставить как есть |
| **Create without publish** | ≥6 | N/A | ❌ **Неприменимо**. Событие публикуется при создании. Метрика не может быть собрана | **Удалить** или заменить (см. §4) |
| **Create then delete** | ≥4 | N/A | ✅ **Разумный**. Быстрое создание-удаление = вероятный тест/спам. Soft delete сохраняет записи | Оставить, но учесть что наблюдаемо только через DB query |
| **Identical payloads** | ≥4 | N/A | ❌ **Не наблюдаемо** без payload hashing. Idempotency keys не детектируют контентные дупликаты | Требует реализации payload hashing для наблюдаемости |
| **AI generate rules** | ≥5 | 45 (critical, 3/min × 15min) | ⚠️ **Слишком низкий**. Rate limit = 3 req/min. За 15 мин пользователь может легитимно сделать до 45 запросов. Но реальный паттерн использования — 1-3 раза за сессию редактирования | Пересмотреть: watch = 4–6, suspicious = ≥8 (с учётом cost per request для OpenAI) |

### 3.3 Риски false positives

| Сценарий | Затронутые метрики | Риск |
|---|---|---|
| Активный организатор создаёт серию мероприятий | `events.create.count`, `events.update.count` | **Средний** — организатор может создать 3-5 событий за сеанс |
| Новый пользователь исследует тарифы | `errors.402.count` | **Высокий** — пробует разные настройки, получает paywall |
| Организатор массово регистрирует участников | `participants.register.count` | **Высокий** — до 15-50 участников вручную |
| Пользователь с плохим соединением (retry storms) | `errors.429.count`, write metrics | **Средний** — автоматические retry от frontend |

---

## 4. Additional Recommended Metrics

### 4.1 Метрики, уже неявно доступные в кодовой базе

| # | Metric Name | What it indicates | Where captured | Why valuable |
|---|---|---|---|---|
| A1 | `auth.telegram.failure.count` | Неудачные попытки Telegram аутентификации (replay attack, invalid signature) | `src/app/api/auth/telegram/route.ts` — возвращает 400/403 при invalid hash или expired timestamp | Детектирует brute-force auth или token replay. Critical tier (3/min) уже применяется |
| A2 | `club_audit_log.actions_per_user` | Общий объём club mutations per user | `club_audit_log` таблица в БД (already populated): `CLUB_CREATED`, `CLUB_UPDATED`, `CLUB_ARCHIVED`, `JOIN_REQUEST_*`, `MEMBER_REMOVED`, `ROLE_CHANGED` | **Нулевая стоимость** — данные уже собираются. SQL агрегация: `SELECT actor_user_id, COUNT(*) FROM club_audit_log WHERE created_at > now() - interval '15 min' GROUP BY actor_user_id` |
| A3 | `events.soft_delete.velocity` | Скорость soft-deletion событий (create → delete time delta) | DB: `events.deleted_at - events.created_at` per `created_by_user_id` | Быстрое создание → удаление = спам/тестирование. Заменяет недоступную метрику `create_without_publish` |
| A4 | `billing.credit_consumption.count` | Скорость потребления billing credits | `billing_credits` table: `status` = `consumed`, `consumed_at` timestamp | Аномально быстрое потребление кредитов = возможная эксплуатация billing системы |
| A5 | `idempotency.collision.count` | Количество idempotency key коллизий (duplicate requests) | `src/lib/db/idempotencyRepo.ts:108` — `error.code === '23505'` (unique constraint violation) | Высокая частота коллизий = automated retry bombing или клиент-баг |

### 4.2 Метрики, требующие минимальной доработки (fire-and-forget log)

| # | Metric Name | What it indicates | Where to add | Implementation effort |
|---|---|---|---|---|
| B1 | `event.version.delta` | Количество версий события за период | DB: `events.version` column (auto-incremented) | Zero-cost: column already exists. Query: `SELECT id, version FROM events WHERE updated_at > now() - interval '15 min' AND version > 5` |
| B2 | `rate_limit.remaining_ratio` | Отношение remaining/limit для пользователя | `src/middleware.ts:347-351` — headers `X-RateLimit-Remaining` / `X-RateLimit-Limit` | Уже вычисляется. Добавить structured log при `remaining < limit * 0.2` (approaching limit) |
| B3 | `participant.guest_session.diversity` | Количество уникальных `guest_session_id` с одного IP | `event_participants.guest_session_id` + IP из request | Детектирует массовую гостевую регистрацию с одного устройства/скрипта |
| B4 | `auth.session.multi_ip` | Один auth token используется с нескольких IP одновременно | `src/middleware.ts` — JWT + `x-forwarded-for` | Детектирует shared/stolen tokens. Требует хранение `(userId, IP, timestamp)` tuple |

---

## 5. Metrics Explicitly NOT Recommended

| # | Metric | Reason NOT to track now |
|---|---|---|
| N1 | `user.browser_fingerprint` | Требует client-side fingerprinting (FingerprintJS и т.д.) — тяжёлая инфраструктура, privacy concerns, GDPR implications. Не оправдано на текущей стадии |
| N2 | `request.payload_similarity_score` | Требует ML/NLP для сравнения payload (embeddings, similarity). Слишком тяжёлая инфраструктура. Упрощённый вариант (exact hash match) — допустим (см. `repeated_identical_payloads` в §2.3) |
| N3 | `user.behavior_sequence_analysis` | Sequence mining для выявления ботов (e.g., "всегда create → update → delete за 30 сек"). Требует event stream processing (Kafka/Kinesis). Оверинжиниринг для текущей стадии |
| N4 | `geo.ip_location_anomaly` | IP-геолокация для обнаружения VPN/proxy. Требует GeoIP базу + обработку. Низкий ROI при текущем масштабе (<1000 пользователей). Рассмотреть при >10K пользователей |
| N5 | `captcha.score` | CAPTCHA/reCAPTCHA integration. Ухудшает UX (особенно Telegram WebApp). Rate limits + billing guards достаточны на текущем этапе |
| N6 | `webhook.replay_detection` | Billing webhook replay detection. Уже реализовано через signature verification в `POST /api/billing/webhook`. Отдельная метрика не нужна |

---

## Appendix A: Data Sources Summary

### Уже существующие data sources для метрик

| Source | What it provides | Access method |
|---|---|---|
| **Vercel Logs** (production) | Structured JSON logs от `src/lib/utils/logger.ts` | Vercel Dashboard → Logs; или Log Drain → external |
| **Upstash Redis Analytics** | Rate limit hit/miss statistics per key | Upstash Console → Analytics; `analytics: true` в rate limiter config |
| **`club_audit_log` table** | Club mutations с actor_user_id, action_code, timestamp | SQL query. Already populated by `clubAuditLog.ts` (fire-and-forget) |
| **`admin_audit_log` table** | Admin actions (credit grants, subscription extensions) | SQL query. Append-only, mandatory logging |
| **`idempotency_keys` table** | Duplicate request detection data | SQL query. Contains route, key, status, timestamps |
| **`events` table** | Event lifecycle: `created_at`, `updated_at`, `deleted_at`, `version` | SQL query. Soft-delete preserves history |
| **`event_participants` table** | Registration data: `user_id`, `guest_session_id`, `created_at` | SQL query |
| **`billing_credits` table** | Credit consumption: `status`, `consumed_at`, `consumed_event_id` | SQL query |
| **Beta Telemetry** (`src/lib/telemetry/beta.ts`) | `PAYWALL_SHOWN_BETA`, `PAYWALL_CONFIRMED_BETA`, `BETA_BILLING_AUTO_GRANT` | Structured logs (Vercel Logs) |

### Отсутствующие data sources

| Gap | What is missing | Impact on metrics |
|---|---|---|
| **Per-user 429 tracking** | Rate limiting по IP, не по userId (auth после rate limit) | `errors.429.count` per user невозможен. Только per-IP |
| **Payload hashing** | Нет hash/checksum тела запроса | `repeated_identical_payloads` не наблюдаема |
| **Publish status** | Нет draft → published workflow | `events.create_without_publish` не существует как концепция |
| **Real-time aggregation** | Нет time-windowed counters in-memory или в Redis | Все метрики за 15 мин требуют DB query или внешний агрегатор |

---

## Appendix B: Architecture Constraints

1. **Runtime:** Vercel Serverless Functions (stateless) — нет in-memory counters между запросами.
2. **Rate Limiting:** Upstash Redis (sliding window) — уже используется, можно расширить для метрик.
3. **Logging:** Console-based → Vercel Logs → возможен Log Drain в DataDog/Grafana.
4. **Database:** Supabase PostgreSQL — SQL queries для ретроспективного анализа доступны.
5. **No external APM:** Нет Sentry, DataDog, New Relic — всё через Vercel native.

---

*Документ создан для информационных целей. Не является нормативным документом (INFORMATIVE). Не содержит рекомендаций по реализации.*
