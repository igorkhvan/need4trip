/**
 * Feedback Table — Client Component
 *
 * Renders feedback entries with type filter tabs and expandable messages.
 * READ-ONLY — no mutations.
 *
 * @see docs/adr/active/ADR-001.5.md
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminFeedbackResult, FeedbackType } from '@/lib/services/feedbackService';

// ============================================================================
// Props
// ============================================================================

interface FeedbackTableClientProps {
  initialData: AdminFeedbackResult;
}

// ============================================================================
// Type filter tabs
// ============================================================================

const TABS: Array<{ label: string; value: FeedbackType | 'all' }> = [
  { label: 'Все', value: 'all' },
  { label: 'Идеи', value: 'idea' },
  { label: 'Баги', value: 'bug' },
  { label: 'Фидбэк', value: 'feedback' },
];

// ============================================================================
// Type badge
// ============================================================================

function TypeBadge({ type }: { type: FeedbackType }) {
  const config = {
    idea: {
      label: 'Idea',
      className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    },
    bug: {
      label: 'Bug',
      className: 'bg-red-50 text-red-700 ring-red-600/20',
    },
    feedback: {
      label: 'Feedback',
      className: 'bg-gray-50 text-gray-700 ring-gray-600/20',
    },
  } as const;

  const { label, className } = config[type];

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Expandable message cell
// ============================================================================

function MessageCell({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = message.length > 120;

  return (
    <div>
      <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
        {expanded || !isLong ? message : `${message.slice(0, 120)}...`}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
        >
          {expanded ? 'Свернуть' : 'Развернуть'}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Date formatter
// ============================================================================

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Main component
// ============================================================================

export function FeedbackTableClient({ initialData }: FeedbackTableClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedbackType | 'all'>('all');

  // Client-side filtering from initial data
  const filteredItems =
    activeTab === 'all'
      ? initialData.items
      : initialData.items.filter((item) => item.type === activeTab);

  // Refresh data via RSC re-render
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">
            {initialData.total} записей всего
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Обновить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          const count =
            tab.value === 'all'
              ? initialData.items.length
              : initialData.items.filter((i) => i.type === tab.value).length;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          Нет записей
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сообщение
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Страница
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <TypeBadge type={item.type} />
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <MessageCell message={item.message} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-gray-500">
                      {item.userId.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-500">
                      {item.pagePath ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
