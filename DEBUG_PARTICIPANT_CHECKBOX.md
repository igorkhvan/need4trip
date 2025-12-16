# 🐛 Debug: Участник Igor - поле "Наличие рации" = null

## Проблема
Участник Igor зарегистрировался, но поле "Наличие рации" сохранилось как `null` вместо `false`.

---

## Добавленное логирование

### Frontend (`participant-form.tsx`)
```typescript
console.log(`[ParticipantForm] Boolean field ${field.id}: raw=${value}, Boolean(value)=${boolValue}`);
console.log("[ParticipantForm] Prepared values:", preparedValues);
```

### Backend (`participants.ts`)
```typescript
console.log("[validateCustomFieldValues] Input values:", values);
console.log("[validateCustomFieldValues] Schema fields:", ...);
console.log(`[validateCustomFieldValues] Field ${field.id}: rawValue=${rawValue}, hasValue=${hasValue}`);
console.log("[validateCustomFieldValues] Final sanitized values:", sanitized);
```

---

## Как протестировать

### Вариант 1: Удалить Igor и зарегистрировать заново

1. **Удалите участника Igor** (кнопка корзины в таблице участников)
2. **Перезапустите dev сервер** (чтобы увидеть console.log):
   ```bash
   # Остановите текущий (Ctrl+C)
   npm run dev
   ```
3. **Откройте событие** в браузере
4. **Откройте DevTools Console** (F12 → Console)
5. **Нажмите "Присоединиться"**
6. **НЕ отмечайте** чекбокс "Наличие рации"
7. **Отправьте форму**
8. **Проверьте логи**:
   - В браузере (DevTools Console)
   - В терминале dev сервера

---

### Вариант 2: Проверить текущие данные Igor в БД

Выполните SQL запрос в Supabase Dashboard:

```sql
-- Получить данные участника Igor
SELECT 
  id,
  display_name,
  role,
  custom_field_values,
  created_at
FROM event_participants
WHERE display_name = 'Igor'
ORDER BY created_at DESC
LIMIT 1;
```

**Проверьте поле `custom_field_values`:**
- Должно быть: `{"field-xxx": false, "field-yyy": 5}`
- Сейчас скорее всего: `{"field-xxx": null, "field-yyy": 5}` ❌

---

### Вариант 3: Обновить данные Igor вручную

Если нужно быстро исправить:

```sql
-- Найти ID события и field ID чекбокса
SELECT 
  ep.id as participant_id,
  ep.custom_field_values,
  e.custom_fields_schema
FROM event_participants ep
JOIN events e ON e.id = ep.event_id
WHERE ep.display_name = 'Igor';

-- Обновить custom_field_values (замените значения)
UPDATE event_participants
SET custom_field_values = jsonb_set(
  custom_field_values,
  '{field-891ece66}',  -- Замените на реальный field ID
  'false'::jsonb
)
WHERE display_name = 'Igor';
```

---

## Ожидаемые логи (правильная работа)

### Frontend (Browser Console):
```
[ParticipantForm] Boolean field field-891ece66: raw=false, Boolean(value)=false
[ParticipantForm] Prepared values: {
  "field-891ece66": false,
  "field-83b7f1af": 5
}
```

### Backend (Terminal):
```
[validateCustomFieldValues] Input values: { field-891ece66: false, field-83b7f1af: 5 }
[validateCustomFieldValues] Schema fields: [
  { id: 'field-891ece66', type: 'boolean', required: false },
  { id: 'field-83b7f1af', type: 'number', required: false }
]
[validateCustomFieldValues] Field field-891ece66 (boolean): rawValue=false, hasValue=true
[validateCustomFieldValues] Sanitized boolean field field-891ece66: false
[validateCustomFieldValues] Final sanitized values: {
  field-891ece66: false,
  field-83b7f1af: 5
}
```

---

## Возможные причины проблемы

### 1. Igor регистрировался ДО исправления
- **Когда:** До коммита `5784795` или `3eb9cea`
- **Почему:** Старый код сохранял `null` для unchecked checkboxes
- **Решение:** Удалить и зарегистрировать заново

### 2. Кеш на клиенте
- **Когда:** Старый JavaScript bundle в браузере
- **Почему:** Browser cache не обновился
- **Решение:** Hard refresh (Ctrl+Shift+R) или очистить кеш

### 3. Поле не было в schema
- **Когда:** Событие создано/изменено без этого поля
- **Почему:** customFieldsSchema не содержало поле "Наличие рации"
- **Решение:** Проверить `events.custom_fields_schema` в БД

### 4. Frontend не отправил поле
- **Когда:** Bug в `preparedValues` mapping
- **Почему:** Поле пропущено или неправильно обработано
- **Решение:** Логи покажут это

---

## Следующие шаги

1. **Соберите логи** (один из вариантов выше)
2. **Отправьте логи** - покажите что видно в консоли
3. **Проверим вместе** - найдем где именно ломается

---

## Файлы с логированием

**Modified:**
- `src/components/events/participant-form.tsx` (строки 152-168)
- `src/lib/services/participants.ts` (строки 47-135)

**После отладки:** Уберем `console.log` из production кода.
