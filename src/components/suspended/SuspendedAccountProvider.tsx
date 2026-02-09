/**
 * Suspended Account Provider
 * 
 * Global context for showing "Account suspended" modal.
 * Triggered by handleApiErrorCore when 403 USER_SUSPENDED is detected.
 * 
 * DESIGN:
 * - No redirect, no session invalidation
 * - Simple informational modal
 * - User can dismiss and see read-only content
 * 
 * Render once in app layout, above BillingModalHost.
 */

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

// ============================================================================
// Context
// ============================================================================

interface SuspendedAccountContextValue {
  showSuspendedModal: () => void;
}

const SuspendedAccountContext = React.createContext<SuspendedAccountContextValue | null>(null);

export function useSuspendedAccount(): SuspendedAccountContextValue {
  const ctx = React.useContext(SuspendedAccountContext);
  if (!ctx) {
    // Fallback: no-op if provider is not mounted
    return { showSuspendedModal: () => {} };
  }
  return ctx;
}

// ============================================================================
// Modal
// ============================================================================

function SuspendedAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Аккаунт приостановлен
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="py-4">
          <p className="text-sm text-gray-700">
            Ваш аккаунт приостановлен. Обратитесь в поддержку по указанным контактам.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Понятно</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Provider
// ============================================================================

interface SuspendedAccountProviderProps {
  children: React.ReactNode;
}

export function SuspendedAccountProvider({ children }: SuspendedAccountProviderProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const value = React.useMemo<SuspendedAccountContextValue>(
    () => ({
      showSuspendedModal: () => setIsOpen(true),
    }),
    []
  );

  return (
    <SuspendedAccountContext.Provider value={value}>
      {children}
      <SuspendedAccountModal open={isOpen} onClose={() => setIsOpen(false)} />
    </SuspendedAccountContext.Provider>
  );
}
