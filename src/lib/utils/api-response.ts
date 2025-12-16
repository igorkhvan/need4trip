/**
 * API Response Utilities
 * 
 * Helper functions to handle standardized API response format:
 * {success: true, data: {...}} or legacy {key: value}
 */

/**
 * Extract data from standardized API response
 * Handles both formats:
 * - New: {success: true, data: {events: [...]}}
 * - Legacy: {events: [...]}
 */
export function extractApiData<T = any>(response: any): T {
  if (response && typeof response === 'object') {
    // If response has 'success' and 'data', extract data
    if ('success' in response && 'data' in response) {
      return response.data as T;
    }
    // Otherwise return response as-is (legacy format)
    return response as T;
  }
  return response as T;
}

/**
 * Extract error from API response
 */
export function extractApiError(response: any): string | null {
  if (response && typeof response === 'object') {
    if (response.success === false && response.error) {
      return typeof response.error === 'string' 
        ? response.error 
        : response.error.message || 'Unknown error';
    }
  }
  return null;
}
