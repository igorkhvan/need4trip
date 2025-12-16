/**
 * FormSkeleton Components
 * 
 * Skeleton компоненты для форм редактирования.
 */

/**
 * FormFieldSkeleton - одно поле формы
 */
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
      <div className="h-12 w-full animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]" />
      <div className="h-4 w-64 animate-pulse rounded bg-[#F7F7F8]" />
    </div>
  );
}

/**
 * FormTextareaSkeleton - textarea поле
 */
export function FormTextareaSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
      <div className="h-32 w-full animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]" />
      <div className="h-4 w-48 animate-pulse rounded bg-[#F7F7F8]" />
    </div>
  );
}

/**
 * FormSkeleton - полная форма
 */
export function FormSkeleton({ fieldsCount = 5 }: { fieldsCount?: number }) {
  return (
    <div className="space-y-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      {/* Title */}
      <div className="h-8 w-48 animate-pulse rounded bg-[#F7F7F8]" />

      {/* Fields */}
      <div className="space-y-6">
        {Array.from({ length: fieldsCount }).map((_, i) => (
          <FormFieldSkeleton key={i} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-[#E5E7EB] pt-6">
        <div className="h-12 w-32 animate-pulse rounded-xl bg-[#F7F7F8]" />
        <div className="h-12 w-24 animate-pulse rounded-xl bg-[#F7F7F8]" />
      </div>
    </div>
  );
}

/**
 * FormPageSkeleton - полная страница формы
 */
export function FormPageSkeleton() {
  return (
    <div className="page-container space-y-6 pb-10 pt-12">
      {/* Back button */}
      <div className="h-10 w-32 animate-pulse rounded-lg bg-[#F7F7F8]" />

      {/* Title */}
      <div className="h-10 w-64 animate-pulse rounded bg-[#F7F7F8]" />

      {/* Form */}
      <FormSkeleton fieldsCount={6} />
    </div>
  );
}
