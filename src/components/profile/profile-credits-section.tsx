/**
 * Profile Credits Section
 * 
 * Отображает available и consumed credits с деталями.
 * Показывает историю использования апгрейдов.
 */

"use client";

import { useState, useEffect } from "react";
import { Zap, Calendar, Users, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { formatDateTime } from "@/lib/utils/dates";
import { parseApiResponse, ClientError } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";
import Link from "next/link";

interface CreditData {
  available: Array<{
    id: string;
    creditCode: string;
    createdAt: string;
    sourceTransaction?: {
      productCode: string;
      amount: number;
      currencyCode: string;
      createdAt: string;
    };
  }>;
  consumed: Array<{
    id: string;
    creditCode: string;
    consumedAt: string;
    consumedEvent?: {
      id: string;
      slug: string;
      title: string;
      startDate: string;
      maxParticipants: number | null;
    };
    sourceTransaction?: {
      productCode: string;
    };
  }>;
  count: {
    available: number;
    consumed: number;
    total: number;
  };
}

export function ProfileCreditsSection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CreditData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/profile/credits");
      const result = await parseApiResponse<CreditData>(res);
      setData(result);
    } catch (err) {
      if (err instanceof ClientError) {
        log.error("[ProfileCredits] Failed to load credits", { code: err.code });
        setError("Не удалось загрузить данные об апгрейдах");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <DelayedSpinner delay={300} size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {data.count.available}
                </p>
                <p className="text-sm text-muted-foreground">Доступно</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-3">
                <Zap className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {data.count.consumed}
                </p>
                <p className="text-sm text-muted-foreground">Использовано</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--color-primary-bg)] p-3">
                <Zap className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {data.count.total}
                </p>
                <p className="text-sm text-muted-foreground">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Credits */}
      {data.available.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Доступные апгрейды
          </h3>
          <div className="space-y-3">
            {data.available.map((credit) => (
              <Card key={credit.id} className="border-green-200 bg-green-50">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-[var(--color-text)]">
                          Событие до 500 участников
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Получен: {formatDateTime(credit.createdAt)}
                        </p>
                        {credit.sourceTransaction && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Покупка: {credit.sourceTransaction.amount}{" "}
                            {credit.sourceTransaction.currencyCode}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      Доступен
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Consumed Credits */}
      {data.consumed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            История использования
          </h3>
          <div className="space-y-3">
            {data.consumed.map((credit) => (
              <Card key={credit.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)]">
                          Событие до 500 участников
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3.5 w-3.5 inline mr-1" />
                          Использован: {formatDateTime(credit.consumedAt)}
                        </p>
                        {credit.consumedEvent && (
                          <div className="mt-2 rounded-lg bg-[var(--color-bg-subtle)] p-3">
                            <Link
                              href={`/events/${credit.consumedEvent.slug}`}
                              className="flex items-start gap-2 group"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                                  {credit.consumedEvent.title}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {formatDateTime(credit.consumedEvent.startDate)}
                                  </span>
                                  {credit.consumedEvent.maxParticipants && (
                                    <span>
                                      <Users className="h-3 w-3 inline mr-1" />
                                      {credit.consumedEvent.maxParticipants} чел.
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[var(--color-primary)] transition-colors" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">Использован</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.count.total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-[var(--color-text)] mb-2">
              У вас пока нет апгрейдов
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Покупайте апгрейды для создания событий с большим количеством участников
            </p>
            <Button asChild>
              <Link href="/pricing">Посмотреть тарифы</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

