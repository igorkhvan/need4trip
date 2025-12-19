/**
 * Marketing Layout
 * 
 * Пустой layout для лендинговых страниц (главная, pricing, about).
 * НЕ добавляет page-container, чтобы секции могли делать full-width фоны.
 */

import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
