import React from 'react';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

interface TableHeader {
  key: string;
  label: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  headers: TableHeader[];
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  renderCard: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;
}

export function DataTable<T>({
  headers,
  items,
  renderRow,
  renderCard,
  loading = false,
  emptyTitle = 'No data available',
  emptyMessage = 'There are no records matching your criteria.',
  emptyActionText,
  onEmptyAction,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-outline-variant bg-white/95 p-6 shadow-sm">
        <Skeleton.Table rows={4} cols={headers.length} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionText={emptyActionText}
        onAction={onEmptyAction}
      />
    );
  }

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="w-full">
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP TABLE VIEW */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden md:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface font-semibold text-xs text-secondary border-b border-outline-variant">
                {headers.map((header) => (
                  <th
                    key={header.key}
                    className={`px-6 py-4 font-semibold uppercase tracking-wider ${getAlignClass(
                      header.align
                    )} ${header.className || ''}`}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/35 text-sm text-on-surface">
              {items.map((item, index) => renderRow(item, index))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE CARD VIEW */}
      {/* ------------------------------------------------------------- */}
      <div className="md:hidden flex flex-col gap-4">
        {items.map((item, index) => renderCard(item, index))}
      </div>
    </div>
  );
}

export default DataTable;

