# SSOT_UI_COPY.md

> **Single Source of Truth — UI Copy & Microcopy**
>
> Version: 1.0 (Skeleton)  
> Status: Canonical  
> Scope: UI / UX / Product  
> Applies to: Web, Mobile Web, Admin UI  
> Language baseline: RU (primary), EN (secondary, parity required)

---

## 0. Purpose & Scope

This document defines **canonical rules for all UI text**:
- loading copy
- empty states
- error messages
- forbidden / access denied
- pending / processing
- success confirmations
- retry & recovery actions

❗ **No UI-facing text may be introduced outside this SSOT.**  
❗ **No “temporary”, “inline”, or “just here” copy is allowed.**

---

## 1. Core Copy Principles (Non-Negotiable)

### 1.1 Clarity over friendliness
- UI copy must be **clear, literal, and unambiguous**
- No metaphors, jokes, or emotional language

✅ Correct  
> «Не удалось загрузить события»

❌ Forbidden  
> «Что-то пошло не так 😕»

---

### 1.2 One message — one meaning
- Each message conveys **exactly one state**
- No combined meanings (error + hint + emotion)

❌ Forbidden  
> «Ошибка загрузки. Проверьте интернет и попробуйте позже»

---

### 1.3 User-oriented, not system-oriented
- Do NOT mention:
  - servers
  - APIs
  - databases
  - internal errors

❌ Forbidden  
> «Ошибка 500»  
> «Ошибка API»

---

### 1.4 No ellipsis by default
Ellipsis (`…`) is **forbidden**, except:
- active progress indicators
- background operations

---

## 2. Loading & Pending Copy

### 2.1 Global Rules

- Loading copy must:
  - be **short**
  - describe **process**, not state
- Prefer **visual loading** over text

---

### 2.2 Canonical Loading Copy

| Context | Allowed Copy |
|------|-------------|
| Button (action) | `Сохранение…` |
| Button (submit) | `Отправка…` |
| Page/Section | ❌ No text |
| Inline async | ❌ No text |

❌ Forbidden:
- `Загрузка данных`
- `Пожалуйста, подождите`
- `Идёт загрузка`

---

## 3. Empty State Copy

### 3.1 Rules

- Empty ≠ Error
- Empty copy must:
  - state absence
  - optionally suggest **next action**
- No blame, no explanation

---

### 3.2 Canonical Patterns

| Type | Title | Description |
|----|------|------------|
| Generic | `Пока нет данных` | — |
| No items | `Пока нет событий` | — |
| No results | `Ничего не найдено` | `Попробуйте изменить фильтр` |
| First action | `Пока нет клубов` | `Создайте первый клуб` |

❌ Forbidden:
- `Здесь будет…`
- `Скоро появится`
- `Мы работаем над этим`

---

## 4. Error State Copy

### 4.1 Rules

- Error copy must:
  - acknowledge failure
  - be neutral
  - avoid technical detail
- No apologies on behalf of system

---

### 4.2 Canonical Error Messages

| Context | Copy |
|------|------|
| Generic fetch | `Не удалось загрузить данные` |
| Save / update | `Не удалось сохранить изменения` |
| Action failed | `Действие не выполнено` |
| Unknown | `Произошла ошибка` |

---

### 4.3 Retry Copy

Allowed:
- `Попробовать снова`
- `Повторить`

❌ Forbidden:
- `Обновите страницу`
- `Попробуйте позже`
- `Свяжитесь с поддержкой`

---

## 5. Forbidden / Access Denied Copy

### 5.1 Rules

- Forbidden is **not an error**
- Copy must:
  - state restriction
  - optionally explain condition

---

### 5.2 Canonical Forbidden Copy

| Context | Title | Description |
|------|------|------------|
| Generic | `Доступ ограничен` | — |
| Membership | `Нет доступа` | `Вступите в клуб, чтобы продолжить` |
| Archived | `Клуб в архиве` | `Действия недоступны` |

CTA:
- `Вернуться`
- `К списку`

❌ Forbidden:
- `Ошибка доступа`
- `У вас недостаточно прав`

---

## 6. Success & Confirmation Copy

### 6.1 Rules

- Success copy must be:
  - short
  - factual
- No celebration language

---

### 6.2 Canonical Success Copy

| Context | Copy |
|------|------|
| Save | `Изменения сохранены` |
| Create | `Успешно создано` |
| Action | `Готово` |

❌ Forbidden:
- `Успех!`
- `Отлично!`
- `Поздравляем`

---

## 7. Pending / Intermediate States

### 7.1 Rules

- Pending ≠ Loading
- Used only when **user action is waiting for resolution**

---

### 7.2 Canonical Pending Copy

| Context | Copy |
|------|------|
| Join request | `Ожидает одобрения` |
| Review | `На рассмотрении` |

❌ Forbidden:
- `В процессе`
- `Скоро будет`

---

## 7.3 Beta Paywall (SOFT_BETA_STRICT)

| Context | Copy |
|------|------|
| Beta paywall title | `Платная функция` |
| Beta paywall message | `Создание события на {N} участников требует оплаты. В бета-версии действие доступно без оплаты.` |
| Beta primary CTA | `Продолжить` |
| Beta cancel | `Отмена` |
| Beta error (loop) title | `Действие не выполнено` |
| Beta error (loop) message | `Не удалось выполнить действие. Повторная попытка невозможна.` |
| Beta pending | `Сохранение…` |

Source: `src/lib/billing/ui/reasonMapping.ts` (BETA_PAYWALL_COPY)

---

## 7.4 Beta Participant Limit Modal

| Context | Copy |
|------|------|
| Beta participant limit title | `Ограничение бета-версии` |
| Beta participant limit message | `В бета-версии максимальное количество участников события — 500.` |
| Beta participant limit primary action | `Понятно` |

Source: `src/lib/config/betaParticipantLimit.ts` (BETA_PARTICIPANT_LIMIT_COPY)

Rules:
- This modal is NOT a paywall. No billing, pricing, upgrade, or club references.
- Shown only when `PAYWALL_MODE=soft_beta_strict` AND participant count > 500.
- Single primary action only (acknowledge). No secondary action.
- Copy must NOT reference payment, subscription, club, or upgrade.

---

## 8. Language & Localization Rules

- RU is **source of truth**
- EN must be:
  - semantically identical
  - not stylistically “nicer”
- No mixed-language UI

---

## 9. Explicitly Forbidden Copy Patterns

- Emojis
- Exclamation marks
- Marketing language
- Human emotions
- Time promises (`скоро`, `позже`)
- System explanations

---

## 10. Enforcement

- Any UI text not matching this SSOT is a **blocking violation**
- No PR may introduce new copy without SSOT update
- Cursor / Kilo must reference this file when generating UI text

---

END OF DOCUMENT
