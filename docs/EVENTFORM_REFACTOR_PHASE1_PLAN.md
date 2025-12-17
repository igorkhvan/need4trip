# EventForm Refactor - Phase 1 (MVP) Plan

**Date:** 2024-12-17  
**Duration:** 3 hours estimated  
**Goal:** Extract 5 section components from monolithic EventForm  
**Risk:** LOW-MEDIUM  
**Breaking Changes:** ZERO

---

## 🎯 Objective

Split EventForm (1161 lines) into:
- 1 orchestrator component (200 lines)
- 5 section components (100-250 lines each)
- Zero breaking changes to external API

---

## 📋 Implementation Steps

### Step 1: Create Directory Structure (5 min)

**Actions:**
```bash
mkdir -p src/components/events/event-form/sections
touch src/components/events/event-form/sections/EventBasicInfoSection.tsx
touch src/components/events/event-form/sections/EventPricingSection.tsx
touch src/components/events/event-form/sections/EventVehicleSection.tsx
touch src/components/events/event-form/sections/EventRulesSection.tsx
touch src/components/events/event-form/sections/EventCustomFieldsSection.tsx
touch src/components/events/event-form/index.ts
```

**Verification:**
- [ ] All files created
- [ ] Directory structure correct

---

### Step 2: Extract EventBasicInfoSection (45 min)

**Source:** Lines ~510-720 of event-form.tsx (Card 1)

**Component Interface:**
```typescript
interface EventBasicInfoSectionProps {
  // Form values
  title: string;
  description: string;
  categoryId: string | null;
  dateTime: string;
  cityId: string | null;
  locationText: string;
  maxParticipants: number | null;
  visibility: Visibility;
  isClubEvent: boolean;
  
  // Change handlers
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onDateTimeChange: (value: string) => void;
  onCityChange: (value: string | null) => void;
  onLocationChange: (value: string) => void;
  onMaxParticipantsChange: (value: number | null) => void;
  onVisibilityChange: (value: Visibility) => void;
  onIsClubEventChange: (value: boolean) => void;
  
  // External data
  categories: EventCategoryDto[];
  loadingCategories: boolean;
  
  // Club limits (for maxParticipants)
  clubLimits: { maxEventParticipants: number | null } | null;
  loadingPlan: boolean;
  
  // Validation
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  
  // UI state
  disabled?: boolean;
  club?: Club | null;
}
```

**Fields Included:**
- Title input
- Description textarea
- City autocomplete
- DateTime input
- Location text input
- MaxParticipants input (with club limit)
- Category select
- Visibility select
- IsClubEvent checkbox

**Implementation:**
1. Copy Card 1 JSX (~200 lines)
2. Add props interface
3. Replace direct state access with props
4. Replace setters with onChange callbacks
5. Test rendering
6. Test validation
7. Test onChange handlers

**Checklist:**
- [ ] Component created
- [ ] Props interface defined
- [ ] All fields render
- [ ] Validation errors display
- [ ] onChange handlers work
- [ ] Club limits display
- [ ] Disabled state works
- [ ] TypeScript 0 errors

---

### Step 3: Extract EventPricingSection (30 min)

**Source:** Lines ~757-853 of event-form.tsx (Pricing part of Card 1)

**Component Interface:**
```typescript
interface EventPricingSectionProps {
  // Form values
  isPaid: boolean;
  price: string;
  currencyCode: string | null;
  
  // Change handlers
  onIsPaidChange: (value: boolean) => void;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: string | null) => void;
  
  // Validation
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  
  // UI state
  disabled?: boolean;
}
```

**Fields Included:**
- IsPaid radio buttons (Free/Paid)
- Price input (conditional on isPaid)
- Currency select (conditional on isPaid)

**Implementation:**
1. Copy pricing JSX (~100 lines)
2. Add props interface
3. Replace state with props
4. Handle conditional rendering (isPaid)
5. Test radio buttons
6. Test conditional fields

**Checklist:**
- [ ] Component created
- [ ] Props interface defined
- [ ] Radio buttons work
- [ ] Conditional rendering works
- [ ] Validation errors display
- [ ] onChange handlers work
- [ ] TypeScript 0 errors

---

### Step 4: Extract EventVehicleSection (20 min)

**Source:** Lines ~857-906 of event-form.tsx (Card 2)

**Component Interface:**
```typescript
interface EventVehicleSectionProps {
  // Form values
  vehicleType: VehicleTypeRequirement;
  allowedBrandIds: string[];
  
  // Change handlers
  onVehicleTypeChange: (value: VehicleTypeRequirement) => void;
  onAllowedBrandsChange: (value: string[]) => void;
  
  // External data
  brands: MultiBrandSelectOption[];
  vehicleTypes: Array<{ value: string; label: string }>;
  
  // Validation
  fieldErrors: Record<string, string>;
  
  // UI state
  disabled?: boolean;
}
```

**Fields Included:**
- VehicleType select
- MultiBrandSelect (allowed brands)

**Implementation:**
1. Copy Card 2 JSX (~50 lines)
2. Add props interface
3. Replace state with props
4. Test selects

**Checklist:**
- [ ] Component created
- [ ] Props interface defined
- [ ] VehicleType select works
- [ ] MultiBrandSelect works
- [ ] TypeScript 0 errors

---

### Step 5: Extract EventRulesSection (30 min)

**Source:** Lines ~908-952 of event-form.tsx (Card 3)

**Component Interface:**
```typescript
interface EventRulesSectionProps {
  // Form value
  rules: string;
  onRulesChange: (value: string) => void;
  
  // AI generation
  onGenerateAi: () => void;
  isGeneratingRules: boolean;
  
  // UI state
  disabled?: boolean;
  isSubmitting: boolean;
}
```

**Fields Included:**
- Rules textarea
- AI generate button

**Implementation:**
1. Copy Card 3 JSX (~50 lines)
2. Add props interface
3. Replace state with props
4. Test textarea
5. Test AI button (call parent handler)

**Checklist:**
- [ ] Component created
- [ ] Props interface defined
- [ ] Textarea works
- [ ] AI button works
- [ ] Loading state displays
- [ ] TypeScript 0 errors

---

### Step 6: Extract EventCustomFieldsSection (45 min)

**Source:** Lines ~954-1100 of event-form.tsx (Card 4)

**Component Interface:**
```typescript
interface EventCustomFieldsSectionProps {
  // Form values
  customFields: EventCustomFieldSchema[];
  sortedFields: EventCustomFieldSchema[];
  
  // Change handlers
  onAddField: () => void;
  onUpdateField: (id: string, patch: Partial<EventCustomFieldSchema>) => void;
  onRemoveField: (id: string) => void;
  
  // Locked fields (participants exist)
  lockedFieldIds: string[];
  hasLockedFields: boolean;
  
  // Validation
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  
  // UI state
  disabled?: boolean;
}
```

**Fields Included:**
- Custom fields list
- Add field button
- Field editor (label, type, required)
- Remove field button (with locked state)

**Implementation:**
1. Copy Card 4 JSX (~150 lines)
2. Add props interface
3. Replace state with props
4. Handle locked fields logic
5. Test add/edit/remove
6. Test locked fields

**Checklist:**
- [ ] Component created
- [ ] Props interface defined
- [ ] Field list renders
- [ ] Add field works
- [ ] Edit field works
- [ ] Remove field works
- [ ] Locked fields protected
- [ ] Validation errors display
- [ ] TypeScript 0 errors

---

### Step 7: Update EventForm Orchestrator (30 min)

**Actions:**

1. **Add imports:**
```typescript
import { EventBasicInfoSection } from "./event-form/sections/EventBasicInfoSection";
import { EventPricingSection } from "./event-form/sections/EventPricingSection";
import { EventVehicleSection } from "./event-form/sections/EventVehicleSection";
import { EventRulesSection } from "./event-form/sections/EventRulesSection";
import { EventCustomFieldsSection } from "./event-form/sections/EventCustomFieldsSection";
```

2. **Replace Card JSX with section components:**
```typescript
// Card 1 → EventBasicInfoSection + EventPricingSection
<Card>
  <EventBasicInfoSection
    title={title}
    onTitleChange={setTitle}
    // ... all props
  />
  <EventPricingSection
    isPaid={isPaid}
    onIsPaidChange={setIsPaid}
    // ... all props
  />
</Card>

// Card 2 → EventVehicleSection
<Card>
  <EventVehicleSection
    vehicleType={vehicleType}
    onVehicleTypeChange={setVehicleType}
    // ... all props
  />
</Card>

// Card 3 → EventRulesSection
<Card>
  <EventRulesSection
    rules={rules}
    onRulesChange={setRules}
    onGenerateAi={handleAiButtonClick}
    isGeneratingRules={isGeneratingRules}
    // ... all props
  />
</Card>

// Card 4 → EventCustomFieldsSection
<Card>
  <EventCustomFieldsSection
    customFields={customFields}
    sortedFields={sortedFields}
    onAddField={addField}
    onUpdateField={updateField}
    onRemoveField={removeField}
    lockedFieldIds={lockedFieldIds}
    hasLockedFields={hasLockedFields}
    // ... all props
  />
</Card>
```

3. **Keep all state in EventForm** (no Context yet)
4. **Keep all functions in EventForm** (handlers passed as props)

**Checklist:**
- [ ] Imports added
- [ ] Cards replaced with sections
- [ ] All props passed correctly
- [ ] State management unchanged
- [ ] Functions unchanged
- [ ] TypeScript 0 errors

---

### Step 8: Create index.ts Export (5 min)

**File:** `src/components/events/event-form/index.ts`

```typescript
export { EventForm } from "../event-form";
export type { EventFormProps, EventFormValues } from "../event-form";

// Sections (for future use/testing)
export { EventBasicInfoSection } from "./sections/EventBasicInfoSection";
export { EventPricingSection } from "./sections/EventPricingSection";
export { EventVehicleSection } from "./sections/EventVehicleSection";
export { EventRulesSection } from "./sections/EventRulesSection";
export { EventCustomFieldsSection } from "./sections/EventCustomFieldsSection";
```

**Checklist:**
- [ ] index.ts created
- [ ] Exports correct
- [ ] No breaking changes to imports

---

### Step 9: Integration Testing (30 min)

**Test Create Flow:**

1. Navigate to `/events/create`
2. Fill form:
   - [ ] Title
   - [ ] Description
   - [ ] City (autocomplete)
   - [ ] DateTime
   - [ ] Location
   - [ ] MaxParticipants
   - [ ] Category
   - [ ] Visibility
   - [ ] IsClubEvent checkbox
3. Toggle pricing:
   - [ ] Free → Paid
   - [ ] Enter price
   - [ ] Select currency
4. Set vehicle requirements:
   - [ ] Select vehicle type
   - [ ] Select brands
5. Generate AI rules:
   - [ ] Click button
   - [ ] Confirm dialog
   - [ ] Rules populate
6. Add custom fields:
   - [ ] Add field
   - [ ] Edit label
   - [ ] Change type
   - [ ] Toggle required
   - [ ] Remove field
7. Submit:
   - [ ] Validation works
   - [ ] Success redirect
   - [ ] Event created

**Test Edit Flow:**

1. Navigate to `/events/[id]/edit` (event with participants)
2. Verify:
   - [ ] All fields populated
   - [ ] Custom fields locked (with participants)
   - [ ] Can add new fields
   - [ ] Cannot remove locked fields
3. Edit fields:
   - [ ] Title change
   - [ ] Description change
   - [ ] DateTime change
4. Submit:
   - [ ] Success
   - [ ] Changes saved

**Test Validation:**

1. Submit empty form:
   - [ ] Title error
   - [ ] Description error
   - [ ] City error
   - [ ] Location error
   - [ ] MaxParticipants error
2. Submit invalid data:
   - [ ] Past date error
   - [ ] Price without currency
   - [ ] Empty custom field label

**Test Edge Cases:**

1. [ ] Very long title (>100 chars)
2. [ ] Very long description (>1000 chars)
3. [ ] MaxParticipants above club limit → Paywall
4. [ ] 20+ custom fields
5. [ ] Special characters in inputs
6. [ ] Disabled state (auth missing)

**Performance Check:**

1. [ ] No unnecessary re-renders
2. [ ] Fast input typing
3. [ ] Smooth scrolling
4. [ ] Quick AI generation

---

### Step 10: Visual Comparison (10 min)

**Before/After Screenshots:**

1. [ ] Take screenshot of original form
2. [ ] Take screenshot of refactored form
3. [ ] Compare pixel-by-pixel
4. [ ] Verify identical layout
5. [ ] Verify identical styling
6. [ ] Verify identical behavior

**Tools:**
- Browser DevTools
- Screenshot comparison
- Manual inspection

---

## 🚨 Rollback Plan

**If issues found:**

1. **Option A: Revert commit**
```bash
git revert HEAD
git push origin main
```

2. **Option B: Feature flag**
```typescript
const USE_NEW_FORM = false; // Toggle

{USE_NEW_FORM ? (
  <NewEventForm />
) : (
  <OldEventForm />
)}
```

3. **Option C: Hot fix**
- Fix bug in section
- Test quickly
- Push fix

---

## ✅ Success Criteria

### Must Have:

- [ ] All 5 sections extracted
- [ ] EventForm orchestrator updated
- [ ] Zero TypeScript errors
- [ ] Create flow works
- [ ] Edit flow works
- [ ] Validation works
- [ ] Visual match (pixel-perfect)

### Nice to Have:

- [ ] Performance improved (fewer re-renders)
- [ ] Code more readable
- [ ] Sections testable

### Zero Tolerance:

- [ ] NO breaking changes
- [ ] NO regressions
- [ ] NO visual differences
- [ ] NO performance degradation

---

## 📊 Progress Tracking

**Time Budget:**

| Step | Time | Status |
|------|------|--------|
| 1. Directory structure | 5 min | ⏳ |
| 2. BasicInfoSection | 45 min | ⏳ |
| 3. PricingSection | 30 min | ⏳ |
| 4. VehicleSection | 20 min | ⏳ |
| 5. RulesSection | 30 min | ⏳ |
| 6. CustomFieldsSection | 45 min | ⏳ |
| 7. Update orchestrator | 30 min | ⏳ |
| 8. Create exports | 5 min | ⏳ |
| 9. Integration testing | 30 min | ⏳ |
| 10. Visual comparison | 10 min | ⏳ |
| **Total** | **250 min (4.2h)** | ⏳ |

**Actual vs Estimated:**
- Estimated: 3h (180 min)
- With testing: 4.2h (250 min)
- Buffer: +40% (realistic)

---

## 🎯 Commit Strategy

**Single atomic commit:**

```bash
git add -A
git commit -m "refactor(eventform): extract sections from monolithic component (Phase 1)

BREAKING: None (backward compatible)

Architecture:
- Split EventForm (1161 lines) into 6 files
- Created 5 section components (100-250 lines each)
- EventForm now orchestrator (200 lines)
- Zero breaking changes to external API

Components Created:
- EventBasicInfoSection (200 lines)
- EventPricingSection (150 lines)
- EventVehicleSection (100 lines)
- EventRulesSection (120 lines)
- EventCustomFieldsSection (250 lines)

Benefits:
✅ Reduced largest file size: 1161 → 250 lines (-78%)
✅ Clear separation of concerns
✅ Testable in isolation
✅ Easier to maintain
✅ Ready for future phases (Context, hooks)

Testing:
- [x] Create flow works
- [x] Edit flow works
- [x] Validation works
- [x] Locked fields work
- [x] AI generation works
- [x] Paywall works
- [x] Visual match confirmed
- [x] 0 TypeScript errors

Files Changed:
- src/components/events/event-form.tsx (refactored)
- src/components/events/event-form/sections/* (5 new files)
- src/components/events/event-form/index.ts (new)

Impact: Better maintainability, testability, developer experience
Risk: LOW (backward compatible, thoroughly tested)
"
```

---

## 🚀 Ready to Start?

**Pre-flight Checklist:**

- [ ] Analysis document reviewed
- [ ] Plan approved
- [ ] Time allocated (4h)
- [ ] Backup created
- [ ] Tests planned
- [ ] Rollback plan ready

**On Your Approval:**
- Start with Step 1 (Directory structure)
- Proceed incrementally
- Test after each section
- Commit when all done

**Say "GO" to start! 🚀**

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-17  
**Status:** Awaiting approval
