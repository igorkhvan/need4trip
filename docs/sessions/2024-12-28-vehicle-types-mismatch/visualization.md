# Визуализация проблемы: Несоответствие типов авто

## Архитектура данных

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE (SSOT)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ vehicle_types table                                       │  │
│  ├───────────┬────────────────┬────────────────┬─────────────┤  │
│  │ id        │ name_en        │ name_ru        │ display_order│  │
│  ├───────────┼────────────────┼────────────────┼─────────────┤  │
│  │ offroad   │ Offroad        │ Внедорожник    │ 1           │  │
│  │ sedan     │ Sedan          │ Седан          │ 2           │  │
│  │ suv       │ SUV/Crossover  │ Кроссовер      │ 3           │  │
│  │ sportcar  │ Sports Car     │ Спорткар       │ 4           │  │
│  │ classic   │ Classic        │ Классика       │ 5           │  │
│  │ other     │ Other          │ Другое         │ 6           │  │
│  └───────────┴────────────────┴────────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴────────────┐
                │                          │
                ▼                          ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│   API: /api/vehicle-types │  │   events.vehicle_type_    │
│                           │  │   requirement (DB column) │
│   ✅ getActiveVehicle     │  │                           │
│      Types()              │  │   TEXT NOT NULL           │
│   ✅ Cached (24h TTL)     │  │   DEFAULT 'any'           │
│   ✅ Returns:             │  │                           │
│      [{                   │  │   Values: 'any' | ID      │
│        value: 'offroad',  │  │   (offroad, sedan, suv,   │
│        label: 'Внедорожник│  │    sportcar, classic,     │
│      }, ...]              │  │    other)                 │
└───────────────────────────┘  └───────────────────────────┘
                │
                │ fetch()
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ФОРМА СОЗДАНИЯ СОБЫТИЯ                        │
│  src/components/events/event-form.tsx                            │
│                                                                   │
│  useEffect(() => {                                               │
│    const typesRes = await fetch("/api/vehicle-types");          │
│    setVehicleTypes(typesData.vehicleTypes);  // ✅ ИЗ БД        │
│  }, []);                                                         │
│                                                                   │
│  <Select value={vehicleType}>                                    │
│    <SelectItem value="any">Любой</SelectItem>                   │
│    <SelectItem value="offroad">Внедорожник</SelectItem>  ✅     │
│    <SelectItem value="sedan">Седан</SelectItem>          ✅     │
│    <SelectItem value="suv">Кроссовер</SelectItem>        ✅     │
│    <SelectItem value="sportcar">Спорткар</SelectItem>    ✅     │
│    <SelectItem value="classic">Классика</SelectItem>     ✅     │
│    <SelectItem value="other">Другое</SelectItem>         ✅     │
│  </Select>                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Сохранение
                              ▼
                    ┌──────────────────┐
                    │  events table    │
                    │  vehicle_type_   │
                    │  requirement:    │
                    │  'offroad'       │
                    └──────────────────┘
                              │
                              │ Загрузка
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   СТРАНИЦА СОБЫТИЯ (ПРОБЛЕМА!)                   │
│  src/app/(app)/events/[id]/page.tsx                              │
│                                                                   │
│  // ❌ HARDCODED MAPPING (устарел, не совпадает с БД)           │
│  const vehicleTypeLabelMap: Record<string, string> = {          │
│    any: "Любой",                                                 │
│    sedan: "Легковой",       // ❌ В БД: "Седан"                 │
│    crossover: "Кроссовер",  // ❌ В БД нет 'crossover'          │
│    suv: "Внедорожник",      // ❌ В БД 'suv' = "Кроссовер"      │
│  };                         // ❌ Нет: offroad, sportcar, etc.  │
│                                                                   │
│  const vehicleTypeLabel =                                        │
│    vehicleTypeLabelMap[event.vehicleTypeRequirement] ??         │
│    "Любой";  // fallback для всех неизвестных типов             │
│                                                                   │
│  <p>{vehicleTypeLabel}</p>  // ❌ НЕПРАВИЛЬНОЕ отображение      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Что видит пользователь

### Сценарий 1: Пользователь выбирает "Внедорожник"

```
┌──────────────────────────┐
│  ФОРМА СОЗДАНИЯ          │
│                          │
│  Тип авто: [▼]           │
│    └─> Внедорожник  ✓    │  ✅ Выбрал "Внедорожник"
│                          │
│  [Создать событие]       │
└──────────────────────────┘
            │
            │ Сохранение: vehicle_type_requirement = 'offroad'
            ▼
┌──────────────────────────┐
│  СТРАНИЦА СОБЫТИЯ        │
│                          │
│  Требования к авто       │
│  Тип автомобиля:         │
│  └─> Любой               │  ❌ Показывает "Любой" (fallback!)
│                          │  Ожидал: "Внедорожник"
└──────────────────────────┘
```

**Причина:**
- Сохранено: `vehicle_type_requirement = 'offroad'`
- Mapping: `vehicleTypeLabelMap['offroad']` = `undefined`
- Результат: fallback → "Любой"

---

### Сценарий 2: Пользователь выбирает "Кроссовер"

```
┌──────────────────────────┐
│  ФОРМА СОЗДАНИЯ          │
│                          │
│  Тип авто: [▼]           │
│    └─> Кроссовер     ✓   │  ✅ Выбрал "Кроссовер"
│                          │
│  [Создать событие]       │
└──────────────────────────┘
            │
            │ Сохранение: vehicle_type_requirement = 'suv'
            ▼
┌──────────────────────────┐
│  СТРАНИЦА СОБЫТИЯ        │
│                          │
│  Требования к авто       │
│  Тип автомобиля:         │
│  └─> Внедорожник         │  ❌ Показывает "Внедорожник"!
│                          │  Ожидал: "Кроссовер"
└──────────────────────────┘
```

**Причина:**
- Сохранено: `vehicle_type_requirement = 'suv'`
- Mapping: `vehicleTypeLabelMap['suv']` = `"Внедорожник"`
- Результат: неправильное название

---

### Сценарий 3: Пользователь выбирает "Седан"

```
┌──────────────────────────┐
│  ФОРМА СОЗДАНИЯ          │
│                          │
│  Тип авто: [▼]           │
│    └─> Седан         ✓   │  ✅ Выбрал "Седан"
│                          │
│  [Создать событие]       │
└──────────────────────────┘
            │
            │ Сохранение: vehicle_type_requirement = 'sedan'
            ▼
┌──────────────────────────┐
│  СТРАНИЦА СОБЫТИЯ        │
│                          │
│  Требования к авто       │
│  Тип автомобиля:         │
│  └─> Легковой            │  ❌ Показывает "Легковой"
│                          │  Ожидал: "Седан"
└──────────────────────────┘
```

**Причина:**
- Сохранено: `vehicle_type_requirement = 'sedan'`
- Mapping: `vehicleTypeLabelMap['sedan']` = `"Легковой"`
- Результат: неправильное название

---

## Решение (Hydration Pattern)

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE (SSOT)                            │
│  vehicle_types table: offroad, sedan, suv, sportcar, classic... │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                ┌─────────────┴────────────┐
                │                          │
                ▼                          ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│   vehicleTypeRepo.ts      │  │   hydration.ts            │
│                           │  │                           │
│   ✅ getVehicleTypesByIds │  │   ✅ NEW:                 │
│   ✅ Cached (StaticCache) │  │   hydrateVehicleTypes()   │
└───────────────────────────┘  └───────────────────────────┘
                │                          │
                └────────────┬─────────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │   eventRepo.ts          │
                │                         │
                │   getEventById() {      │
                │     const event = ...   │
                │     const [hydrated] =  │
                │       await hydrate     │
                │       VehicleTypes([    │
                │         event           │
                │       ]);               │
                │     return hydrated;    │
                │   }                     │
                └─────────────────────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │   Event type            │
                │                         │
                │   {                     │
                │     vehicleType         │
                │       Requirement:      │
                │       'offroad',        │
                │     vehicleType: {  ✨  │
                │       id: 'offroad',    │
                │       nameRu: 'Внедор-  │
                │               ожник'    │
                │     }                   │
                │   }                     │
                └─────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   СТРАНИЦА СОБЫТИЯ (ИСПРАВЛЕНО!)                 │
│  src/app/(app)/events/[id]/page.tsx                              │
│                                                                   │
│  // ✅ Используем hydrated данные                                │
│  const vehicleTypeLabel =                                        │
│    event.vehicleType?.nameRu ?? "Любой";                         │
│                                                                   │
│  <p>{vehicleTypeLabel}</p>  // ✅ ПРАВИЛЬНОЕ отображение         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Преимущества решения

1. ✅ **Single Source of Truth** — БД
2. ✅ **Консистентность** — форма и отображение используют одни данные
3. ✅ **Кеширование** — StaticCache (24h TTL)
4. ✅ **Type-safe** — TypeScript проверки
5. ✅ **Масштабируемость** — легко добавлять новые типы
6. ✅ **Архитектурная согласованность** — паттерн уже используется для cities, currencies, categories

---

## Затронутые файлы

- ✏️ `src/lib/utils/hydration.ts` — добавить `hydrateVehicleTypes()`
- ✏️ `src/lib/types/event.ts` — обновить `Event` interface
- ✏️ `src/lib/db/eventRepo.ts` — применить hydration
- ✏️ `src/app/(app)/events/[id]/page.tsx` — убрать hardcoded mapping
- ✏️ `docs/ARCHITECTURE.md` — обновить Ownership Map

