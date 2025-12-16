/**
 * useLoadingTransition Hook
 * 
 * Комбинация useTransition + useDelayedLoading для плавных переходов с delayed loading.
 * Идеально для пагинации, фильтров, и других не-блокирующих операций.
 * 
 * @param delay - задержка перед показом loading индикатора (default: 300ms)
 * @returns объект с состояниями и функцией startTransition
 * 
 * @example
 * ```tsx
 * const { isPending, showLoading, startTransition } = useLoadingTransition();
 * 
 * const handlePageChange = (page: number) => {
 *   startTransition(() => {
 *     loadPage(page);
 *   });
 * };
 * 
 * return (
 *   <div className={isPending ? 'opacity-50' : ''}>
 *     {showLoading && <Skeleton />}
 *     <Content />
 *   </div>
 * );
 * ```
 */

import { useTransition } from "react";
import { useDelayedLoading } from "./use-delayed-loading";

export function useLoadingTransition(delay = 300) {
  const [isPending, startTransition] = useTransition();
  const showLoading = useDelayedLoading(isPending, delay);

  return {
    /**
     * True если transition в процессе
     * Используй для добавления opacity/disabled состояний
     */
    isPending,

    /**
     * True если загрузка длится дольше delay
     * Используй для показа skeleton/spinner
     */
    showLoading,

    /**
     * Запускает transition с переданной функцией
     * Обновления UI будут не-блокирующими
     */
    startTransition,
  };
}
