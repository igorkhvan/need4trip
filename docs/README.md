# 📚 Need4Trip - Документация

Полная техническая документация проекта Need4Trip.

---

## ⭐ SINGLE SOURCE OF TRUTH

### → [**ARCHITECTURE.md**](./ARCHITECTURE.md) ←
**THE ONLY authoritative source for architectural decisions.**

All other documents defer to this one.

---

## 🗂️ Структура документации

### 🏗️ [Architecture](./architecture/) - Архитектура системы
Общая архитектура приложения, схема БД, дизайн API.

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - **SSOT** для архитектурных решений ⭐
- **[System Overview](./architecture/system-overview.md)** - Обзор всей системы
- **[Database Schema](./architecture/database-schema.md)** - Схема базы данных
- **[Security](./architecture/security.md)** - Безопасность API и данных

---

### 💳 [Billing](./billing/) - Платежная система v2.0
Полная документация по биллинг системе.

- **[Billing Specification](./billing/billing-spec.md)** - Полная спецификация v2.0
- **[Frontend Integration](./billing/frontend-integration.md)** - Интеграция с фронтендом
- **[Implementation Details](./billing/implementation.md)** - Детали реализации

---

### 👨‍💻 [Development](./development/) - Правила разработки
Код стайл, паттерны, оптимизация.

- **[Loading System](./development/loading-system.md)** - Система загрузки (SSR, Suspense, Optimistic UI)
- **[Performance](./development/performance.md)** - Оптимизация производительности
- **[Code Style](./development/code-style.md)** - Правила написания кода
- **[Patterns](./development/patterns.md)** - Применяемые паттерны

---

### 🎨 [Design](./design/) - Дизайн система
UI компоненты, стилизация, типография.

- **[Design System](./design/design-system.md)** - Полная дизайн система
- **[Styling Rules](./design/styling-rules.md)** - Правила стилизации компонентов
- **[Components Guide](./design/components.md)** - Гайд по UI компонентам

---

### 📖 [Guides](./guides/) - Руководства
Пошаговые инструкции по различным задачам.

- **[Telegram Setup](./guides/telegram-setup.md)** - Настройка Telegram Login Widget
- **[Database Migrations](./guides/database-migrations.md)** - Работа с миграциями
- **[Deployment](./guides/deployment.md)** - Деплой приложения

---

## 🚀 Быстрый старт

1. **Для новых разработчиков:**
   - Начни с [Quick Start](../QUICK_START.md)
   - Изучи [System Overview](./architecture/system-overview.md)
   - Ознакомься с [Code Style](./development/code-style.md)

2. **Для работы с биллингом:**
   - [Billing Specification](./billing/billing-spec.md) - полная спецификация
   - [Frontend Integration](./billing/frontend-integration.md) - как использовать на фронтенде

3. **Для работы с дизайном:**
   - [Design System](./design/design-system.md) - компоненты и стили
   - [Styling Rules](./design/styling-rules.md) - как стилизовать

4. **Для работы с БД:**
   - [Database Schema](./architecture/database-schema.md) - актуальная схема
   - [Database Migrations](./guides/database-migrations.md) - как создавать миграции

---

## 📊 Технологии

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Server Components
- **Database:** Supabase (PostgreSQL)
- **Auth:** Telegram Login Widget
- **Deployment:** Vercel

---

## 🤝 Вклад в проект

При добавлении новых фич:
1. Следуй [Code Style](./development/code-style.md)
2. Используй существующие [Patterns](./development/patterns.md)
3. Обнови документацию если нужно

---

## 📝 История изменений

См. [CHANGELOG.md](../CHANGELOG.md) для истории изменений.

---

**Last Updated:** 16 декабря 2024  
**Version:** 2.0  
**Status:** Production Ready ✅
