/**
 * Form Validation Utilities
 * Helpers for form validation and error handling
 */

/**
 * Scrolls to the first field with an error and focuses it
 * 
 * @param options - Scroll behavior options
 * @returns true if an error field was found and scrolled to
 */
export function scrollToFirstError(options?: {
  /** Behavior of the scroll animation */
  behavior?: ScrollBehavior;
  /** Block alignment (default: 'center') */
  block?: ScrollLogicalPosition;
  /** Offset from top in pixels (e.g., for fixed headers) */
  offset?: number;
}): boolean {
  const {
    behavior = "smooth",
    block = "center",
    offset = 0,
  } = options || {};

  // Find first element with data-error="true"
  const errorField = document.querySelector<HTMLElement>('[data-error="true"]');

  if (!errorField) {
    return false;
  }

  // Calculate scroll position with offset
  if (offset > 0) {
    const elementPosition = errorField.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior,
    });
  } else {
    // Use native scrollIntoView
    errorField.scrollIntoView({
      behavior,
      block,
    });
  }

  // Focus on the first input/textarea/select within the field
  const focusableElement = errorField.querySelector<HTMLElement>(
    'input, textarea, select, button[type="button"]'
  );

  if (focusableElement) {
    // Small delay to ensure scroll completes
    setTimeout(() => {
      focusableElement.focus();
    }, behavior === "smooth" ? 300 : 0);
  }

  return true;
}

/**
 * Clears a specific error from the errors object
 * Useful for inline error clearing on field change
 * 
 * @param errors - Current errors object
 * @param field - Field name to clear
 * @returns New errors object without the specified field
 */
export function clearFieldError<T extends Record<string, string>>(
  errors: T,
  field: keyof T
): T {
  const { [field]: _, ...rest } = errors;
  return rest as T;
}

/**
 * Checks if a form has any validation errors
 * 
 * @param errors - Errors object
 * @returns true if there are any errors
 */
export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}
