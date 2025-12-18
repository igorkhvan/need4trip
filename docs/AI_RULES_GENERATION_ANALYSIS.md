# AI Rules Generation - Behavior Analysis

## 📋 Current State

### 1. **Flow Overview**

```
User clicks "Сгенерировать правила (ИИ)" button
    ↓
handleAiButtonClick() executed
    ↓
Validation Check (title, categoryId, cityId)
    ↓
    ├─ ❌ FAIL → Set field errors, return (button appears disabled)
    │
    └─ ✅ PASS → setShowAiConfirmDialog(true)
                    ↓
                 Show "Рекомендуется заполнить всю форму" dialog
                    ↓
                 User clicks "Продолжить генерацию"
                    ↓
                 handleGenerateRules() → API call
```

### 2. **Current Validation Logic** (lines 315-332)

```typescript
const handleAiButtonClick = () => {
  // Validate required fields first
  if (!title.trim() || !categoryId || !cityId) {
    if (!title.trim()) {
      setFieldErrors(prev => ({ ...prev, title: "Укажите название события" }));
    }
    if (!categoryId) {
      setFieldErrors(prev => ({ ...prev, categoryId: "Выберите категорию" }));
    }
    if (!cityId) {
      setFieldErrors(prev => ({ ...prev, cityId: "Выберите город" }));
    }
    return; // ❌ Silent fail - no feedback to user
  }
  
  // Show confirmation dialog
  setShowAiConfirmDialog(true); // ⚠️ Always shown if validation passes
};
```

### 3. **Current Dialogs**

#### Dialog 1: "Рекомендуется заполнить всю форму" (lines 660-692)
- **Trigger:** Always shown when required fields ARE filled
- **Purpose:** Recommend filling optional fields
- **Actions:** "Отмена" | "Продолжить генерацию"
- **Content:**
  - Рекомендуется заполнить всю форму
  - Список данных (название, категория, тип авто, марки, поля, платность)
  - "Чем больше информации, тем точнее правила"

#### Dialog 2: MISSING - Required Fields Error
- **Should trigger:** When required fields are NOT filled
- **Current behavior:** Silent fail + red borders on fields
- **Problem:** User doesn't understand WHY button doesn't work

---

## 🎯 Required Changes

### **User Requirements (UPDATED):**

1. **✅ Keep:** "Рекомендуется заполнить всю форму" dialog (existing)
   - When required fields ARE filled → show confirmation dialog
   - User can proceed or cancel
   
2. **✅ Add:** "Заполните обязательные поля" dialog (new)
   - When required fields are NOT filled → show error dialog
   - **SIMPLIFIED:** Only check 3 basic fields (title, categoryId, cityId)
   - **Ignore custom fields** - not validated for AI generation

**Both dialogs coexist:** Error dialog for missing fields, Confirmation dialog for filled fields

---

## 🔧 Proposed Solution

### **New Flow (TWO DIALOGS):**

```
User clicks "Сгенерировать правила (ИИ)" button
    ↓
handleAiButtonClick() executed
    ↓
Validation Check (title, categoryId, cityId)
    ↓
    ├─ ❌ FAIL → Show NEW "Заполните обязательные поля" AlertDialog
    │               - Title: "Заполните обязательные поля"
    │               - Description: List of missing fields
    │               - Action: "Понятно" (close dialog)
    │
    └─ ✅ PASS → Show EXISTING "Рекомендуется заполнить всю форму" AlertDialog
                    - Title: "Генерация правил с помощью ИИ"
                    - Description: Recommendations to fill optional fields
                    - Actions: "Отмена" | "Продолжить генерацию"
                        ↓
                     User clicks "Продолжить генерацию"
                        ↓
                     handleGenerateRules() → API call
```

### **Implementation Plan:**

#### **Step 1:** Keep existing confirmation dialog
- ✅ Keep `showAiConfirmDialog` state (line 157)
- ✅ Keep AlertDialog JSX block (lines 660-692)
- No changes to existing dialog

#### **Step 2:** Add error dialog state
```typescript
const [showRequiredFieldsDialog, setShowRequiredFieldsDialog] = useState(false);
const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
```

#### **Step 3:** Update `handleAiButtonClick()` logic
```typescript
const handleAiButtonClick = () => {
  // Build list of missing required fields
  const missing: string[] = [];
  
  // Check basic required fields ONLY
  if (!title.trim()) {
    missing.push("Название события");
    setFieldErrors(prev => ({ ...prev, title: "Укажите название события" }));
  }
  if (!categoryId) {
    missing.push("Категория события");
    setFieldErrors(prev => ({ ...prev, categoryId: "Выберите категорию" }));
  }
  if (!cityId) {
    missing.push("Город");
    setFieldErrors(prev => ({ ...prev, cityId: "Выберите город" }));
  }
  
  // If any required fields are missing, show error dialog
  if (missing.length > 0) {
    setMissingFieldsList(missing);
    setShowRequiredFieldsDialog(true);
    return;
  }
  
  // All required fields are filled - show confirmation dialog
  setShowAiConfirmDialog(true);
};
```

**Logic:**
- Only 3 basic fields checked: title, categoryId, cityId
- Custom fields are NOT validated for AI generation
- Custom fields will still be sent to API but not required for button to work

#### **Step 4:** Add new error dialog JSX
```tsx
{/* 🚫 Required Fields Error Dialog */}
<AlertDialog open={showRequiredFieldsDialog} onOpenChange={setShowRequiredFieldsDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Заполните обязательные поля</AlertDialogTitle>
      <AlertDialogDescription className="space-y-3 text-left">
        <p>
          Для генерации правил необходимо заполнить следующие обязательные поля:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {missingFieldsList.map((field, idx) => (
            <li key={idx}>{field}</li>
          ))}
        </ul>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction onClick={() => setShowRequiredFieldsDialog(false)}>
        Понятно
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## ✅ Benefits

### **User Experience:**
1. **Clear feedback:** User immediately understands what's missing
2. **No unnecessary clicks:** When ready, generation starts immediately
3. **Consistent with UI patterns:** Uses existing `AlertDialog` component

### **Code Quality:**
1. **No architecture changes:** Uses existing dialog system
2. **Type-safe:** All types already in place
3. **No temporary solutions:** Clean implementation
4. **Maintains validation logic:** Error borders + dialog feedback

---

## 📊 Files to Modify

1. **`src/components/events/event-form.tsx`**
   - Remove: `showAiConfirmDialog` state
   - Add: `showRequiredFieldsDialog`, `missingFieldsList` states
   - Update: `handleAiButtonClick()` logic
   - Remove: Old confirmation dialog JSX (lines 659-692)
   - Add: New error dialog JSX

---

## 🧪 Testing Checklist

### Scenario 1: Missing Required Fields
- [ ] Click AI button with empty title
- [ ] Verify error dialog appears
- [ ] Verify "Название события" in missing fields list
- [ ] Verify field has red border
- [ ] Click "Понятно" → dialog closes
- [ ] Fill title, category, city
- [ ] Click AI button again → immediate generation (no dialog)

### Scenario 2: All Required Fields Filled
- [ ] Fill title, category, city
- [ ] Click AI button
- [ ] Verify NO dialog appears
- [ ] Verify generation starts immediately (loading spinner)
- [ ] Verify rules appear in textarea after success

### Scenario 3: Button Disabled States
- [ ] Verify button disabled during `isGeneratingRules`
- [ ] Verify button disabled during `isSubmitting`
- [ ] Verify button disabled when `disabled` prop is true

---

## 🎯 Success Criteria

✅ **User clicks AI button with missing fields:**
   - Error dialog appears
   - Lists specific missing fields
   - One "Понятно" button
   - Fields have red borders

✅ **User clicks AI button with all required fields:**
   - NO dialog appears
   - Generation starts immediately
   - Loading state shows
   - Rules populate on success

✅ **Code quality:**
   - 0 TypeScript errors
   - No architecture violations
   - No temporary solutions
   - Follows existing patterns

---

## 📝 Notes

### **Required Fields Logic (SIMPLIFIED):**

**Only 3 basic fields:**
- `title` (Название события)
- `categoryId` (Категория события)
- `cityId` (Город)

**Custom fields:**
- NOT checked for AI generation
- Still validated on form submit (unchanged)
- Still sent to API in payload (unchanged)

### **Important:**
- Custom fields are ignored for AI button availability
- User can generate rules even if custom fields have no labels
- Custom fields validation only happens on form submit
- API payload unchanged (already includes all fields)
- Toast notification on success (unchanged)
- Error handling for API failures (unchanged)
