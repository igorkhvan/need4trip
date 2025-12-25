# ⚠️ Требуется: SUPABASE_SERVICE_ROLE_KEY

Для запуска тестов нужен **Service Role Key** из Supabase.

---

## 🔑 Как получить ключ

### Вариант 1: Через Supabase Dashboard

1. Открой https://supabase.com/dashboard
2. Выбери свой проект (need4trip)
3. Settings → API
4. Скопируй **service_role (secret)** key

### Вариант 2: Через Supabase CLI

```bash
# Если проект подключен
supabase status

# Найди строку:
# service_role key: eyJhbGci...
```

---

## ✅ Добавить ключ в .env.local

Открой `.env.local` и добавь:

```bash
SUPABASE_SERVICE_ROLE_KEY=твой-service-role-key-здесь
```

**Полный пример .env.local:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...  # ← ДОБАВЬ ЭТУ СТРОКУ
```

---

## 🚀 После добавления

1. Запусти setup снова:
   ```bash
   ./tests/setup-test-env.sh
   ```

2. Должно быть 3/3 ключа ✓

3. Запусти тесты:
   ```bash
   npm run test:billing
   ```

---

## ⚠️ Security Note

**Service Role Key обходит RLS!** Не коммить `.env.local` или `.env.test` в Git.

Они уже в `.gitignore` ✅

