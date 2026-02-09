/**
 * Abuse Dashboard — Client Component
 *
 * Renders the abuse/anomaly dashboard with auto-refresh.
 *
 * Auto-refresh strategy:
 *   Uses router.refresh() every 7 seconds to trigger RSC re-render
 *   on the server. This keeps data fresh while respecting ADR-001.5
 *   (no client → HTTP API calls for data; RSC → service layer).
 *
 * This component is READ-ONLY. No write actions, no mutations.
 *
 * @see docs/adr/active/ADR-001.5.md
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AbuseSystemOverview, AbuseUserSummary } from '@/lib/services/adminAbuse';

// ============================================================================
// Props
// ============================================================================

interface AbuseDashboardClientProps {
  data: AbuseSystemOverview;
}

// ============================================================================
// Status badge component
// ============================================================================

function StatusBadge({ status }: { status: AbuseUserSummary['status'] }) {
  const config = {
    normal: {
      label: 'Normal',
      className: 'bg-green-50 text-green-700 ring-green-600/20',
    },
    watch: {
      label: 'Watch',
      className: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
    },
    suspicious: {
      label: 'Suspicious',
      className: 'bg-red-50 text-red-700 ring-red-600/20',
    },
  } as const;

  const { label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// System metrics panel
// ============================================================================

function SystemPanel({ data }: { data: AbuseSystemOverview }) {
  const cards = [
    {
      label: 'Write ops / min',
      value: data.systemMetrics.total_writes,
      color: 'text-gray-900',
    },
    {
      label: '429 errors / min',
      value: data.systemMetrics['errors.429'],
      color: data.systemMetrics['errors.429'] > 0 ? 'text-red-600' : 'text-gray-900',
    },
    {
      label: '402 errors / min',
      value: data.systemMetrics['errors.402'],
      color: data.systemMetrics['errors.402'] > 0 ? 'text-amber-600' : 'text-gray-900',
    },
    {
      label: '403 errors / min',
      value: data.systemMetrics['errors.403'],
      color: data.systemMetrics['errors.403'] > 0 ? 'text-red-600' : 'text-gray-900',
    },
    {
      label: 'Active users',
      value: data.activeUserCount,
      color: 'text-gray-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <p className="text-xs font-medium text-gray-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Users table
// ============================================================================

const TABLE_COLUMNS = [
  { key: 'userId', label: 'User ID' },
  { key: 'events.create', label: 'events.create' },
  { key: 'events.update', label: 'events.update' },
  { key: 'clubs.create', label: 'clubs.create' },
  { key: 'join_requests', label: 'join_requests' },
  { key: 'club_audit_log', label: 'audit_log.actions' },
  { key: 'errors.402', label: 'err.402' },
  { key: 'errors.403', label: 'err.403' },
  { key: 'create_then_delete', label: 'create→del' },
  { key: 'ai.calls', label: 'ai.calls' },
  { key: 'score', label: 'Score' },
  { key: 'status', label: 'Status' },
] as const;

function UsersTable({ users }: { users: AbuseUserSummary[] }) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Нет активных пользователей за последние 15 минут
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
              {/* userId */}
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-700">
                {user.userId.length > 12
                  ? `${user.userId.slice(0, 8)}...${user.userId.slice(-4)}`
                  : user.userId}
              </td>
              {/* events.create */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['events.create']}
              </td>
              {/* events.update */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['events.update']}
              </td>
              {/* clubs.create */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['clubs.create']}
              </td>
              {/* join_requests */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['join_requests.create']}
              </td>
              {/* club_audit_log.actions */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['club_audit_log.actions']}
              </td>
              {/* errors.402 */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['errors.402']}
              </td>
              {/* errors.403 */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['errors.403']}
              </td>
              {/* create_then_delete */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.createThenDelete}
              </td>
              {/* ai.calls */}
              <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                {user.metrics['ai.generate_rules']}
              </td>
              {/* score */}
              <td className="whitespace-nowrap px-3 py-2 text-center font-semibold tabular-nums">
                {user.score}
              </td>
              {/* status */}
              <td className="whitespace-nowrap px-3 py-2">
                <StatusBadge status={user.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function AbuseDashboardClient({ data }: AbuseDashboardClientProps) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<string>(data.timestamp);

  // Auto-refresh every 7 seconds via router.refresh() (triggers RSC re-render)
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 7000);

    return () => clearInterval(interval);
  }, [router]);

  // Track latest timestamp
  useEffect(() => {
    setLastRefresh(data.timestamp);
  }, [data.timestamp]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Abuse / Anomaly Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Observability only — read-only, no blocking
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            Window: {data.windowMinutes} min
          </p>
          <p className="text-xs text-gray-400">
            Updated: {new Date(lastRefresh).toLocaleTimeString()}
          </p>
          <div className="mt-1 flex items-center gap-1.5 justify-end">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-green-600">Live (7s)</span>
          </div>
        </div>
      </div>

      {/* System Summary Panel */}
      <SystemPanel data={data} />

      {/* Users Table */}
      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-900">
          Per-User Activity ({data.topUsers.length})
        </h2>
        <UsersTable users={data.topUsers} />
      </div>

      {/* Info Notice */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs text-gray-500">
          <strong>Read-only dashboard.</strong> Score is a visual aid for sorting
          — it does not trigger any automated actions. Per-user metrics reflect a
          rolling {data.windowMinutes}-minute window. System metrics show the
          current-minute rate.
        </p>
      </div>
    </div>
  );
}
