/**
 * Beta Participant Limit Modal
 *
 * System-level modal shown in SOFT_BETA_STRICT mode when
 * user attempts to set participant count > 500.
 *
 * UI state classification: PENDING (per SSOT_UI_STATES.md)
 * - System awaiting user acknowledgment
 * - Not an error, not forbidden, not empty
 *
 * Copy source: SSOT_UI_COPY.md §7.4 via BETA_PARTICIPANT_LIMIT_COPY
 *
 * IMPORTANT:
 * - This is NOT a paywall.
 * - No billing, pricing, upgrade, or club references.
 * - Single primary action: Acknowledge / Close.
 * - No secondary actions.
 *
 * SSOT: docs/ui-contracts/system/UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md
 * SSOT: docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md §3.5
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BETA_PARTICIPANT_LIMIT_COPY } from "@/lib/config/betaParticipantLimit";

interface BetaParticipantLimitModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal is closed (user acknowledges) */
  onClose: () => void;
}

/**
 * BetaParticipantLimitModal — PENDING state modal for beta participant cap.
 *
 * Shown when:
 * - PAYWALL_MODE = SOFT_BETA_STRICT
 * - User attempts to save/publish event with > 500 participants
 *
 * Behavior:
 * - Blocks event save/publish while shown
 * - Closing returns user to the form
 * - Participant value remains unchanged (user must reduce to ≤500)
 */
export function BetaParticipantLimitModal({
  open,
  onClose,
}: BetaParticipantLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{BETA_PARTICIPANT_LIMIT_COPY.title}</DialogTitle>
          <DialogDescription>
            {BETA_PARTICIPANT_LIMIT_COPY.message}
          </DialogDescription>
        </DialogHeader>
        <DialogBody />
        <DialogFooter>
          <Button onClick={onClose}>
            {BETA_PARTICIPANT_LIMIT_COPY.primaryAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
