import { ReactNode } from "react";

/**
 * Layout для детали события и связанных страниц
 * Изолирует loading.tsx для этого сегмента от родительского /events/loading.tsx
 */
export default function EventDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

