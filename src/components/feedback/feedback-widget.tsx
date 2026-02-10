/**
 * Feedback Widget — Floating Button + Modal
 *
 * Allows authenticated users to submit ideas, bugs, or general feedback.
 *
 * UX RULES:
 * - Visible ONLY for authenticated users
 * - Suspended users cannot reach this (assertNotSuspended blocks auth)
 * - No promises of reply, no SLA
 * - Rate limit: 3/24h (enforced server-side)
 *
 * @see src/app/api/feedback/route.ts — API-069
 * @see src/lib/services/feedbackService.ts
 */

'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// Types
// ============================================================================

type FeedbackType = 'idea' | 'bug' | 'feedback';

interface FeedbackState {
  type: FeedbackType;
  message: string;
}

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string; emoji: string }> = [
  { value: 'idea', label: 'Идея', emoji: '💡' },
  { value: 'bug', label: 'Баг', emoji: '🐛' },
  { value: 'feedback', label: 'Отзыв', emoji: '💬' },
];

const MIN_MESSAGE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 2000;

// ============================================================================
// Component
// ============================================================================

export function FeedbackWidget() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FeedbackState>({ type: 'feedback', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setForm({ type: 'feedback', message: '' });
    setError(null);
    setSubmitted(false);
  }, []);

  // Don't render for unauthenticated users
  if (!isAuthenticated) return null;

  // Don't render on admin pages
  if (pathname.startsWith('/admin')) return null;

  const trimmedMessage = form.message.trim();
  const charCount = trimmedMessage.length;
  const isValid = charCount >= MIN_MESSAGE_LENGTH && charCount <= MAX_MESSAGE_LENGTH;

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          message: trimmedMessage,
          pagePath: pathname,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 400 validation error
        setError(data.error?.message ?? 'Не удалось отправить');
        return;
      }

      // Rate limit: server returns { data: { rateLimited: true }, message: "..." }
      if (data.data?.rateLimited) {
        setError('Вы уже отправляли отзывы сегодня. Попробуйте завтра.');
        return;
      }

      // 201 = real insert, 200 = dedup (silent success per spec)
      setSubmitted(true);
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button — bottom right */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-xl active:scale-95 md:h-14 md:w-14"
        aria-label="Оставить отзыв"
      >
        <MessageSquarePlus className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      {/* Feedback modal */}
      <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Обратная связь</DialogTitle>
          </DialogHeader>

          {submitted ? (
            /* Success state */
            <>
              <DialogBody className="py-8 text-center">
                <div className="mb-3 text-4xl">🙏</div>
                <p className="text-base font-medium text-gray-900">Спасибо за отзыв!</p>
                <p className="mt-2 text-sm text-gray-500">
                  Мы читаем каждое сообщение.
                </p>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Закрыть
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* Form state */
            <>
              <DialogBody className="space-y-4">
                {/* Type selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Тип
                  </label>
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          form.type === opt.value
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Сообщение
                  </label>
                  <Textarea
                    placeholder="Опишите вашу идею, проблему или отзыв (минимум 20 символов)..."
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="min-h-[120px]"
                    maxLength={MAX_MESSAGE_LENGTH}
                  />
                  <div className="mt-1 flex justify-between text-xs text-gray-400">
                    <span>
                      {charCount < MIN_MESSAGE_LENGTH
                        ? `Ещё ${MIN_MESSAGE_LENGTH - charCount} симв.`
                        : ''}
                    </span>
                    <span>{charCount} / {MAX_MESSAGE_LENGTH}</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </DialogBody>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Отмена
                </Button>
                <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
                  {isSubmitting ? 'Отправка...' : 'Отправить'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
