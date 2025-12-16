/**
 * TableSkeleton Components
 * 
 * Skeleton компоненты для таблиц (списки участников, транзакции, etc).
 */

/**
 * TableRowSkeleton - одна строка таблицы
 */
export function TableRowSkeleton({ columnsCount = 4 }: { columnsCount?: number }) {
  return (
    <tr className="border-b border-[#E5E7EB]">
      {Array.from({ length: columnsCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
        </td>
      ))}
    </tr>
  );
}

/**
 * TableSkeleton - полная таблица
 */
export function TableSkeleton({ 
  rowsCount = 5, 
  columnsCount = 4 
}: { 
  rowsCount?: number;
  columnsCount?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-[#F7F7F8]">
          <tr>
            {Array.from({ length: columnsCount }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className="h-4 w-24 animate-pulse rounded bg-white" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowsCount }).map((_, i) => (
            <TableRowSkeleton key={i} columnsCount={columnsCount} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ParticipantsTableSkeleton - скелетон для таблицы участников события
 */
export function ParticipantsTableSkeleton({ rowsCount = 10 }: { rowsCount?: number }) {
  return <TableSkeleton rowsCount={rowsCount} columnsCount={5} />;
}
