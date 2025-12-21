/**
 * SwipeableSheet Component
 * 
 * Wrapper around Radix UI Sheet with swipe-to-close gesture support.
 * Uses react-swipeable for touch gesture detection.
 * 
 * Architecture:
 * - Sheet (Radix UI) → Handles UI, animations, positioning
 * - react-swipeable → Handles touch gesture detection
 * - This wrapper → Connects them together
 * 
 * Features:
 * - Swipe gesture to close (native mobile UX)
 * - Left drawer: swipe left to close
 * - Right drawer: swipe right to close
 * - Touch-friendly, prevents scroll during swipe
 * - Keyboard support inherited from Radix UI (Escape)
 * 
 * Usage:
 * ```tsx
 * <Sheet open={open} onOpenChange={setOpen}>
 *   <SheetTrigger asChild>
 *     <Button>Open Menu</Button>
 *   </SheetTrigger>
 *   <SwipeableSheetContent side="left" onOpenChange={setOpen}>
 *     <SheetHeader>
 *       <SheetTitle>Menu</SheetTitle>
 *     </SheetHeader>
 *     <nav>...</nav>
 *   </SwipeableSheetContent>
 * </Sheet>
 * ```
 */

"use client";

import * as React from "react";
import { useSwipeable } from "react-swipeable";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { SheetPortal, SheetOverlay } from "./sheet";
import { X } from "lucide-react";

// Import sheetVariants from sheet.tsx
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

interface SwipeableSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  onOpenChange?: (open: boolean) => void;
}

/**
 * SheetContent with swipe-to-close gesture support
 * 
 * Automatically detects swipe direction based on `side` prop:
 * - side="left" → swipe left to close
 * - side="right" → swipe right to close
 */
export const SwipeableSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SwipeableSheetContentProps
>(({ side = "left", onOpenChange, className, children, ...props }, forwardedRef) => {
  // Configure swipe handlers based on drawer side
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (side === "left") {
        onOpenChange?.(false);
      }
    },
    onSwipedRight: () => {
      if (side === "right") {
        onOpenChange?.(false);
      }
    },
    // Only track touch events (not mouse)
    trackMouse: false,
    // Prevent page scroll while swiping
    preventScrollOnSwipe: true,
    // Swipe velocity threshold (pixels per second)
    delta: 10,
  });

  // Merge refs: useSwipeable ref + forwarded ref
  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      // Apply swipeable ref
      handlers.ref(node);
      
      // Apply forwarded ref
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [handlers.ref, forwardedRef]
  );

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={mergedRef}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#FF6F2C] focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-[#F7F7F8]">
          <X className="h-4 w-4" />
          <span className="sr-only">Закрыть</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});

SwipeableSheetContent.displayName = "SwipeableSheetContent";

// Re-export everything else from sheet.tsx for convenience
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet";

