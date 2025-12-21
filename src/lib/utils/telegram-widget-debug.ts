/**
 * Telegram Widget Debug Utility
 * 
 * Используй в DevTools Console для диагностики:
 * 
 * ```js
 * // В консоли браузера:
 * window.debugTelegramWidget()
 * ```
 */

export function debugTelegramWidget() {
  const report: Record<string, any> = {};

  // 1. Environment Variables
  report.envVars = {
    botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '❌ NOT SET',
    authUrl: process.env.NEXT_PUBLIC_TELEGRAM_AUTH_URL || 'auto (window.location.origin)',
  };

  // 2. Global Callbacks
  report.globalCallbacks = {
    onTelegramAuthModal: typeof window.onTelegramAuthModal,
    onTelegramAuth: typeof window.onTelegramAuth,
  };

  // 3. Container Elements
  const containers = document.querySelectorAll('[aria-label="Telegram Login"]');
  report.containers = {
    count: containers.length,
    details: Array.from(containers).map((el, idx) => ({
      index: idx,
      hasChildren: el.childNodes.length > 0,
      children: Array.from(el.childNodes).map(child => ({
        type: child.nodeName,
        src: (child as HTMLScriptElement).src || (child as HTMLIFrameElement).src || 'N/A',
      })),
      innerHTML: el.innerHTML.substring(0, 200),
    })),
  };

  // 4. Script Tags (with Performance API for load status)
  const scripts = document.querySelectorAll('script[src*="telegram"]');
  
  // Use Performance API to check if scripts are loaded (standard Web API)
  const performanceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  report.telegramScripts = {
    count: scripts.length,
    details: Array.from(scripts).map((script, idx) => {
      const src = (script as HTMLScriptElement).src;
      const perfEntry = performanceEntries.find(entry => entry.name === src);
      
      return {
        index: idx,
        src,
        async: (script as HTMLScriptElement).async,
        loadStatus: perfEntry 
          ? (perfEntry.responseEnd > 0 ? 'loaded' : 'loading')
          : 'unknown',
        loadTime: perfEntry ? Math.round(perfEntry.duration) + 'ms' : null,
        transferSize: perfEntry ? perfEntry.transferSize + ' bytes' : null,
        attributes: Array.from(script.attributes).map(attr => ({
          name: attr.name,
          value: attr.value,
        })),
      };
    }),
  };

  // 5. Telegram iframes
  const iframes = document.querySelectorAll('iframe[src*="telegram"]');
  report.telegramIframes = {
    count: iframes.length,
    details: Array.from(iframes).map((iframe, idx) => ({
      index: idx,
      src: (iframe as HTMLIFrameElement).src,
      width: (iframe as HTMLIFrameElement).width,
      height: (iframe as HTMLIFrameElement).height,
      display: window.getComputedStyle(iframe).display,
      visibility: window.getComputedStyle(iframe).visibility,
    })),
  };

  // 6. Network State
  report.network = {
    online: navigator.onLine,
    connection: (navigator as any).connection ? {
      effectiveType: (navigator as any).connection.effectiveType,
      downlink: (navigator as any).connection.downlink,
      rtt: (navigator as any).connection.rtt,
    } : 'N/A',
  };

  // 7. Timing
  report.timing = {
    domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
  };

  console.group('🔍 TELEGRAM WIDGET DEBUG REPORT');
  console.log('📋 Full Report:', report);
  console.log('');
  console.log('🌍 Environment:', report.envVars);
  console.log('📞 Callbacks:', report.globalCallbacks);
  console.log('📦 Containers:', report.containers);
  console.log('📜 Scripts:', report.telegramScripts);
  console.log('🖼️  iFrames:', report.telegramIframes);
  console.log('🌐 Network:', report.network);
  console.log('⏱️  Timing:', report.timing);
  console.groupEnd();

  // Диагностика проблем
  console.group('⚠️ POTENTIAL ISSUES');
  
  if (!report.envVars.botUsername || report.envVars.botUsername === '❌ NOT SET') {
    console.error('❌ NEXT_PUBLIC_TELEGRAM_BOT_USERNAME not set!');
  }
  
  if (report.containers.count === 0) {
    console.error('❌ No container elements found with aria-label="Telegram Login"');
  }
  
  if (report.telegramScripts.count === 0) {
    console.error('❌ No Telegram scripts loaded');
  } else if (report.telegramScripts.count > 2) {
    console.warn(`⚠️ Multiple Telegram scripts (${report.telegramScripts.count}) - possible duplicate loading`);
  }
  
  if (report.telegramIframes.count === 0) {
    console.error('❌ No Telegram iframes found - widget did not render');
  }
  
  if (!report.network.online) {
    console.error('❌ Browser is OFFLINE');
  }
  
  if (typeof report.globalCallbacks.onTelegramAuthModal === 'undefined') {
    console.warn('⚠️ window.onTelegramAuthModal is not defined');
  }
  
  console.groupEnd();

  return report;
}

// Expose to window for easy access
if (typeof window !== 'undefined') {
  (window as any).debugTelegramWidget = debugTelegramWidget;
}
