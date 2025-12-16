# 🔔 Архитектура системы уведомлений

## 📋 Обзор

Система уведомлений для оповещения зарегистрированных участников о изменениях в событиях через Telegram Bot API.

---

## 🎯 Требования

### Функциональные
1. **Триггеры уведомлений** - участники получают уведомления при:
   - Изменении даты/времени события
   - Изменении места сбора (город, locationText)
   - Изменении правил
   - Изменении лимита участников
   - Отмене события (DELETE)
   - Изменении статуса оплаты (isPaid, price, currency)
   - Изменении требований к транспорту
   - Публикации сообщения организатором (будущая фича)

2. **Настройки пользователя** - каждый триггер можно включить/выключить в профиле
3. **Фильтрация** - уведомления только для:
   - Зарегистрированных участников (таблица `event_participants`)
   - Пользователей с `telegram_id` (без Telegram ID не отправляем)
   - Пользователей с включенными триггерами в настройках

### Нефункциональные
1. **Надежность**: Сохранение истории уведомлений, retry логика
2. **Производительность**: Асинхронная отправка, batch processing
3. **Безопасность**: Telegram Bot Token только на сервере, RLS
4. **Мониторинг**: Логирование успешных/неудачных отправок

---

## 🏗️ Архитектурный дизайн

### 1. База данных

#### 1.1 Таблица `user_notification_settings`
Хранит настройки уведомлений для каждого пользователя.

```sql
CREATE TABLE user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Event update triggers
  notify_on_datetime_change BOOLEAN DEFAULT true,
  notify_on_location_change BOOLEAN DEFAULT true,
  notify_on_rules_change BOOLEAN DEFAULT false,
  notify_on_max_participants_change BOOLEAN DEFAULT true,
  notify_on_payment_change BOOLEAN DEFAULT true,
  notify_on_vehicle_requirement_change BOOLEAN DEFAULT true,
  notify_on_event_cancelled BOOLEAN DEFAULT true,
  
  -- Future triggers (reserved for phase 2)
  notify_on_organizer_message BOOLEAN DEFAULT true,
  notify_on_new_participant BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can read/update only their own settings
CREATE POLICY user_settings_select ON user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_settings_update ON user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-insert default settings when user is created
CREATE POLICY user_settings_insert ON user_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 1.2 Таблица `notification_queue`
Очередь для асинхронной отправки уведомлений.

```sql
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');
CREATE TYPE notification_trigger AS ENUM (
  'datetime_change',
  'location_change',
  'rules_change',
  'max_participants_change',
  'payment_change',
  'vehicle_requirement_change',
  'event_cancelled',
  'organizer_message'
);

CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification details
  trigger_type notification_trigger NOT NULL,
  message TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  
  -- Status tracking
  status notification_status DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT now(), -- для rate limiting
  
  -- Indexes
  INDEX idx_notification_queue_status (status),
  INDEX idx_notification_queue_scheduled (scheduled_for),
  INDEX idx_notification_queue_event (event_id),
  INDEX idx_notification_queue_user (user_id)
);

-- RLS: Only service role can access
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
```

#### 1.3 Таблица `notification_logs`
История отправленных уведомлений для аналитики и debugging.

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type notification_trigger NOT NULL,
  
  status notification_status NOT NULL,
  message TEXT NOT NULL,
  error_message TEXT,
  
  sent_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes for analytics
  INDEX idx_notification_logs_event (event_id),
  INDEX idx_notification_logs_user (user_id),
  INDEX idx_notification_logs_trigger (trigger_type),
  INDEX idx_notification_logs_status (status),
  INDEX idx_notification_logs_sent_at (sent_at)
);

-- RLS: Users can view their own notification history
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_logs_select ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);
```

---

### 2. Backend Services

#### 2.1 Notification Service (`src/lib/services/notifications.ts`)

**Responsibility:** Центральный сервис для работы с уведомлениями.

```typescript
// Типы уведомлений
export type NotificationTrigger = 
  | 'datetime_change'
  | 'location_change'
  | 'rules_change'
  | 'max_participants_change'
  | 'payment_change'
  | 'vehicle_requirement_change'
  | 'event_cancelled'
  | 'organizer_message';

// Детекция изменений в событии
export interface EventChanges {
  dateTimeChanged: boolean;
  locationChanged: boolean;
  rulesChanged: boolean;
  maxParticipantsChanged: boolean;
  paymentChanged: boolean;
  vehicleRequirementChanged: boolean;
}

/**
 * Определяет какие поля события изменились
 */
export function detectEventChanges(
  oldEvent: DbEvent,
  newData: EventUpdateInput
): EventChanges {
  return {
    dateTimeChanged: newData.dateTime !== undefined && 
      new Date(newData.dateTime).getTime() !== new Date(oldEvent.date_time).getTime(),
    
    locationChanged: (
      (newData.cityId !== undefined && newData.cityId !== oldEvent.city_id) ||
      (newData.locationText !== undefined && newData.locationText !== oldEvent.location_text)
    ),
    
    rulesChanged: newData.rules !== undefined && newData.rules !== oldEvent.rules,
    
    maxParticipantsChanged: newData.maxParticipants !== undefined && 
      newData.maxParticipants !== oldEvent.max_participants,
    
    paymentChanged: (
      (newData.isPaid !== undefined && newData.isPaid !== oldEvent.is_paid) ||
      (newData.price !== undefined && newData.price !== oldEvent.price) ||
      (newData.currencyCode !== undefined && newData.currencyCode !== oldEvent.currency_code)
    ),
    
    vehicleRequirementChanged: newData.vehicleTypeRequirement !== undefined && 
      newData.vehicleTypeRequirement !== oldEvent.vehicle_type_requirement,
  };
}

/**
 * Получить настройки уведомлений пользователей-участников
 */
export async function getParticipantsNotificationSettings(
  eventId: string
): Promise<Array<{ userId: string; telegramId: string; settings: NotificationSettings }>> {
  // 1. Получить всех участников события
  // 2. Фильтровать только тех, у кого есть telegram_id
  // 3. Загрузить их notification_settings
  // 4. Вернуть массив для обработки
}

/**
 * Создать уведомления для участников
 */
export async function queueParticipantNotifications(
  eventId: string,
  changes: EventChanges,
  eventTitle: string
): Promise<{ queued: number; skipped: number }> {
  // 1. Получить участников с настройками
  // 2. Для каждого изменения проверить настройки
  // 3. Сформировать message
  // 4. Добавить в notification_queue
  // 5. Вернуть статистику
}

/**
 * Обработать очередь уведомлений (вызывается из cron job или API route)
 */
export async function processNotificationQueue(
  batchSize: number = 10
): Promise<{ sent: number; failed: number }> {
  // 1. Получить pending уведомления (limit batchSize)
  // 2. Для каждого отправить через Telegram Bot API
  // 3. Обновить статус (sent/failed)
  // 4. При failed - увеличить attempts, reschedule
  // 5. Записать в notification_logs
  // 6. Вернуть статистику
}
```

#### 2.2 Telegram Bot Service (`src/lib/services/telegram/bot.ts`)

**Responsibility:** Взаимодействие с Telegram Bot API.

```typescript
/**
 * Отправить сообщение через Telegram Bot
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string,
  options?: {
    parseMode?: 'Markdown' | 'HTML';
    disableWebPagePreview?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: options?.parseMode ?? 'Markdown',
          disable_web_page_preview: options?.disableWebPagePreview ?? true,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.description || 'Unknown Telegram API error',
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Форматировать сообщение об изменении события
 */
export function formatEventChangeMessage(
  eventTitle: string,
  eventId: string,
  trigger: NotificationTrigger,
  details?: Record<string, any>
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://need4trip.kz';
  const eventUrl = `${baseUrl}/events/${eventId}`;
  
  let message = `🔔 *Изменение в событии*\n\n`;
  message += `📌 ${eventTitle}\n\n`;
  
  switch (trigger) {
    case 'datetime_change':
      message += `⏰ Изменилась дата или время события\n`;
      if (details?.newDateTime) {
        message += `Новое время: ${formatDateTime(details.newDateTime)}\n`;
      }
      break;
    
    case 'location_change':
      message += `📍 Изменилось место сбора\n`;
      if (details?.newLocation) {
        message += `Новое место: ${details.newLocation}\n`;
      }
      break;
    
    case 'rules_change':
      message += `📋 Обновлены правила участия\n`;
      break;
    
    case 'max_participants_change':
      message += `👥 Изменился лимит участников\n`;
      if (details?.newLimit) {
        message += `Новый лимит: ${details.newLimit} человек\n`;
      }
      break;
    
    case 'payment_change':
      message += `💰 Изменились условия оплаты\n`;
      break;
    
    case 'vehicle_requirement_change':
      message += `🚗 Изменились требования к транспорту\n`;
      break;
    
    case 'event_cancelled':
      message += `❌ *Событие отменено*\n`;
      break;
  }
  
  message += `\n[Подробности →](${eventUrl})`;
  
  return message;
}
```

---

### 3. Integration Points

#### 3.1 Интеграция в `updateEvent`

```typescript
// В src/lib/services/events.ts, функция updateEvent

export async function updateEvent(
  id: string,
  input: unknown,
  currentUser: CurrentUser | null
) {
  // ... existing validation ...
  
  const parsed = eventUpdateSchema.parse(input);
  const existing = await getEventById(id);
  
  // ✨ НОВОЕ: Детекция изменений ДО обновления
  const changes = detectEventChanges(existing, parsed);
  
  // ... existing business logic ...
  
  // Обновление события в БД
  const result = await updateEventRecord(id, {
    title: parsed.title,
    // ... other fields
  });
  
  // ✨ НОВОЕ: Постановка уведомлений в очередь ПОСЛЕ успешного обновления
  if (hasAnyChanges(changes)) {
    await queueParticipantNotifications(id, changes, result.title).catch(err => {
      // Не блокируем update события если уведомления не отправились
      console.error('[updateEvent] Failed to queue notifications:', err);
    });
  }
  
  // ... existing hydration and return ...
}
```

#### 3.2 Интеграция в `deleteEvent`

```typescript
export async function deleteEvent(
  id: string,
  currentUser: CurrentUser | null
) {
  // ... existing validation ...
  
  const existing = await getEventById(id);
  
  // ✨ НОВОЕ: Уведомить участников об отмене
  await queueEventCancelledNotifications(id, existing.title).catch(err => {
    console.error('[deleteEvent] Failed to queue cancellation notifications:', err);
  });
  
  // Удаление события
  await deleteEventRecord(id);
}
```

---

### 4. API Routes

#### 4.1 User Notification Settings API

**GET/PATCH `/api/profile/notifications`**

```typescript
// src/app/api/profile/notifications/route.ts

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return respondError(new AuthError('Unauthorized'));
  }
  
  const settings = await getUserNotificationSettings(currentUser.id);
  return respondJSON({ settings });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return respondError(new AuthError('Unauthorized'));
  }
  
  const body = await request.json();
  const parsed = notificationSettingsUpdateSchema.parse(body);
  
  const updated = await updateUserNotificationSettings(currentUser.id, parsed);
  return respondJSON({ settings: updated });
}
```

#### 4.2 Notification Queue Processor (Cron Job)

**POST `/api/cron/process-notifications`**

```typescript
// src/app/api/cron/process-notifications/route.ts

export async function POST(request: NextRequest) {
  // Verify cron secret (для безопасности)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return respondError(new AuthError('Unauthorized'));
  }
  
  try {
    const result = await processNotificationQueue(50); // batch size 50
    return respondJSON({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[cron] Failed to process notifications:', error);
    return respondError(error);
  }
}
```

---

### 5. Frontend Components

#### 5.1 Notification Settings Page

**`src/app/profile/notifications/page.tsx`**

```tsx
// Страница настроек уведомлений в профиле
export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    redirect('/');
  }
  
  const settings = await getUserNotificationSettings(currentUser.id);
  
  return (
    <div className="container max-w-2xl py-8">
      <h1>Настройки уведомлений</h1>
      <NotificationSettingsForm initialSettings={settings} />
    </div>
  );
}
```

#### 5.2 Notification Settings Form

**`src/components/profile/notification-settings-form.tsx`**

```tsx
'use client';

export function NotificationSettingsForm({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleToggle = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      toast({ title: 'Настройки сохранены' });
    } catch (error) {
      toast({ title: 'Ошибка', description: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <div className="space-y-4">
        <NotificationToggle
          label="Изменение даты/времени"
          description="Когда организатор меняет дату или время события"
          checked={settings.notify_on_datetime_change}
          onCheckedChange={(val) => handleToggle('notify_on_datetime_change', val)}
        />
        
        <NotificationToggle
          label="Изменение места сбора"
          description="Когда меняется город или место сбора"
          checked={settings.notify_on_location_change}
          onCheckedChange={(val) => handleToggle('notify_on_location_change', val)}
        />
        
        {/* ... другие триггеры ... */}
        
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>
    </Card>
  );
}
```

---

## 📝 План реализации

### Phase 1: Database & Core Services (День 1-2)

1. **Миграции базы данных**
   - ✅ Создать таблицу `user_notification_settings`
   - ✅ Создать таблицу `notification_queue`
   - ✅ Создать таблицу `notification_logs`
   - ✅ Создать ENUM типы
   - ✅ Настроить RLS policies
   - ✅ Создать indexes для производительности

2. **Репозитории (DB layer)**
   - ✅ `src/lib/db/notificationSettingsRepo.ts`
   - ✅ `src/lib/db/notificationQueueRepo.ts`
   - ✅ `src/lib/db/notificationLogsRepo.ts`

3. **Типы и схемы**
   - ✅ `src/lib/types/notification.ts`
   - ✅ Zod schemas для валидации

### Phase 2: Notification Service (День 2-3)

4. **Core notification service**
   - ✅ `src/lib/services/notifications.ts`
     - `detectEventChanges()`
     - `queueParticipantNotifications()`
     - `processNotificationQueue()`

5. **Telegram bot integration**
   - ✅ `src/lib/services/telegram/bot.ts`
     - `sendTelegramMessage()`
     - `formatEventChangeMessage()`
   - ✅ Добавить `TELEGRAM_BOT_TOKEN` в `.env.example`

### Phase 3: Event Integration (День 3-4)

6. **Интеграция в events service**
   - ✅ Обновить `updateEvent()` для детекции изменений
   - ✅ Обновить `deleteEvent()` для уведомлений об отмене
   - ✅ Unit tests для `detectEventChanges()`

### Phase 4: API & Cron (День 4-5)

7. **API routes**
   - ✅ `GET/PATCH /api/profile/notifications`
   - ✅ `POST /api/cron/process-notifications` (protected endpoint)

8. **Cron job setup**
   - ✅ Настроить Vercel Cron или аналог
   - ✅ Документация для deployment

### Phase 5: Frontend (День 5-6)

9. **UI компоненты**
   - ✅ `src/app/profile/notifications/page.tsx`
   - ✅ `src/components/profile/notification-settings-form.tsx`
   - ✅ Добавить навигацию в профиле

10. **Testing & Polish**
    - ✅ E2E тесты для полного flow
    - ✅ Проверка производительности
    - ✅ Документация

### Phase 6: Monitoring & Documentation (День 6-7)

11. **Мониторинг**
    - ✅ Logging для всех notification операций
    - ✅ Dashboard для просмотра статистики (опционально)

12. **Документация**
    - ✅ README для setup (Telegram Bot Token)
    - ✅ API документация
    - ✅ User guide для настроек уведомлений

---

## 🔒 Безопасность

1. **Telegram Bot Token** - только в server-side env vars
2. **RLS policies** - пользователи видят только свои настройки
3. **Cron endpoint** - защищен секретным токеном
4. **Rate limiting** - через `scheduled_for` в очереди
5. **Validation** - Zod schemas для всех inputs

---

## 🚀 Deployment Checklist

### Environment Variables

```bash
# .env.local
TELEGRAM_BOT_TOKEN=your_bot_token_here
CRON_SECRET=random_secure_string_for_cron_auth
NEXT_PUBLIC_APP_URL=https://need4trip.kz
```

### Vercel Setup

1. Добавить env vars в Vercel dashboard
2. Настроить Vercel Cron:
   ```json
   {
     "crons": [{
       "path": "/api/cron/process-notifications",
       "schedule": "*/5 * * * *"
     }]
   }
   ```
3. Запустить миграции: `supabase db push`

---

## 📊 Мониторинг и аналитика

### Ключевые метрики

1. **Отправка уведомлений**
   - Количество отправленных/failed за период
   - Средний retry count
   - Топ триггеры по популярности

2. **Настройки пользователей**
   - % пользователей с отключенными уведомлениями
   - Самые популярные/непопулярные триггеры

3. **Производительность**
   - Время обработки очереди
   - Telegram API latency
   - Queue backlog size

### SQL для аналитики

```sql
-- Статистика уведомлений за последние 7 дней
SELECT 
  trigger_type,
  status,
  COUNT(*) as count
FROM notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY trigger_type, status
ORDER BY count DESC;

-- Средний retry count для failed уведомлений
SELECT 
  AVG(attempts) as avg_retries
FROM notification_queue
WHERE status = 'failed';
```

---

## 🔄 Будущие улучшения (Phase 2)

1. **Rich notifications**: Inline buttons в Telegram (Открыть событие, Отписаться)
2. **Digest mode**: Группировка нескольких изменений в одно сообщение
3. **Email fallback**: Отправка на email если нет Telegram ID
4. **Push notifications**: Web Push для браузера
5. **Notification center**: История уведомлений в UI
6. **A/B testing**: Оптимизация текстов уведомлений

---

## ❓ FAQ

**Q: Что если пользователь заблокировал бота?**
A: Telegram API вернет ошибку, мы пометим как `failed` и не будем retry бесконечно (max 3 attempts).

**Q: Как избежать спама?**
A: Rate limiting через `scheduled_for`, batch processing, пользовательские настройки.

**Q: Что если очередь растет быстрее чем обрабатывается?**
A: Увеличить batch size в cron job, добавить несколько workers, добавить priority queue.

**Q: Нужно ли хранить message templates в БД?**
A: Нет, пока достаточно хардкода в `formatEventChangeMessage()`. Если понадобится A/B testing - вынесем в БД.

---

## 📚 Ссылки

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api#sendmessage)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

