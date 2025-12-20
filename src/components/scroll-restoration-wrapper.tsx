/**
 * ScrollRestorationWrapper
 * 
 * Client component wrapper for scroll restoration.
 * Used to wrap Server Components that need scroll restoration.
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * export default async function EventDetails() {
 *   const event = await getEvent(id);
 *   
 *   return (
 *     <ScrollRestorationWrapper storageKey={`event-${id}`}>
 *       <EventContent event={event} />
 *     </ScrollRestorationWrapper>
 *   );
 * }
 * ```
 */

"use client";

import { useScrollRestoration } from "@/hooks/use-scroll-restoration";

interface ScrollRestorationWrapperProps {
  children: React.ReactNode;
  storageKey: string;
}

export function ScrollRestorationWrapper({
  children,
  storageKey,
}: ScrollRestorationWrapperProps) {
  useScrollRestoration(storageKey);
  return <>{children}</>;
}
