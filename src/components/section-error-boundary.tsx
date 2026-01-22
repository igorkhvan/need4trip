"use client";

/**
 * SectionErrorBoundary Component
 * 
 * SSOT_EVENTS_UX_V1.1 §3: Section-level failure isolation
 * - MUST NOT collapse the entire page
 * - MUST render a local error container
 * - Retry action scoped to the failed section
 * 
 * SSOT_UI_STATES.md §4.2: Error Scope
 * - Section-level: Section replaced, page preserved
 * 
 * SSOT_UI_COPY.md §4.2: Canonical error messages
 */

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** Section name for error message context */
  sectionName?: string;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom retry handler */
  onRetry?: () => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary${this.props.sectionName ? ` - ${this.props.sectionName}` : ''}] Error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // SSOT_EVENTS_UX_V1.1 §3: Section-level error container
      // SSOT_UI_STATES.md §4.3: Error container distinct from content
      return (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              {/* SSOT_UI_STATES.md §4.2: Clear error message */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2]">
                <AlertCircle className="h-6 w-6 text-[#DC2626]" />
              </div>
              
              {/* SSOT_UI_COPY.md §4.2: Generic fetch error */}
              <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">
                Не удалось загрузить данные
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                {this.props.sectionName 
                  ? `Произошла ошибка при загрузке: ${this.props.sectionName}`
                  : 'Произошла ошибка при загрузке раздела'
                }
              </p>
              
              {/* SSOT_UI_COPY.md §4.3: Retry copy */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Попробовать снова
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
