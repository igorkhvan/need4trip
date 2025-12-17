# 🔥 Notification System - Production-Ready Implementation

## ✅ Implementation Complete!

Full notification system with **hardening**, **extensibility**, and **city-based filtering**.

---

## 🎯 What Was Implemented

### 1. **Canonical Type System** (Single Source of Truth)
- ✅ `src/lib/constants/notificationTypes.ts`
- 6 notification types with labels, descriptions, defaults
- Used everywhere: DB, TypeScript, UI, formatters
- Easy to add new types

### 2. **Database Hardening** 
- ✅ `supabase/migrations/20241217_notification_system_hardening.sql`
- **Deduplication:** `dedupe_key` + unique index
- **Parallel-safe:** `processing` status + `locked_by` + `locked_at`
- **Event versioning:** Auto-increment `events.version`
- **Dead letter queue:** `moved_to_dlq_at` tracking
- **Helper functions:** `claim_pending_notifications()`, `move_to_dead_letter_queue()`, `reset_stuck_notifications()`

### 3. **TypeScript Types**
- ✅ `src/lib/types/notification.ts`
- Aligned with DB schema & canonical constants
- Payload types for structured data
- `buildDedupeKey()` with patterns per type

### 4. **Repositories**
- ✅ `src/lib/db/notificationQueueRepo.ts` - Queue management with hardening
- ✅ `src/lib/db/notificationSettingsRepo.ts` - User preferences + city-based filtering

### 5. **Formatter Registry** (Extensibility Core!)
- ✅ `src/lib/services/telegram/formatters.ts`
- Registry pattern: `Record<NotificationType, Formatter>`
- **Add new type = 1 line in registry + 1 formatter function**
- Inline keyboard buttons (better UX)

### 6. **Telegram Bot**
- ✅ `src/lib/services/telegram/bot.ts`
- Inline keyboard support
- Smart retry logic
- Error classification (retryable vs non-retryable)

### 7. **Notification Service**
- ✅ `src/lib/services/notifications.ts`
- `queueNewEventNotifications()` - **city-based filtering**
- `queueNewParticipantNotification()` - for organizers
- `processNotificationQueue()` - worker with parallel-safe claiming
- `resetStuckNotificationsTask()` - recovery

### 8. **Cron Endpoint**
- ✅ `src/app/api/cron/process-notifications/route.ts`
- Protected by `CRON_SECRET`
- Processes 50 notifications every 5 minutes
- Returns stats + duration

---

## 🏗️ Architecture Highlights

### A) Dedupe Strategy
```
EVENT_UPDATED         → event_updated:{eventId}:{version}:{userId}
NEW_EVENT_PUBLISHED   → new_event_published:{eventId}:{userId}
NEW_PARTICIPANT_JOINED → new_participant_joined:{eventId}:{registrationId}:{organizerId}
EVENT_CANCELLED       → event_cancelled:{eventId}:{userId}
EVENT_REMINDER        → event_reminder:{eventId}:{userId}
```

### B) Parallel-Safe Claiming
```sql
WITH picked AS (
  SELECT id
  FROM notification_queue
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY scheduled_for
  FOR UPDATE SKIP LOCKED  -- ← Parallel-safe!
  LIMIT 50
)
UPDATE notification_queue q
SET status = 'processing',
    locked_at = now(),
    locked_by = 'worker-xyz'
FROM picked
WHERE q.id = picked.id
RETURNING q.*;
```

### C) City-based Query
```typescript
SELECT u.id, u.telegram_id
FROM users u
JOIN user_notification_settings s ON s.user_id = u.id
WHERE u.city_id = :eventCityId
  AND s.is_telegram_enabled = TRUE
  AND s.notify_new_event_published = TRUE
  AND u.id != :eventCreatorId
  AND u.telegram_id IS NOT NULL;
```

### D) Formatter Registry
```typescript
const formatters: Record<NotificationType, Formatter> = {
  [NotificationType.EVENT_UPDATED]: formatEventUpdated,
  [NotificationType.NEW_EVENT_PUBLISHED]: formatNewEventPublished,
  [NotificationType.NEW_PARTICIPANT_JOINED]: formatNewParticipantJoined,
  [NotificationType.EVENT_CANCELLED]: formatEventCancelled,
  [NotificationType.EVENT_REMINDER]: formatEventReminder,
  [NotificationType.ORGANIZER_MESSAGE]: formatOrganizerMessage,
};

// Use it:
const message = formatNotification(type, payload);
```

---

## 📊 Acceptance Criteria

### Functional ✅
- ✅ City-based new event notifications (uses `city_id`)
- ✅ Event updated notifications (with versioning)
- ✅ New participant notifications (to organizer)
- ✅ Easy extensibility (add type = enum + formatter + setting)

### Non-functional ✅
- ✅ No duplicates (`dedupe_key` + unique index)
- ✅ Safe parallel workers (`FOR UPDATE SKIP LOCKED`)
- ✅ No Redis (Postgres queue + cron)
- ✅ Clean enums (canonical types everywhere)
- ✅ Resilient (retry + DLQ + recovery)

---

## 🚀 How to Use

### 1. Apply Migration
```bash
# Connect to Supabase
supabase db push

# Or apply via dashboard
# Upload: supabase/migrations/20241217_notification_system_hardening.sql
```

### 2. Set Environment Variables
```bash
# Vercel Dashboard → Settings → Environment Variables
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
CRON_SECRET=random_secure_string_32_chars
NEXT_PUBLIC_APP_URL=https://need4trip.kz
```

### 3. Deploy to Vercel
```bash
git push origin main

# Vercel will automatically:
# - Set up cron job (every 5 minutes)
# - Deploy API routes
# - Apply environment variables
```

### 4. Test
```bash
# Check queue stats
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://need4trip.kz/api/cron/process-notifications

# Trigger manual processing
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://need4trip.kz/api/cron/process-notifications
```

---

## 🔧 Adding a New Notification Type

**Example:** Add "PARTICIPANT_REMOVED" notification

### Step 1: Add to Canonical Types
```typescript
// src/lib/constants/notificationTypes.ts
export const NotificationType = {
  // ... existing types
  PARTICIPANT_REMOVED: 'participant_removed',
} as const;

export const NotificationTypeLabel = {
  // ... existing labels
  [NotificationType.PARTICIPANT_REMOVED]: 'Удален участник',
};
```

### Step 2: Update DB Enum
```sql
ALTER TYPE notification_trigger 
ADD VALUE IF NOT EXISTS 'participant_removed';

ALTER TABLE user_notification_settings
ADD COLUMN IF NOT EXISTS notify_participant_removed BOOLEAN DEFAULT TRUE;
```

### Step 3: Create Payload Type
```typescript
// src/lib/types/notification.ts
export interface ParticipantRemovedPayload {
  eventId: string;
  eventTitle: string;
  participantName: string;
  eventUrl: string;
  settingsUrl: string;
}
```

### Step 4: Add Formatter
```typescript
// src/lib/services/telegram/formatters.ts
export const formatParticipantRemoved: Formatter<ParticipantRemovedPayload> = (payload) => {
  const { eventTitle, participantName, eventUrl, settingsUrl } = payload;
  
  return {
    text: `👋 <b>Участник покинул событие</b>\n\n📌 ${eventTitle}\n\n❌ ${participantName} отменил регистрацию`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '👉 Открыть событие', url: eventUrl },
        { text: '⚙️ Настройки', url: settingsUrl },
      ]],
    },
  };
};

// Add to registry
export const formatters: Record<NotificationType, Formatter> = {
  // ... existing formatters
  [NotificationType.PARTICIPANT_REMOVED]: formatParticipantRemoved,
};
```

### Step 5: Queue Notifications
```typescript
// src/lib/services/notifications.ts
export async function queueParticipantRemovedNotification(params) {
  const payload: ParticipantRemovedPayload = {
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    participantName: params.participantName,
    eventUrl: `${baseUrl}/events/${params.eventId}`,
    settingsUrl: `${baseUrl}/profile/notifications`,
  };

  return await addToQueue({
    eventId: params.eventId,
    userId: params.organizerId,
    triggerType: NotificationType.PARTICIPANT_REMOVED,
    telegramChatId: params.organizerTelegramId,
    payload,
  });
}
```

**Done!** The system will automatically:
- Format messages using the new formatter
- Deduplicate based on type
- Process with existing worker
- Respect user settings

---

## 📈 Monitoring

### Queue Stats
```typescript
import { getQueueStats } from '@/lib/db/notificationQueueRepo';

const stats = await getQueueStats();
// { pending: 10, processing: 2, sent: 150, failed: 3 }
```

### Cron Logs
```
Vercel Dashboard → Deployments → Functions
→ /api/cron/process-notifications
→ View logs
```

### Database Queries
```sql
-- Pending notifications
SELECT COUNT(*) FROM notification_queue WHERE status = 'pending';

-- Failed in last hour
SELECT * FROM notification_queue 
WHERE status = 'failed' 
AND created_at >= NOW() - INTERVAL '1 hour';

-- Success rate by type (last 24h)
SELECT 
  trigger_type,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM notification_logs
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY trigger_type;
```

---

## 🎉 Benefits

1. **No Duplicates** - Unique `dedupe_key` per notification
2. **Parallel-safe** - Multiple workers can run simultaneously
3. **City-based** - Efficient filtering by `city_id`
4. **Extensible** - Add new types without schema redesign
5. **Resilient** - Retry + DLQ + recovery
6. **Better UX** - Inline keyboard buttons vs markdown links
7. **Maintainable** - Single source of truth for types
8. **Observable** - Full stats + logs + monitoring

---

## 🚧 Future Enhancements

1. **Rate Limiting** - Per-user throttling (optional)
2. **Batching** - Group multiple updates into one message
3. **Digest Mode** - Daily summary of events
4. **User Timezone** - Send at optimal time
5. **A/B Testing** - Test message variants
6. **Analytics** - Click-through tracking
7. **Web Push** - Browser notifications
8. **Email Fallback** - If no Telegram ID

---

## 📚 Files Overview

```
src/
├── lib/
│   ├── constants/
│   │   └── notificationTypes.ts          # Canonical types
│   ├── types/
│   │   └── notification.ts               # TypeScript types
│   ├── db/
│   │   ├── notificationQueueRepo.ts      # Queue management
│   │   └── notificationSettingsRepo.ts   # User preferences
│   └── services/
│       ├── notifications.ts              # Core service
│       └── telegram/
│           ├── bot.ts                    # Telegram API
│           └── formatters.ts             # Formatter registry
└── app/
    └── api/
        └── cron/
            └── process-notifications/
                └── route.ts              # Cron endpoint

supabase/
└── migrations/
    └── 20241217_notification_system_hardening.sql  # DB migration
```

---

**Total Lines:** ~1900 lines of production-ready code! 🚀

**Commit:** `0c784a8` - feat: notification system hardening & extensibility
