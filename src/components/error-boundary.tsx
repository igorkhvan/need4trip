"use client";

/**
 * Error Boundary Component
 * 
 * Глобальный компонент для обработки ошибок React.
 * Предоставляет graceful degradation при критических ошибках.
 */

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle>Что-то пошло не так</CardTitle>
                  <CardDescription>
                    Произошла непредвиденная ошибка
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-lg bg-gray-100 p-4">
                  <p className="text-sm font-mono text-gray-700">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={this.handleReset} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Попробовать снова
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/"}>
                  На главную
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based Error Boundary для использования в Server Components
 * 
 * SSOT: SSOT_UX_GOVERNANCE.md §2.2 — SYSTEM pages MUST use STANDARD width
 * SSOT: SSOT_UI_STATES.md §4 — ERROR state with retry action
 * SSOT: SSOT_UI_COPY.md §4.2 — Canonical error messages
 * FIX: Uses page-container for STANDARD width
 */
export function ErrorFallback({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset: () => void;
}) {
  return (
    <div className="page-container py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF2F2]">
          <AlertCircle className="h-10 w-10 text-[#DC2626]" />
        </div>

        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-3">
          Не удалось загрузить данные
        </h1>
        
        <p className="text-base text-muted-foreground mb-8 max-w-md">
          Произошла ошибка при загрузке страницы
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 rounded-lg bg-gray-100 p-4 max-w-lg w-full">
            <p className="text-sm font-mono text-gray-700 text-left">
              {error.message}
            </p>
          </div>
        )}

        {/* SSOT: SSOT_UI_STATES.md §4.2 — Retry or recovery action required */}
        <div className="flex gap-3">
          <Button onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            На главную
          </Button>
        </div>
      </div>
    </div>
  );
}
