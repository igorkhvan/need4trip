/**
 * Auth Events System
 * 
 * Централизованная система событий авторизации.
 * Используется для синхронизации состояния auth между компонентами.
 */

export const AUTH_EVENTS = {
  CHANGED: 'auth-changed',
  LOGIN: 'auth-login',
  LOGOUT: 'auth-logout',
} as const;

export type AuthEventType = typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS];

/**
 * Dispatch auth change event
 * Используется после login/logout для уведомления всех слушателей
 */
export function dispatchAuthChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_EVENTS.CHANGED));
}

/**
 * Listen to auth change events
 * @param callback - Function to call when auth changes
 * @returns cleanup function
 */
export function onAuthChanged(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  window.addEventListener(AUTH_EVENTS.CHANGED, callback);
  return () => window.removeEventListener(AUTH_EVENTS.CHANGED, callback);
}
