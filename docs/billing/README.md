# 💳 Billing System v2.0

Полная документация по платежной системе Need4Trip.

---

## 📋 Содержание

### 1. [Billing Specification](./billing-spec.md) ⭐
**Главный документ** - полная спецификация billing v2.0:
- Продуктовые правила и бизнес-логика
- Тарифные планы (Free, Club 50, Club 500, Unlimited)
- Схема базы данных
- Enforcement алгоритмы
- Paywall формат ошибок

### 2. [Frontend Integration](./frontend-integration.md)
Интеграция billing с фронтендом:
- `useClubPlan()` hook
- Динамические лимиты в формах
- PaywallModal компонент
- Обработка 402 ошибок

### 3. [Billing Audit Report](../../BILLING_AUDIT_REPORT.md) ✅
**Audit v2.1** - полная проверка целостности системы:
- Отсутствие хардкода (verified)
- Проверка всех enforcement points
- Консистентность данных
- Результаты и исправления

---

## 🎯 Quick Start

### Для продакт-менеджеров:
1. Читай [Billing Specification](./billing-spec.md)
2. Смотри таблицу тарифов (раздел 2)
3. Изучи продуктовые правила (раздел 2)

### Для фронтенд разработчиков:
1. Читай [Frontend Integration](./frontend-integration.md)
2. Используй `useClubPlan(clubId)` hook
3. Обрабатывай 402 Paywall ошибки

### Для бэкенд разработчиков:
1. Читай [Billing Specification](./billing-spec.md)
2. Используй `enforceClubAction()` перед операциями
3. Возвращай `PaywallError` при превышении лимитов

---

## 💰 Тарифные планы

| План | Участники/событие | Члены клуба | Paid events | CSV | Цена |
|------|------------------|-------------|-------------|-----|------|
| **Free** | 15 | - | ❌ | ❌ | 0 ₸ |
| **Club 50** | 50 | 50 | ✅ | ✅ | 3 490 ₸/мес |
| **Club 500** | 500 | 500 | ✅ | ✅ | 11 990 ₸/мес |
| **Unlimited** | ∞ | ∞ | ✅ | ✅ | Индивидуально |

---

## 🏗️ Архитектура

### Backend Enforcement:

```typescript
// API endpoint
export async function POST(request: Request) {
  const parsed = eventCreateSchema.parse(input);
  
  // ⚡ Check billing limits
  await enforceClubAction({
    clubId: parsed.clubId,
    action: "CLUB_CREATE_EVENT",
    context: {
      eventParticipantsCount: parsed.maxParticipants,
      isPaidEvent: parsed.isPaid,
    },
  });
  
  // If passes - create event
  const event = await createEvent(parsed);
  return respondSuccess(event);
}
```

### Frontend Integration:

```typescript
// Component
const { limits } = useClubPlan(clubId);
const maxAllowed = limits?.maxEventParticipants ?? 15;

// Validation
if (participantsCount > maxAllowed) {
  error = `Максимум для вашего плана: ${maxAllowed}`;
}

// Paywall handling
const { showPaywall, PaywallModalComponent } = usePaywall();

try {
  await createEvent(...);
} catch (err) {
  if (err.status === 402) {
    showPaywall(err.data.error.details);
  }
}
```

---

## 🗄️ Database Schema

### Core Tables:

**`club_plans`** - тарифные планы
- `id` (club_50, club_500, unlimited)
- `title`, `price_monthly_kzt`
- `max_members`, `max_event_participants`
- `allow_paid_events`, `allow_csv_export`

**`club_subscriptions`** - подписки клубов
- `club_id`, `plan_id`
- `status` (pending, active, grace, expired)
- `current_period_start/end`
- `grace_until`

**`billing_policy`** - правила биллинга
- `grace_period_days` (7)
- `pending_ttl_minutes` (60)

**`billing_policy_actions`** - разрешения по статусам
- Что можно делать в pending/grace/expired

**`billing_transactions`** - история платежей
- Аудит всех транзакций
- Не влияет на доступ (только подписка)

---

## 🔐 Enforcement Algorithm

```
1. Load club subscription from DB
   └─> If null → Free plan

2. Load plan details from DB
   └─> Get limits (maxMembers, maxEventParticipants, etc.)

3. Check subscription status
   └─> If active → check plan limits only
   └─> If grace/pending/expired → check billing_policy_actions

4. Apply plan limits
   ├─> maxMembers (null = unlimited)
   ├─> maxEventParticipants (null = unlimited)
   ├─> allowPaidEvents (boolean)
   └─> allowCsvExport (boolean)

5. If violated → throw PaywallError (402)
   └─> Frontend catches and shows PaywallModal
```

---

## 📊 Paywall Format

### Backend Response (402):

```json
{
  "success": false,
  "error": {
    "code": "PAYWALL",
    "message": "...",
    "details": {
      "code": "PAYWALL",
      "reason": "MAX_EVENT_PARTICIPANTS_EXCEEDED",
      "currentPlanId": "club_50",
      "requiredPlanId": "club_500",
      "meta": {
        "requested": 120,
        "limit": 50
      },
      "cta": {
        "type": "OPEN_PRICING",
        "href": "/pricing"
      }
    }
  }
}
```

### Frontend Modal:

```
┌──────────────────────────────────────┐
│ Превышен лимит участников            │
│                                      │
│ Текущий план: Club 50                │
│ Требуется: Club 500 или выше         │
│ Запрошено: 120 / Лимит: 50           │
│                                      │
│ [Отмена] [Посмотреть тарифы →]       │
└──────────────────────────────────────┘
```

---

## 🧪 Testing

### Manual Testing:

```sql
-- Change club plan
UPDATE club_subscriptions 
SET plan_id = 'club_50', status = 'active'
WHERE club_id = '...';

-- Test limits
-- Try creating event with 51 participants
-- Should get 402 error
```

### Test Scenarios:

- [ ] Free: can't create event >15 participants
- [ ] Free: can't create paid event
- [ ] Free: can't export CSV
- [ ] Club 50: can create up to 50 participants
- [ ] Club 500: can create up to 500 participants
- [ ] Unlimited: can create any size event
- [ ] Expired subscription: all actions blocked

---

## 📚 Документация

### Specs:
- **[billing-spec.md](./billing-spec.md)** - Полная спецификация (source of truth)
- **[frontend-integration.md](./frontend-integration.md)** - Интеграция с фронтендом

### Implementation:
- `src/lib/services/accessControl.ts` - Enforcement logic
- `src/lib/db/planRepo.ts` - Plans repository
- `src/lib/db/clubSubscriptionRepo.ts` - Subscriptions repository
- `src/lib/db/billingPolicyRepo.ts` - Policy repository
- `src/hooks/use-club-plan.ts` - Frontend hook
- `src/components/billing/PaywallModal.tsx` - Paywall UI

---

## 🚀 Deployment Status

- ✅ Database schema deployed
- ✅ Backend enforcement implemented
- ✅ Frontend integration complete
- ✅ PaywallModal working
- ✅ All tests passing
- 🟢 **Production Ready**

---

## 📝 History

- **v1.0** (декабрь 2024) - Initial implementation
- **v2.0** (декабрь 2024) - Complete rewrite with DB-driven limits

---

**Last Updated:** 16 декабря 2024  
**Version:** 2.0  
**Status:** Production Ready ✅
