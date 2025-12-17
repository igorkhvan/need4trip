/**
 * Notification Settings Form Component
 * Manages user preferences for Telegram notifications
 */

"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { NotificationSettings } from "@/lib/types/notification";
import { 
  NotificationType, 
  NotificationTypeLabel, 
  NotificationTypeDescription 
} from "@/lib/constants/notificationTypes";

export function NotificationSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('[NotificationSettingsForm] Loading settings...');
      const res = await fetch('/api/profile/notifications');
      
      console.log('[NotificationSettingsForm] Response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[NotificationSettingsForm] Error response:', errorData);
        throw new Error('Failed to load settings');
      }
      
      const data = await res.json();
      console.log('[NotificationSettingsForm] Settings loaded:', data);
      setSettings(data.settings);
    } catch (err) {
      console.error('[NotificationSettingsForm] Load error:', err);
      setError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      const res = await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTelegramEnabled: settings.isTelegramEnabled,
          notifyEventUpdated: settings.notifyEventUpdated,
          notifyNewEventPublished: settings.notifyNewEventPublished,
          notifyEventCancelled: settings.notifyEventCancelled,
          notifyNewParticipantJoined: settings.notifyNewParticipantJoined,
          notifyEventReminder: settings.notifyEventReminder,
          notifyOrganizerMessage: settings.notifyOrganizerMessage,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save settings');
      }
      
      const data = await res.json();
      setSettings(data.settings);
      
      // Show success indicator
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('[NotificationSettingsForm] Save error:', err);
      setError('Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof Omit<NotificationSettings, 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  if (loading) {
    console.log('[NotificationSettingsForm] Rendering loading state');
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Загрузка настроек...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !settings) {
    console.log('[NotificationSettingsForm] Rendering error state:', error);
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Проверьте консоль браузера для подробностей</p>
          <Button onClick={loadSettings} className="mt-4">
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    console.log('[NotificationSettingsForm] No settings, returning null');
    return null;
  }
  
  console.log('[NotificationSettingsForm] Rendering settings form');

  const notificationTypes = [
    {
      key: 'notifyEventUpdated' as const,
      type: NotificationType.EVENT_UPDATED,
    },
    {
      key: 'notifyNewEventPublished' as const,
      type: NotificationType.NEW_EVENT_PUBLISHED,
    },
    {
      key: 'notifyNewParticipantJoined' as const,
      type: NotificationType.NEW_PARTICIPANT_JOINED,
    },
    {
      key: 'notifyEventCancelled' as const,
      type: NotificationType.EVENT_CANCELLED,
    },
    {
      key: 'notifyEventReminder' as const,
      type: NotificationType.EVENT_REMINDER,
    },
    {
      key: 'notifyOrganizerMessage' as const,
      type: NotificationType.ORGANIZER_MESSAGE,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Telegram Enable/Disable */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1">
                  Уведомления в Telegram
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {settings.isTelegramEnabled
                    ? "Вы будете получать уведомления в Telegram согласно выбранным настройкам"
                    : "Уведомления отключены. Включите для получения важных обновлений"}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.isTelegramEnabled}
              onCheckedChange={() => toggleSetting('isTelegramEnabled')}
              className="flex-shrink-0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      {settings.isTelegramEnabled && (
        <Card>
          <CardContent className="p-5 md:p-6">
            <h3 className="mb-4">Типы уведомлений</h3>
            <div className="space-y-4">
              {notificationTypes.map(({ key, type }) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      {NotificationTypeLabel[type]}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {NotificationTypeDescription[type]}
                    </div>
                  </div>
                  <Switch
                    checked={settings[key]}
                    onCheckedChange={() => toggleSetting(key)}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[140px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Сохранено
            </>
          ) : (
            'Сохранить'
          )}
        </Button>
        
        {saveSuccess && (
          <span className="text-sm text-green-600 animate-in fade-in duration-200">
            Настройки успешно обновлены
          </span>
        )}
      </div>
    </div>
  );
}
