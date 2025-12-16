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
 */
export function ErrorFallback({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Ошибка загрузки</CardTitle>
              <CardDescription>
                Не удалось загрузить данные
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-lg bg-gray-100 p-4">
              <p className="text-sm font-mono text-gray-700">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} className="flex items-center gap-2">
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
