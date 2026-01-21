/**
 * Protected Routes Configuration
 * 
 * Единый источник истины для определения защищённых страниц.
 * Используется для автоматического определения редиректа после logout.
 * 
 * Правило:
 * - Если страница защищённая → logout редиректит на "/"
 * - Если страница публичная → logout оставляет на текущей странице
 * 
 * Protected pages (требуют авторизации):
 * - /profile, /profile/edit
 * - /events/create, /events/[id]/edit
 * - /clubs/create, /clubs/[id]/settings
 * 
 * Public pages (доступны без авторизации):
 * - /, /events, /events/[id], /clubs, /clubs/[id], /pricing
 */

/**
 * Список защищённых страниц (patterns)
 * Используется для проверки требуется ли редирект после logout
 */
const PROTECTED_PAGE_PATTERNS = [
  // Profile pages
  '/profile',
  '/profile/edit',
  
  // Event creation and editing
  '/events/create',
  '/events/[id]/edit',
  
  // Club creation and settings
  '/clubs/create',
  '/clubs/[id]/settings',
] as const;

/**
 * Проверяет, является ли страница защищённой (требует авторизации)
 * 
 * @param pathname - Текущий путь страницы (из usePathname() или router)
 * @returns true если страница требует авторизации, false если публичная
 * 
 * @example
 * isProtectedPage('/profile') // → true
 * isProtectedPage('/events') // → false
 * isProtectedPage('/events/abc-123/edit') // → true
 * isProtectedPage('/clubs/abc-123/settings') // → true
 */
export function isProtectedPage(pathname: string): boolean {
  // Нормализуем путь (убираем trailing slash)
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' 
    ? pathname.slice(0, -1) 
    : pathname;
  
  for (const pattern of PROTECTED_PAGE_PATTERNS) {
    // Точное совпадение
    if (normalizedPath === pattern) {
      return true;
    }
    
    // Префикс совпадение (например, /profile/edit/something)
    if (normalizedPath.startsWith(pattern + '/')) {
      return true;
    }
    
    // Паттерн с [id] (например, /events/[id]/edit)
    if (pattern.includes('[id]')) {
      // Преобразуем паттерн в regex
      // /events/[id]/edit → ^/events/[^/]+/edit$
      const regexPattern = '^' + pattern.replace('[id]', '[^/]+') + '$';
      const regex = new RegExp(regexPattern);
      
      if (regex.test(normalizedPath)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Определяет URL для редиректа после logout
 * 
 * @param currentPath - Текущий путь страницы
 * @returns "/" если страница защищённая, false если нужно остаться на текущей
 * 
 * @example
 * getLogoutRedirect('/profile') // → "/"
 * getLogoutRedirect('/events') // → false
 */
export function getLogoutRedirect(currentPath: string): string | false {
  return isProtectedPage(currentPath) ? "/" : false;
}
