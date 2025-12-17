# Component Deduplication Analysis: Select Components

**Date:** 2024-12-17  
**Status:** Analysis Complete → Ready for Implementation  
**Priority:** P1 (Technical Debt Reduction)

---

## 📊 Current State

### Duplicate Components:

| Component | Lines | Type | Data Source | Usage |
|-----------|-------|------|-------------|-------|
| `city-select.tsx` | 202 | Single | Async API | Event form, Profile |
| `city-multi-select.tsx` | 274 | Multi | Async API | Club form |
| `brand-select.tsx` | 112 | Single | Static | Profile cars |
| `multi-brand-select.tsx` | 144 | Multi | Static | Event form |
| **Total** | **732** | - | - | **6 files** |

**Code Duplication:** ~60% overlap in logic

---

## 🔍 Pattern Analysis

### Common Patterns (ALL 4 components):

```typescript
// 1. Popover + Command UI structure
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" ...>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>Not found</CommandEmpty>
        <CommandGroup>
          {items.map(item => (
            <CommandItem onSelect={handleSelect}>
              <Check /> {item.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**Shared UI Elements:**
- ✅ Popover wrapper
- ✅ Command component
- ✅ Search input (CommandInput)
- ✅ Empty state (CommandEmpty)
- ✅ Item list (CommandGroup + CommandItem)
- ✅ Check icon for selected items
- ✅ ChevronsUpDown icon

---

### Key Differences:

| Feature | City Select | Brand Select | City Multi | Brand Multi |
|---------|-------------|--------------|------------|-------------|
| **Selection** | Single | Single | Multi | Multi |
| **Data Source** | Async API | Static props | Async API | Static props |
| **Search** | Server-side | Client-side | Server-side | Client-side |
| **Loading State** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Selected Display** | Name in button | Name in button | Badge count | Badges in button |
| **Icon** | MapPin | None | MapPin | None |
| **Max Items** | N/A | N/A | ✅ Yes (10) | ❌ No |
| **Popular Items** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Debounce** | 300ms | N/A | 300ms | N/A |

---

## 🏗️ Unification Strategy

### Design Principles:

1. **Type Safety First** - Full generic support
2. **Composition Over Configuration** - Flexible render functions
3. **Zero Breaking Changes** - Backward compatible wrappers
4. **Performance** - No unnecessary re-renders
5. **DX** - Simple API, clear documentation

---

### Option A: Single Generic Component (Recommended)

Create ONE base component with flexible configuration:

```typescript
<GenericSelect<T>
  // Core
  items={items}
  value={value}
  onChange={onChange}
  
  // Type
  mode="single" | "multi"
  
  // Data Loading
  loadItems?: (query: string) => Promise<T[]>
  loadInitial?: () => Promise<T[]>
  
  // Display
  getItemId={(item) => item.id}
  getItemLabel={(item) => item.name}
  renderItem?: (item, isSelected) => ReactNode
  renderTrigger?: (selected, placeholder) => ReactNode
  
  // UI
  placeholder="Select..."
  searchPlaceholder="Search..."
  emptyMessage="Not found"
  icon?: ReactNode
  
  // Behavior
  disabled={false}
  error={false}
  maxItems?: number
  debounceMs={300}
/>
```

**Benefits:**
- ✅ Single source of truth
- ✅ Type-safe with generics
- ✅ Highly flexible
- ✅ Easy to test
- ✅ ~400 lines vs 732 lines (-45% code)

**Implementation:**
```typescript
// Base generic component
export function GenericSelect<T>(...) { ... }

// Backward compatible wrappers
export function CitySelect(props) {
  return <GenericSelect<City>
    mode="single"
    loadItems={searchCities}
    loadInitial={loadPopularCities}
    getItemId={city => city.id}
    getItemLabel={city => formatCityName(city)}
    icon={<MapPin />}
    {...props}
  />;
}

export function BrandSelect(props) {
  return <GenericSelect<Brand>
    mode="single"
    items={props.options}
    getItemId={brand => brand.id}
    getItemLabel={brand => brand.name}
    {...props}
  />;
}
```

---

### Option B: Separate Single + Multi Base Components

Create TWO base components:

```typescript
// For single selection
<SingleSelect<T> ... />

// For multi selection
<MultiSelect<T> ... />
```

**Benefits:**
- ✅ Simpler API per component
- ✅ Easier to understand

**Drawbacks:**
- ❌ Still duplicate logic (~70%)
- ❌ Two components to maintain
- ❌ Less flexible

---

## ✅ Recommended Solution: Option A

**Why:**
- Single/Multi is just a mode flag, not fundamentally different logic
- Better code reuse
- More flexible for future use cases
- Easier to add features (e.g., async multi-select in future)

---

## 📐 GenericSelect API Design

### Core Types:

```typescript
export type SelectMode = 'single' | 'multi';

export interface GenericSelectProps<T> {
  // Required
  mode: SelectMode;
  value: SelectMode extends 'single' ? string | null : string[];
  onChange: SelectMode extends 'single' 
    ? (value: string | null) => void 
    : (values: string[]) => void;
  
  // Data (one of these required)
  items?: T[];  // Static data
  loadItems?: (query: string) => Promise<T[]>;  // Async search
  loadInitial?: () => Promise<T[]>;  // Initial async load
  loadById?: (id: string) => Promise<T | null>;  // Load single by ID
  
  // Display functions (required)
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  
  // Optional customization
  renderItem?: (item: T, isSelected: boolean) => ReactNode;
  renderTrigger?: (selectedItems: T[], placeholder: string) => ReactNode;
  renderSelectedBadge?: (item: T) => ReactNode;
  
  // UI props
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  icon?: ReactNode;
  className?: string;
  
  // Behavior
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  maxItems?: number;  // For multi mode
  debounceMs?: number;  // For async search
  shouldFilter?: boolean;  // For Command component
}
```

---

### Usage Examples:

#### 1. City Select (Async Single):

```typescript
<GenericSelect<City>
  mode="single"
  value={cityId}
  onChange={setCityId}
  
  loadInitial={async () => {
    const res = await fetch('/api/cities?popular=true');
    return res.json().then(d => d.cities);
  }}
  loadItems={async (query) => {
    const res = await fetch(`/api/cities?q=${query}`);
    return res.json().then(d => d.cities);
  }}
  loadById={async (id) => {
    const res = await fetch(`/api/cities/${id}`);
    return res.json().then(d => d.city);
  }}
  
  getItemId={city => city.id}
  getItemLabel={city => `${city.name}, ${city.region}`}
  renderItem={(city) => (
    <>
      {getCountryFlag(city.country)} {city.name}
      {city.region && <span className="text-xs">{city.region}</span>}
    </>
  )}
  
  placeholder="Выберите город..."
  icon={<MapPin />}
  debounceMs={300}
/>
```

#### 2. Brand Select (Static Single):

```typescript
<GenericSelect<Brand>
  mode="single"
  value={brandId}
  onChange={setBrandId}
  
  items={brands}
  getItemId={brand => brand.id}
  getItemLabel={brand => brand.name}
  
  placeholder="Выберите марку..."
  shouldFilter={true}  // Client-side filtering
/>
```

#### 3. City Multi-Select (Async Multi):

```typescript
<GenericSelect<City>
  mode="multi"
  value={cityIds}
  onChange={setCityIds}
  
  loadInitial={async () => { ... }}
  loadItems={async (query) => { ... }}
  
  getItemId={city => city.id}
  getItemLabel={city => `${city.name}, ${city.region}`}
  
  placeholder="Выберите города"
  icon={<MapPin />}
  maxItems={10}
/>
```

#### 4. Brand Multi-Select (Static Multi):

```typescript
<GenericSelect<Brand>
  mode="multi"
  value={brandIds}
  onChange={setBrandIds}
  
  items={brands}
  getItemId={brand => brand.id}
  getItemLabel={brand => brand.name}
  
  placeholder="Выберите марки..."
  shouldFilter={true}
/>
```

---

## 📋 Implementation Plan

### Phase 1: Core GenericSelect (2 hours)

1. **Create base component** (`src/components/ui/generic-select.tsx`)
   - Type definitions
   - Core logic (state, loading, selection)
   - UI structure (Popover + Command)
   - Async data loading with debounce
   - Single/Multi mode handling

2. **Test with inline usage**
   - Verify single mode works
   - Verify multi mode works
   - Verify async loading works
   - Verify static items work

### Phase 2: Wrapper Components (1 hour)

3. **Create backward-compatible wrappers:**
   - `CitySelect` → wraps GenericSelect
   - `BrandSelect` → wraps GenericSelect
   - `CityMultiSelect` → wraps GenericSelect
   - `MultiBrandSelect` → wraps GenericSelect

4. **Keep exact same API** (zero breaking changes)

### Phase 3: Migration & Testing (1 hour)

5. **Test all usage locations:**
   - Profile page (CitySelect, BrandSelect)
   - Event form (CitySelect, MultiBrandSelect)
   - Club form (CityMultiSelect)

6. **Verify behavior:**
   - Search works
   - Selection works
   - Loading states display
   - Error states work
   - Disabled state works

### Phase 4: Cleanup (30 min)

7. **Delete old implementations** (keep wrappers)
8. **Update imports** (if needed)
9. **Commit with clear message**

**Total Effort:** ~4.5 hours  
**Risk:** LOW (backward compatible wrappers)  
**ROI:** ⭐⭐⭐⭐⭐ (-45% code, maintainability++)

---

## 🎯 Success Criteria

- ✅ All 6 usage locations work identically
- ✅ Zero breaking changes to consumer code
- ✅ TypeScript checks pass
- ✅ Code reduced from 732 → ~400 lines (-45%)
- ✅ Single source of truth for select logic
- ✅ Easy to add new select types in future

---

## 🚀 Next Steps

**Start with Phase 1:** Implement GenericSelect base component

**File structure:**
```
src/components/ui/
  ├── generic-select.tsx (NEW - 250 lines)
  ├── city-select.tsx (MODIFIED - wrapper, ~30 lines)
  ├── city-multi-select.tsx (MODIFIED - wrapper, ~30 lines)
src/components/
  ├── brand-select.tsx (MODIFIED - wrapper, ~30 lines)
  ├── multi-brand-select.tsx (MODIFIED - wrapper, ~30 lines)
```

**Before:** 732 lines in 4 files  
**After:** ~370 lines total (-50%) + better architecture

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-17  
**Status:** Ready for implementation
