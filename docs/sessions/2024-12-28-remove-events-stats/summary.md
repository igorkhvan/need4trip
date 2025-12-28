# Краткий Summary: Удаление Stats

**Дата:** 28 декабря 2024  
**Статус:** Анализ завершён ✅  
**Документы:** `analysis.md` (полный анализ)

---

## 🎯 ЦЕЛЬ

Удалить stats карточки со страницы `/events` без побочных эффектов.

---

## ✅ ВЕРДИКТ

**БЕЗОПАСНО УДАЛЯТЬ.** Stats компоненты полностью изолированы.

---

## 📋 ЧТО УДАЛИТЬ

### Frontend (4 файла)

1. **events-page-client.tsx** (частично)
   - Stats section (lines 151-210)
   - statsParams (lines 34-39)
   - useEventsStats() call (line 43)
   - Imports: Calendar, Users, TrendingUp, StatsSkeleton, useEventsStats

2. **use-events-stats.ts** (полностью)

3. **stats-skeleton.tsx** (полностью)

### Backend (2 файла)

4. **api/events/stats/route.ts** (полностью)

5. **services/events.ts** (частично)
   - getEventsStats() function (lines 1139-1167)
   - countEventsByIds import (line 15)

---

## 📚 ЧТО ОБНОВИТЬ

### SSOT Документы (2 файла)

1. **docs/ssot/api-ssot.md**
   - Удалить API-027 (lines 1964-2015)
   - Обновить coverage table (line 3490)
   - Обновить счётчики (50 → 49 endpoints)
   - Обновить версию (1.1 → 1.2)

2. **docs/ARCHITECTURE.md**
   - Обновить § 10 title и TOC
   - Удалить Stats API Contract (lines 1148-1178)
   - Удалить Stats Caching Strategy (lines 1180-1230)
   - Обновить Caching Matrix (lines 1248-1270)
   - Удалить mentions в § 7 (lines 589, 638)
   - Добавить version history entry

---

## ⚠️ ЧТО НЕ ТРОГАТЬ

- ❌ meta.total — используется в UI
- ❌ DB repo functions (используются в основном списке)
- ❌ useEventsQuery hook
- ❌ countEventsByIds function (оставить в eventRepo.ts)

---

## 🔄 ЗАВИСИМОСТИ

**✅ Проверено:**
- getEventsStats используется ТОЛЬКО в 2 местах (определение + API route)
- useEventsStats используется ТОЛЬКО в 2 местах (определение + events-page-client)
- countEventsByIds используется ТОЛЬКО в getEventsStats
- Фильтры и пагинация НЕ зависят от stats

**Вывод:** ✅ Нет внешних зависимостей

---

## 🚀 ПЛАН ДЕЙСТВИЙ

1. ✅ **Анализ** — COMPLETE
2. ⏸️ **Implementation** — PENDING (ждём одобрения)
3. ⏸️ **Verification** — TypeScript + Build + Manual test
4. ⏸️ **SSOT Updates** — api-ssot.md + ARCHITECTURE.md
5. ⏸️ **Git** — Commit + push

---

## ⏱️ ОЦЕНКА ВРЕМЕНИ

- Frontend удаление: 30 мин
- Backend удаление: 15 мин
- Verification: 15 мин
- SSOT updates: 30 мин
- Session docs: 15 мин
- Git: 5 мин

**TOTAL:** ~1 час 50 минут

---

## 📎 REFERENCES

- **Full Analysis:** `docs/sessions/2024-12-28-remove-events-stats/analysis.md`
- **API SSOT:** `docs/ssot/api-ssot.md` (API-027)
- **ARCHITECTURE:** `docs/ARCHITECTURE.md` (§ 10)

---

**Next:** Жду одобрение для начала implementation.

