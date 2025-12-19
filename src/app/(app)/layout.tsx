/**
 * App Layout
 * 
 * Layout для всех функциональных страниц приложения (events, clubs, profile).
 * Добавляет page-container для ограничения ширины контента и вертикальные отступы.
 */

import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-container py-6 md:py-10">
      {children}
    </div>
  );
}
