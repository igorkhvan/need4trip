/**
 * useOptimisticState Hook
 * 
 * Wrapper над React 19 useOptimistic для типобезопасного оптимистичного UI.
 * Позволяет мгновенно обновлять UI перед получением ответа от сервера.
 * 
 * @param initialState - начальное состояние
 * @param updateFn - функция для применения оптимистичного обновления
 * @returns объект с текущим состоянием и функцией для добавления оптимистичного обновления
 * 
 * @example
 * ```tsx
 * const { optimisticState, addOptimistic } = useOptimisticState(
 *   { count: 0 },
 *   (state, newValue) => ({ count: newValue })
 * );
 * 
 * const handleIncrement = async () => {
 *   addOptimistic(optimisticState.count + 1);
 *   await saveToServer(optimisticState.count + 1);
 * };
 * ```
 */

import { useOptimistic } from "react";

type OptimisticAction<T> = {
  type: string;
  [key: string]: any;
};

/**
 * Версия с action-based updates (для сложных случаев)
 */
export function useOptimisticState<T, A = Partial<T>>(
  initialState: T,
  updateFn: (state: T, action: A) => T
) {
  const [optimisticState, addOptimistic] = useOptimistic(initialState, updateFn);

  return {
    optimisticState,
    addOptimistic,
  };
}

/**
 * Простая версия для прямого обновления состояния
 */
export function useSimpleOptimistic<T>(initialState: T) {
  const [optimisticState, addOptimistic] = useOptimistic(
    initialState,
    (_state: T, newState: T) => newState
  );

  return {
    optimisticState,
    setOptimistic: addOptimistic,
  };
}
