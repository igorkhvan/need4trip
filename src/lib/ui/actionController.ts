/**
 * ActionController — Universal UI Side-Effect Orchestration
 * 
 * Purpose: Provide a standardized, reusable mechanism for managing async actions
 * across the app (forms, confirmations, exports, billing, member management, etc.)
 * 
 * Key Features:
 * - Phase-based state machine (idle → running → awaiting_confirmation → running_confirmed → redirecting → success/error)
 * - Built-in confirmation flow support
 * - Prevents race conditions (button re-enable before redirect)
 * - Provides consistent loading states and error handling
 * - Reusable across all action types
 * 
 * SSOT: This is the CANONICAL pattern for all side-effect actions in Need4Trip.
 * See: docs/ssot/SSOT_ARCHITECTURE.md § ActionController Standard
 * 
 * @example Simple action (no confirmation)
 * ```tsx
 * const controller = useActionController();
 * 
 * const handleSave = () => {
 *   controller.start("save_changes", async () => {
 *     await api.put('/api/resource', data);
 *     controller.setRedirecting();
 *     router.push('/success');
 *   });
 * };
 * 
 * return (
 *   <Button disabled={controller.isBusy}>
 *     {controller.busyLabel || "Save"}
 *   </Button>
 * );
 * ```
 * 
 * @example Confirmation flow
 * ```tsx
 * const controller = useActionController();
 * 
 * const handleCreate = () => {
 *   controller.start("create_event", async () => {
 *     const res = await api.post('/api/events', data);
 *     
 *     if (res.status === 409) {
 *       // Store payload for retry after confirmation
 *       controller.awaitConfirmation({
 *         payload: data,
 *         meta: res.data.error.meta
 *       });
 *       return;
 *     }
 *     
 *     if (!res.ok) throw new Error(res.statusText);
 *     
 *     controller.setRedirecting();
 *     router.push(`/events/${res.data.event.id}`);
 *   });
 * };
 * 
 * const handleConfirm = () => {
 *   controller.confirm(async (stored) => {
 *     const res = await api.post('/api/events?confirm=1', stored.payload);
 *     // ... same logic
 *   });
 * };
 * 
 * return (
 *   <>
 *     <Form onSubmit={handleCreate} disabled={controller.isBusy} />
 *     {controller.phase === 'awaiting_confirmation' && (
 *       <ConfirmModal 
 *         isLoading={controller.phase === 'running_confirmed'}
 *         onConfirm={handleConfirm}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Action lifecycle phases
 */
export type ActionPhase =
  | 'idle'                    // No action in progress
  | 'running'                 // Initial action executing
  | 'awaiting_confirmation'   // Paused, waiting for user confirmation
  | 'running_confirmed'       // Executing after confirmation
  | 'redirecting'             // Action succeeded, navigation in progress
  | 'success'                 // Action completed successfully (if no redirect)
  | 'error';                  // Action failed

/**
 * Action state container
 */
export interface ActionState<TConfirmPayload = any> {
  /** Current phase */
  phase: ActionPhase;
  
  /** Is action busy (running, awaiting confirmation, or redirecting) */
  isBusy: boolean;
  
  /** Name of current action (for logging and labels) */
  actionName?: string;
  
  /** Unique correlation ID for this action attempt (useful for idempotency) */
  correlationId?: string;
  
  /** Error message from last failed action */
  lastError?: string;
  
  /** Stored payload for confirmation flow */
  confirmationPayload?: TConfirmPayload;
}

/**
 * ActionController API
 */
export interface ActionController<TConfirmPayload = any> {
  /** Current state */
  state: ActionState<TConfirmPayload>;
  
  /** Shorthand: is any action in progress */
  isBusy: boolean;
  
  /** Shorthand: current phase */
  phase: ActionPhase;
  
  /** Label to show on busy button (auto-computed or custom) */
  busyLabel?: string;
  
  /** Correlation ID for current attempt */
  correlationId?: string;
  
  /**
   * Start a new action
   * @param actionName Human-readable action name (e.g., "create_event", "save_changes")
   * @param fn Async function to execute
   */
  start: (actionName: string, fn: () => Promise<void>) => Promise<void>;
  
  /**
   * Transition to awaiting_confirmation with stored payload
   * Use this when action needs user confirmation before proceeding
   * @param payload Data to pass to confirm callback
   */
  awaitConfirmation: (payload: TConfirmPayload) => void;
  
  /**
   * Execute confirmed action
   * @param fn Async function that receives stored payload
   */
  confirm: (fn: (payload: TConfirmPayload) => Promise<void>) => Promise<void>;
  
  /**
   * Mark action as redirecting (keeps UI disabled until unmount)
   * CRITICAL: Call this BEFORE router.push() to prevent race conditions
   */
  setRedirecting: () => void;
  
  /**
   * Reset to idle (use sparingly; usually not needed)
   */
  reset: () => void;
  
  /**
   * Set custom busy label (overrides auto-computed label)
   */
  setBusyLabel: (label: string | undefined) => void;
}

/**
 * Options for useActionController
 */
export interface ActionControllerOptions {
  /**
   * Custom busy label mapping
   * @param actionName Action name passed to start()
   * @param phase Current phase
   * @returns Label to show on busy button
   */
  getBusyLabel?: (actionName: string, phase: ActionPhase) => string;
  
  /**
   * Custom error normalizer
   * @param error Error object from catch
   * @returns User-friendly error message
   */
  normalizeError?: (error: unknown) => string;
}

// ============================================================================
// Default Helpers
// ============================================================================

/**
 * Default busy label mapping
 */
function defaultGetBusyLabel(actionName: string, phase: ActionPhase): string {
  // Phase-specific overrides
  if (phase === 'redirecting') return 'Переход...';
  if (phase === 'awaiting_confirmation') return 'Ожидание подтверждения...';
  if (phase === 'running_confirmed') return 'Подтверждение...';
  
  // Action-specific labels
  const actionLabels: Record<string, string> = {
    create_event: 'Создаём событие...',
    save_changes: 'Сохраняем...',
    update_event: 'Обновляем...',
    delete: 'Удаляем...',
    publish: 'Публикуем...',
    invite_member: 'Отправляем приглашение...',
    remove_member: 'Удаляем участника...',
    export_csv: 'Экспортируем...',
    purchase: 'Обработка платежа...',
  };
  
  return actionLabels[actionName] || 'Обработка...';
}

/**
 * Default error normalizer
 */
function defaultNormalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Произошла ошибка. Попробуйте ещё раз.';
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Universal action controller hook
 * 
 * Provides standardized async action management with:
 * - Phase-based state machine
 * - Confirmation flow support
 * - Race condition prevention
 * - Idempotency correlation IDs
 * 
 * @param options Configuration options
 * @returns ActionController instance
 */
export function useActionController<TConfirmPayload = any>(
  options: ActionControllerOptions = {}
): ActionController<TConfirmPayload> {
  const {
    getBusyLabel = defaultGetBusyLabel,
    normalizeError = defaultNormalizeError,
  } = options;
  
  const [state, setState] = useState<ActionState<TConfirmPayload>>({
    phase: 'idle',
    isBusy: false,
  });
  
  const [customBusyLabel, setCustomBusyLabel] = useState<string | undefined>();
  
  // Track if component is mounted (prevent state updates after unmount)
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const start = useCallback(async (actionName: string, fn: () => Promise<void>) => {
    const correlationId = crypto.randomUUID();
    
    setState({
      phase: 'running',
      isBusy: true,
      actionName,
      correlationId,
      lastError: undefined,
      confirmationPayload: undefined,
    });
    
    try {
      await fn();
      
      // Only transition to success if we didn't move to awaiting_confirmation or redirecting
      if (isMountedRef.current) {
        setState(prev => {
          if (prev.phase === 'running') {
            return { ...prev, phase: 'success', isBusy: false };
          }
          return prev;
        });
      }
    } catch (error) {
      const errorMessage = normalizeError(error);
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          phase: 'error',
          isBusy: false,
          lastError: errorMessage,
        }));
      }
    }
  }, [normalizeError]);
  
  const awaitConfirmation = useCallback((payload: TConfirmPayload) => {
    setState(prev => ({
      ...prev,
      phase: 'awaiting_confirmation',
      isBusy: true, // Still busy (confirmation modal open)
      confirmationPayload: payload,
    }));
  }, []);
  
  const confirm = useCallback(async (fn: (payload: TConfirmPayload) => Promise<void>) => {
    setState(prev => ({
      ...prev,
      phase: 'running_confirmed',
      isBusy: true,
    }));
    
    try {
      if (!state.confirmationPayload) {
        throw new Error('No confirmation payload stored');
      }
      
      await fn(state.confirmationPayload);
      
      // Only transition to success if we didn't move to redirecting
      if (isMountedRef.current) {
        setState(prev => {
          if (prev.phase === 'running_confirmed') {
            return { ...prev, phase: 'success', isBusy: false, confirmationPayload: undefined };
          }
          return prev;
        });
      }
    } catch (error) {
      const errorMessage = normalizeError(error);
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          phase: 'error',
          isBusy: false,
          lastError: errorMessage,
        }));
      }
    }
  }, [state.confirmationPayload, normalizeError]);
  
  const setRedirecting = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'redirecting',
      isBusy: true, // Keep busy until unmount
    }));
  }, []);
  
  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      isBusy: false,
    });
    setCustomBusyLabel(undefined);
  }, []);
  
  const setBusyLabel = useCallback((label: string | undefined) => {
    setCustomBusyLabel(label);
  }, []);
  
  // Compute busy label
  const busyLabel = customBusyLabel || 
    (state.actionName ? getBusyLabel(state.actionName, state.phase) : undefined);
  
  return {
    state,
    isBusy: state.isBusy,
    phase: state.phase,
    busyLabel,
    correlationId: state.correlationId,
    start,
    awaitConfirmation,
    confirm,
    setRedirecting,
    reset,
    setBusyLabel,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if phase represents a busy state
 */
export function isBusyPhase(phase: ActionPhase): boolean {
  return phase !== 'idle' && phase !== 'success' && phase !== 'error';
}

/**
 * Check if phase allows user interaction
 */
export function isInteractivePhase(phase: ActionPhase): boolean {
  return phase === 'idle' || phase === 'error';
}

