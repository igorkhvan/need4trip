# 🔧 Исправление таблицы currencies

## 🐛 Проблема

API `/api/currencies` возвращает пустой массив, хотя данные есть в БД.

**Логи из Vercel:**
```
Error details: { 
  message: 'column currencies.sort_order does not exist', 
  code: '42703' 
}
```

**Причины:**
1. ❌ Колонка `sort_order` отсутствует в БД
2. ❌ RLS включен, но нет политик доступа

---

## ✅ Решение

### Применить миграцию через Supabase Dashboard

1. **Откройте Supabase Dashboard**
   - Перейдите в проект: https://supabase.com/dashboard/project/YOUR_PROJECT

2. **SQL Editor**
   - Левое меню → **SQL Editor**
   - Нажмите **New Query**

3. **Вставьте содержимое файла:**
   ```
   supabase/migrations/FIX_CURRENCIES_COMPLETE.sql
   ```

4. **Нажмите Run** (зелёная кнопка или Ctrl+Enter)

5. **Проверьте вывод:**
   ```
   ✅ Added sort_order column (if not exists)
   ✅ Updated sort_order values
   ✅ Created index on (is_active, sort_order)
   ✅ Enabled RLS and created read policy
   ✅ Currencies table configuration complete
   ```

---

## 🧪 Проверка после применения

### 1. В браузерной консоли:
```javascript
✅ Loaded currencies: [
  {code: "RUB", symbol: "₽", nameRu: "Российский рубль", ...},
  {code: "KZT", symbol: "₸", nameRu: "Казахстанский тенге", ...},
  // ... 6 остальных валют
]
```

### 2. В серверных логах (Vercel):
```
🔍 [currencyRepo] getActiveCurrencies called
📡 [currencyRepo] Fetching from DB...
✅ [currencyRepo] Fetched 8 currencies from DB
Sample currency: {code: "RUB", symbol: "₽", ...}
✅ [API /api/currencies] Loaded 8 currencies
```

### 3. На странице создания события:
- Поле "Валюта" должно иметь выпадающий список
- Поиск по "kzt", "тенге", "₸" должен работать
- Валюты отсортированы: RUB, KZT, BYN, USD, EUR, ...

---

## 📊 Что делает миграция

| Шаг | Описание | Результат |
|-----|----------|-----------|
| 1 | `ADD COLUMN sort_order` | Добавляет колонку для сортировки |
| 2 | `UPDATE sort_order` | Устанавливает порядок для 8 валют |
| 3 | `CREATE INDEX` | Оптимизирует запросы |
| 4 | `ENABLE RLS + POLICY` | Разрешает публичное чтение |
| 5 | Verification | Показывает статистику |

---

## ⚠️ Если миграция не помогла

**Проверьте существующие колонки:**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'currencies'
ORDER BY ordinal_position;
```

**Проверьте RLS:**

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'currencies';
```

**Проверьте данные:**

```sql
SELECT code, symbol, name_ru, is_active, sort_order 
FROM public.currencies 
ORDER BY sort_order, code;
```

---

## 🎯 Ожидаемый результат

После применения миграции:
- ✅ Колонка `sort_order` существует
- ✅ RLS policy настроена
- ✅ API возвращает 8 валют
- ✅ Поиск в dropdown работает
- ✅ Форма создания события работает корректно

---

**Автор:** AI Assistant  
**Дата:** 13 декабря 2024  
**Версия:** 1.0

