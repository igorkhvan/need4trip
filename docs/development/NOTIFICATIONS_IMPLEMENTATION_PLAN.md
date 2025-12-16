# 🚀 План реализации системы уведомлений

## Краткий чек-лист для реализации

---

## ✅ Phase 1: Database Setup (2-3 часа)

### Задача 1.1: Создать миграцию для notification system

**Файл:** `supabase/migrations/20241217_create_notifications_system.sql`

```sql
-- 1. ENUM types
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

-- 2. user_notification_settings table
CREATE TABLE user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_on_datetime_change BOOLEAN DEFAULT true,
  notify_on_location_change BOOLEAN DEFAULT true,
  notify_on_rules_change BOOLEAN DEFAULT false,
  notify_on_max_participants_change BOOLEAN DEFAULT true,
  notify_on_payment_change BOOLEAN DEFAULT true,
  notify_on_vehicle_requirement_change BOOLEAN DEFAULT true,
  notify_on_event_cancelled BOOLEAN DEFAULT true,
  notify_on_organizer_message BOOLEAN DEFAULT true,
  notify_on_new_participant BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. notification_queue table
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type notification_trigger NOT NULL,
  message TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  status notification_status DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT now()
);

-- 4. notification_logs table
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type notification_trigger NOT NULL,
  status notification_status NOT NULL,
  message TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_event ON notification_queue(event_id);
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notification_logs_event ON notification_logs(event_id);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_trigger ON notification_logs(trigger_type);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);

-- 6. RLS Policies
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_select ON user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_settings_update ON user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY user_settings_insert ON user_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_logs_select ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_notification_settings_updated_at 
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Действия:**
- [ ] Создать файл миграции
- [ ] Применить через `supabase db push` или dashboard
- [ ] Проверить что все таблицы созданы

---

## ✅ Phase 2: Type Definitions (1 час)

### Задача 2.1: Создать типы и схемы

**Файл:** `src/lib/types/notification.ts`

```typescript
import { z } from "zod";

export const notificationTriggerSchema = z.enum([
  'datetime_change',
  'location_change',
  'rules_change',
  'max_participants_change',
  'payment_change',
  'vehicle_requirement_change',
  'event_cancelled',
  'organizer_message',
]);

export type NotificationTrigger = z.infer<typeof notificationTriggerSchema>;

export const notificationStatusSchema = z.enum(['pending', 'sent', 'failed', 'cancelled']);
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

export interface NotificationSettings {
  userId: string;
  notifyOnDatetimeChange: boolean;
  notifyOnLocationChange: boolean;
  notifyOnRulesChange: boolean;
  notifyOnMaxParticipantsChange: boolean;
  notifyOnPaymentChange: boolean;
  notifyOnVehicleRequirementChange: boolean;
  notifyOnEventCancelled: boolean;
  notifyOnOrganizerMessage: boolean;
  notifyOnNewParticipant: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationSettingsUpdateSchema = z.object({
  notifyOnDatetimeChange: z.boolean().optional(),
  notifyOnLocationChange: z.boolean().optional(),
  notifyOnRulesChange: z.boolean().optional(),
  notifyOnMaxParticipantsChange: z.boolean().optional(),
  notifyOnPaymentChange: z.boolean().optional(),
  notifyOnVehicleRequirementChange: z.boolean().optional(),
  notifyOnEventCancelled: z.boolean().optional(),
  notifyOnOrganizerMessage: z.boolean().optional(),
  notifyOnNewParticipant: z.boolean().optional(),
});

export type NotificationSettingsUpdate = z.infer<typeof notificationSettingsUpdateSchema>;

export interface NotificationQueueItem {
  id: string;
  eventId: string;
  userId: string;
  triggerType: NotificationTrigger;
  message: string;
  telegramChatId: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  scheduledFor: string;
}

export interface EventChanges {
  dateTimeChanged: boolean;
  locationChanged: boolean;
  rulesChanged: boolean;
  maxParticipantsChanged: boolean;
  paymentChanged: boolean;
  vehicleRequirementChanged: boolean;
}
```

**Действия:**
- [ ] Создать файл с типами
- [ ] Экспортировать из `src/lib/types/index.ts`
- [ ] Проверить TypeScript compile

---

## ✅ Phase 3: Database Repositories (2-3 часа)

### Задача 3.1: Notification Settings Repo

**Файл:** `src/lib/db/notificationSettingsRepo.ts`

**Функции:**
- `getUserNotificationSettings(userId: string)`
- `updateUserNotificationSettings(userId: string, settings: NotificationSettingsUpdate)`
- `createDefaultSettings(userId: string)`

### Задача 3.2: Notification Queue Repo

**Файл:** `src/lib/db/notificationQueueRepo.ts`

**Функции:**
- `addToQueue(item: Omit<NotificationQueueItem, 'id' | 'createdAt'>)`
- `getPendingNotifications(limit: number)`
- `markAsSent(id: string)`
- `markAsFailed(id: string, error: string)`
- `incrementAttempts(id: string)`
- `cancelNotification(id: string)`

### Задача 3.3: Notification Logs Repo

**Файл:** `src/lib/db/notificationLogsRepo.ts`

**Функции:**
- `logNotification(log: NotificationLogInput)`
- `getUserNotificationHistory(userId: string, limit?: number)`

**Действия:**
- [ ] Создать все 3 файла репозиториев
- [ ] Реализовать функции с использованием `supabaseAdmin`
- [ ] Добавить error handling
- [ ] Тесты (optional)

---

## ✅ Phase 4: Telegram Bot Service (2 часа)

### Задача 4.1: Bot integration

**Файл:** `src/lib/services/telegram/bot.ts`

```typescript
export async function sendTelegramMessage(
  chatId: string,
  message: string,
  options?: { parseMode?: 'Markdown' | 'HTML' }
): Promise<{ success: boolean; error?: string }> {
  // Implementation
}

export function formatEventChangeMessage(
  eventTitle: string,
  eventId: string,
  trigger: NotificationTrigger,
  details?: Record<string, any>
): string {
  // Implementation  
}

function formatDateTime(dateTime: string | Date): string {
  // Format to "DD MMM YYYY, HH:MM"
}
```

**Действия:**
- [ ] Создать файл
- [ ] Реализовать `sendTelegramMessage` с fetch к Telegram API
- [ ] Реализовать `formatEventChangeMessage` для каждого триггера
- [ ] Добавить `TELEGRAM_BOT_TOKEN` в `.env.example`
- [ ] Протестировать отправку

---

## ✅ Phase 5: Core Notification Service (3-4 часа)

### Задача 5.1: Event change detection

**Файл:** `src/lib/services/notifications.ts`

```typescript
import type { EventUpdateInput } from '@/lib/types/event';
import type { DbEvent } from '@/lib/db/eventRepo';
import type { EventChanges, NotificationTrigger } from '@/lib/types/notification';

export function detectEventChanges(
  oldEvent: DbEvent,
  newData: EventUpdateInput
): EventChanges {
  // Compare old vs new and return changes object
}

export function hasAnyChanges(changes: EventChanges): boolean {
  return Object.values(changes).some(changed => changed === true);
}
```

### Задача 5.2: Queue notifications

```typescript
export async function queueParticipantNotifications(
  eventId: string,
  changes: EventChanges,
  eventTitle: string,
  eventData?: Record<string, any>
): Promise<{ queued: number; skipped: number }> {
  // 1. Get participants with telegram_id
  // 2. Get their notification settings
  // 3. For each change, check if user has that trigger enabled
  // 4. Queue notifications
  // 5. Return stats
}

export async function queueEventCancelledNotifications(
  eventId: string,
  eventTitle: string
): Promise<{ queued: number }> {
  // Similar to above but only for cancellation trigger
}
```

### Задача 5.3: Process queue

```typescript
export async function processNotificationQueue(
  batchSize: number = 10
): Promise<{ sent: number; failed: number }> {
  // 1. Get pending notifications (limit batchSize)
  // 2. For each, call sendTelegramMessage
  // 3. Update status (sent/failed)
  // 4. Log to notification_logs
  // 5. Retry logic for failed (reschedule if attempts < max)
  // 6. Return stats
}
```

**Действия:**
- [ ] Создать файл
- [ ] Реализовать `detectEventChanges`
- [ ] Реализовать `queueParticipantNotifications`
- [ ] Реализовать `queueEventCancelledNotifications`
- [ ] Реализовать `processNotificationQueue`
- [ ] Unit tests для `detectEventChanges`

---

## ✅ Phase 6: Event Service Integration (1-2 часа)

### Задача 6.1: Update `updateEvent`

**Файл:** `src/lib/services/events.ts`

```typescript
import { 
  detectEventChanges, 
  hasAnyChanges, 
  queueParticipantNotifications 
} from './notifications';

export async function updateEvent(
  id: string,
  input: unknown,
  currentUser: CurrentUser | null
) {
  // ... existing code ...
  
  const parsed = eventUpdateSchema.parse(input);
  const existing = await getEventById(id);
  
  // ✨ NEW: Detect changes BEFORE update
  const changes = detectEventChanges(existing, parsed);
  
  // ... existing validation & business logic ...
  
  // Update in DB
  const result = await updateEventRecord(id, { /* ... */ });
  
  // ✨ NEW: Queue notifications AFTER successful update
  if (hasAnyChanges(changes)) {
    await queueParticipantNotifications(
      id, 
      changes, 
      result.title,
      { /* optional event details for message formatting */ }
    ).catch(err => {
      console.error('[updateEvent] Failed to queue notifications:', err);
      // Don't block event update if notifications fail
    });
  }
  
  // ... existing return ...
}
```

### Задача 6.2: Update `deleteEvent`

```typescript
import { queueEventCancelledNotifications } from './notifications';

export async function deleteEvent(
  id: string,
  currentUser: CurrentUser | null
) {
  // ... existing validation ...
  
  const existing = await getEventById(id);
  
  // ✨ NEW: Notify participants about cancellation
  await queueEventCancelledNotifications(id, existing.title).catch(err => {
    console.error('[deleteEvent] Failed to queue cancellation notifications:', err);
  });
  
  // Delete event
  await deleteEventRecord(id);
}
```

**Действия:**
- [ ] Обновить `updateEvent` с логикой детекции и очереди
- [ ] Обновить `deleteEvent` с логикой отмены
- [ ] Проверить что event updates не ломаются
- [ ] Проверить что notifications queued (посмотреть в БД)

---

## ✅ Phase 7: API Routes (2 часа)

### Задача 7.1: Notification Settings API

**Файл:** `src/app/api/profile/notifications/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { respondJSON, respondError } from '@/lib/api/response';
import { getCurrentUser } from '@/lib/auth/currentUser';
import { 
  getUserNotificationSettings, 
  updateUserNotificationSettings,
  createDefaultSettings
} from '@/lib/db/notificationSettingsRepo';
import { notificationSettingsUpdateSchema } from '@/lib/types/notification';
import { AuthError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AuthError('Unauthorized', undefined, 401);
    }
    
    let settings = await getUserNotificationSettings(currentUser.id);
    
    // Create default settings if not exist
    if (!settings) {
      settings = await createDefaultSettings(currentUser.id);
    }
    
    return respondJSON({ settings });
  } catch (error) {
    return respondError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AuthError('Unauthorized', undefined, 401);
    }
    
    const body = await request.json();
    const parsed = notificationSettingsUpdateSchema.parse(body);
    
    const updated = await updateUserNotificationSettings(currentUser.id, parsed);
    
    return respondJSON({ settings: updated });
  } catch (error) {
    return respondError(error);
  }
}
```

**Действия:**
- [ ] Создать route файл
- [ ] Реализовать GET handler
- [ ] Реализовать PATCH handler
- [ ] Протестировать через curl/Postman

### Задача 7.2: Cron Job для обработки очереди

**Файл:** `src/app/api/cron/process-notifications/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { respondJSON, respondError } from '@/lib/api/response';
import { processNotificationQueue } from '@/lib/services/notifications';
import { AuthError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      throw new AuthError('Unauthorized', undefined, 401);
    }
    
    // Process up to 50 notifications per run
    const result = await processNotificationQueue(50);
    
    console.log(`[cron] Processed notifications: ${result.sent} sent, ${result.failed} failed`);
    
    return respondJSON({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[cron] Error processing notifications:', error);
    return respondError(error);
  }
}
```

**Действия:**
- [ ] Создать route файл
- [ ] Добавить `CRON_SECRET` в `.env.example`
- [ ] Протестировать локально
- [ ] Настроить Vercel Cron (см. Phase 9)

---

## ✅ Phase 8: Frontend UI (3-4 часа)

### Задача 8.1: Notification Settings Page

**Файл:** `src/app/profile/notifications/page.tsx`

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/currentUser';
import { getUserNotificationSettings, createDefaultSettings } from '@/lib/db/notificationSettingsRepo';
import { NotificationSettingsForm } from '@/components/profile/notification-settings-form';

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    redirect('/');
  }
  
  let settings = await getUserNotificationSettings(currentUser.id);
  
  if (!settings) {
    settings = await createDefaultSettings(currentUser.id);
  }
  
  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Настройки уведомлений</h1>
        <p className="mt-2 text-muted-foreground">
          Выберите, какие уведомления вы хотите получать в Telegram
        </p>
      </div>
      
      <NotificationSettingsForm initialSettings={settings} />
    </div>
  );
}
```

### Задача 8.2: Notification Settings Form Component

**Файл:** `src/components/profile/notification-settings-form.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/utils/errors';
import type { NotificationSettings } from '@/lib/types/notification';

interface Props {
  initialSettings: NotificationSettings;
}

export function NotificationSettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifyOnDatetimeChange: settings.notifyOnDatetimeChange,
          notifyOnLocationChange: settings.notifyOnLocationChange,
          notifyOnRulesChange: settings.notifyOnRulesChange,
          notifyOnMaxParticipantsChange: settings.notifyOnMaxParticipantsChange,
          notifyOnPaymentChange: settings.notifyOnPaymentChange,
          notifyOnVehicleRequirementChange: settings.notifyOnVehicleRequirementChange,
          notifyOnEventCancelled: settings.notifyOnEventCancelled,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      toast({ 
        title: 'Сохранено', 
        description: 'Настройки уведомлений обновлены' 
      });
    } catch (error) {
      toast({ 
        title: 'Ошибка', 
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <NotificationToggle
          label="Изменение даты/времени"
          description="Уведомление при изменении даты или времени события"
          checked={settings.notifyOnDatetimeChange}
          onCheckedChange={(val) => handleToggle('notifyOnDatetimeChange', val)}
        />
        
        <NotificationToggle
          label="Изменение места сбора"
          description="Уведомление при изменении города или точки сбора"
          checked={settings.notifyOnLocationChange}
          onCheckedChange={(val) => handleToggle('notifyOnLocationChange', val)}
        />
        
        <NotificationToggle
          label="Изменение правил"
          description="Уведомление при обновлении правил участия"
          checked={settings.notifyOnRulesChange}
          onCheckedChange={(val) => handleToggle('notifyOnRulesChange', val)}
        />
        
        <NotificationToggle
          label="Изменение лимита участников"
          description="Уведомление при изменении максимального количества участников"
          checked={settings.notifyOnMaxParticipantsChange}
          onCheckedChange={(val) => handleToggle('notifyOnMaxParticipantsChange', val)}
        />
        
        <NotificationToggle
          label="Изменение условий оплаты"
          description="Уведомление при изменении стоимости или статуса платности"
          checked={settings.notifyOnPaymentChange}
          onCheckedChange={(val) => handleToggle('notifyOnPaymentChange', val)}
        />
        
        <NotificationToggle
          label="Изменение требований к транспорту"
          description="Уведомление при изменении типа транспорта или марок"
          checked={settings.notifyOnVehicleRequirementChange}
          onCheckedChange={(val) => handleToggle('notifyOnVehicleRequirementChange', val)}
        />
        
        <NotificationToggle
          label="Отмена события"
          description="Уведомление если организатор отменяет событие"
          checked={settings.notifyOnEventCancelled}
          onCheckedChange={(val) => handleToggle('notifyOnEventCancelled', val)}
        />
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function NotificationToggle({ label, description, checked, onCheckedChange }: NotificationToggleProps) {
  return (
    <div className="flex items-start justify-between space-x-4">
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
      </label>
    </div>
  );
}
```

### Задача 8.3: Добавить навигацию

**Файл:** `src/app/profile/layout.tsx` (или где у вас навигация профиля)

Добавить ссылку на `/profile/notifications` в сайдбар/табы профиля.

**Действия:**
- [ ] Создать страницу `/profile/notifications`
- [ ] Создать форму компонент
- [ ] Создать toggle компонент (или использовать Switch из shadcn/ui)
- [ ] Добавить навигацию
- [ ] Протестировать UI

---

## ✅ Phase 9: Deployment & Configuration (1 час)

### Задача 9.1: Environment Variables

**Обновить `.env.example`:**

```bash
# Telegram Bot (for notifications)
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Cron job authentication
CRON_SECRET=random_secure_string_min_32_chars

# App URL for notification links
NEXT_PUBLIC_APP_URL=https://need4trip.kz
```

### Задача 9.2: Vercel Cron Setup

**Создать файл:** `vercel.json` (если еще нет)

```json
{
  "crons": [{
    "path": "/api/cron/process-notifications",
    "schedule": "*/5 * * * *"
  }]
}
```

Это запускает cron job каждые 5 минут.

### Задача 9.3: Telegram Bot Setup

**Инструкция для пользователя:**

1. Создать бота через @BotFather в Telegram:
   - `/newbot`
   - Придумать имя (например, "Need4Trip Notifications")
   - Получить токен
2. Добавить токен в Vercel env vars: `TELEGRAM_BOT_TOKEN`
3. Сгенерировать случайный секрет: `openssl rand -base64 32`
4. Добавить в Vercel env vars: `CRON_SECRET`

**Действия:**
- [ ] Обновить `.env.example`
- [ ] Создать/обновить `vercel.json`
- [ ] Создать документацию для setup бота
- [ ] Добавить env vars в Vercel dashboard
- [ ] Применить миграции к production БД

---

## ✅ Phase 10: Testing & Monitoring (2-3 часа)

### Задача 10.1: Manual Testing

**Тест-кейсы:**

1. **Создание пользователя с Telegram**
   - [ ] Проверить что создаются default notification settings

2. **Настройки уведомлений**
   - [ ] Открыть `/profile/notifications`
   - [ ] Переключить все триггеры
   - [ ] Сохранить
   - [ ] Обновить страницу - проверить что сохранилось

3. **Обновление события**
   - [ ] Создать событие
   - [ ] Зарегистрировать участника (с Telegram ID)
   - [ ] Обновить дату события
   - [ ] Проверить что в `notification_queue` появилась запись
   - [ ] Запустить cron job (или вызвать `/api/cron/process-notifications`)
   - [ ] Проверить что уведомление отправилось в Telegram
   - [ ] Проверить `notification_logs`

4. **Фильтрация по настройкам**
   - [ ] Отключить триггер "изменение даты"
   - [ ] Обновить дату события
   - [ ] Проверить что уведомление НЕ добавилось в очередь

5. **Отмена события**
   - [ ] Удалить событие с участниками
   - [ ] Проверить что отправилось уведомление об отмене

### Задача 10.2: Мониторинг

**SQL запросы для проверки:**

```sql
-- Pending уведомления
SELECT COUNT(*) FROM notification_queue WHERE status = 'pending';

-- Failed уведомления за последний час
SELECT * FROM notification_logs 
WHERE status = 'failed' AND sent_at >= NOW() - INTERVAL '1 hour'
ORDER BY sent_at DESC;

-- Статистика по триггерам
SELECT trigger_type, status, COUNT(*) 
FROM notification_logs 
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY trigger_type, status
ORDER BY COUNT(*) DESC;
```

**Действия:**
- [ ] Провести manual testing по всем кейсам
- [ ] Проверить логи cron job в Vercel
- [ ] Проверить метрики в БД
- [ ] Протестировать retry логику (симулировать Telegram API error)

---

## ✅ Phase 11: Documentation (1 час)

### Задача 11.1: README для notifications

**Файл:** `docs/development/NOTIFICATIONS_SETUP.md`

Короткий гайд:
- Как получить Telegram Bot Token
- Как настроить env vars
- Как проверить что всё работает
- Troubleshooting (частые ошибки)

### Задача 11.2: User Guide

**Файл:** `docs/user/NOTIFICATIONS.md`

Для конечных пользователей:
- Как включить/отключить уведомления
- Какие типы уведомлений доступны
- Как убедиться что Telegram ID привязан

**Действия:**
- [ ] Создать setup guide для разработчиков
- [ ] Создать user guide
- [ ] Обновить главный README с ссылкой на notifications

---

## 📊 Критерии готовности (Definition of Done)

Фича считается завершенной когда:

- ✅ Все миграции применены к dev и prod БД
- ✅ Все TypeScript файлы компилируются без ошибок
- ✅ API endpoints работают (GET/PATCH `/api/profile/notifications`)
- ✅ Cron job запускается и обрабатывает очередь
- ✅ UI страница настроек работает и сохраняет изменения
- ✅ При обновлении события участники получают уведомления в Telegram
- ✅ Настройки пользователя фильтруют уведомления корректно
- ✅ Failed notifications retry до 3 раз
- ✅ Логи пишутся в `notification_logs`
- ✅ Документация создана
- ✅ Env vars добавлены в Vercel
- ✅ Manual testing пройден

---

## 🚀 Порядок выполнения (рекомендуемый)

1. **Day 1 Morning:** Phase 1 (Database) + Phase 2 (Types)
2. **Day 1 Afternoon:** Phase 3 (Repos) + Phase 4 (Telegram Bot)
3. **Day 2 Morning:** Phase 5 (Core Service)
4. **Day 2 Afternoon:** Phase 6 (Event Integration) + Phase 7 (API Routes)
5. **Day 3 Morning:** Phase 8 (Frontend UI)
6. **Day 3 Afternoon:** Phase 9 (Deployment) + Phase 10 (Testing)
7. **Final:** Phase 11 (Documentation)

**Итого:** 3 дня для полной реализации

---

## 💡 Советы

1. **Начните с миграций** - база данных - это foundation
2. **Тестируйте постепенно** - после каждой Phase проверяйте что всё работает
3. **Не забудьте про error handling** - особенно для Telegram API
4. **Логируйте всё** - это поможет при debugging
5. **Rate limiting** - не спамьте Telegram API (используйте `scheduled_for`)

**Удачи!** 🚀
