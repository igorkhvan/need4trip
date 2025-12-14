/**
 * Logging utility for Need4Trip
 * 
 * Provides structured logging with different log levels.
 * In development: pretty console output
 * In production: JSON structured logs
 * In test: logging disabled
 */

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

/**
 * Simple logger that works without external dependencies
 * TODO: Replace with Pino for production when available
 */
class Logger {
  private enabled: boolean;
  private level: LogLevel;

  constructor() {
    this.enabled = !isTest;
    this.level = (process.env.LOG_LEVEL as LogLevel) || (isDev ? 'debug' : 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    
    if (isProd) {
      // JSON format for production
      return JSON.stringify({
        level,
        timestamp,
        message,
        ...context,
      });
    }
    
    // Pretty format for development
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];
    
    const contextStr = context && Object.keys(context).length > 0
      ? ` ${JSON.stringify(context)}`
      : '';
    
    return `${emoji} [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.formatMessage(level, message, context);
    
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Helper for logging errors with stack traces
   */
  errorWithStack(message: string, error: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: isDev ? error.stack : undefined,
      } : error,
    };
    
    this.error(message, errorContext);
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  errorWithStack: logger.errorWithStack.bind(logger),
};

// Default export
export default logger;
