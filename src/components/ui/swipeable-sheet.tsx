/**
 * SwipeableSheet Component
 * 
 * Drawer component with swipe-to-close gesture support.
 * Built on top of vaul (https://github.com/emilkowalski/vaul)
 * 
 * API compatible with Radix UI Sheet for easy migration.
 * 
 * Features:
 * - Swipe gesture to close (native mobile UX)
 * - Proper physics (velocity, spring animation)
 * - Touch-friendly
 * - Keyboard support (Escape to close)
 * 
 * Usage:
 * ```tsx
 * <SwipeableSheet>
 *   <SwipeableSheetTrigger asChild>
 *     <Button>Open Menu</Button>
 *   </SwipeableSheetTrigger>
 *   <SwipeableSheetContent side="left">
 *     <SwipeableSheetHeader>
 *       <SwipeableSheetTitle>Menu</SwipeableSheetTitle>
 *     </SwipeableSheetHeader>
 *     <nav>...</nav>
 *   </SwipeableSheetContent>
 * </SwipeableSheet>
 * ```
 */

"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Root component
const SwipeableSheet = Drawer.Root;

// Trigger
const SwipeableSheetTrigger = Drawer.Trigger;

// Close button
const SwipeableSheetClose = Drawer.Close;

// Portal
const SwipeableSheetPortal = Drawer.Portal;

// Overlay
const SwipeableSheetOverlay = React.forwardRef<
  React.ElementRef<typeof Drawer.Overlay>,
  React.ComponentPropsWithoutRef<typeof Drawer.Overlay>
>(({ className, ...props }, ref) => (
  <Drawer.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SwipeableSheetOverlay.displayName = "SwipeableSheetOverlay";

// Content (main drawer component with swipe support)
interface SwipeableSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof Drawer.Content> {
  side?: "left" | "right";
}

const SwipeableSheetContent = React.forwardRef<
  React.ElementRef<typeof Drawer.Content>,
  SwipeableSheetContentProps
>(({ side = "left", className, children, ...props }, ref) => (
  <SwipeableSheetPortal>
    <SwipeableSheetOverlay />
    <Drawer.Content
      ref={ref}
      className={cn(
        "fixed z-50 bg-white p-6 shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:duration-300 data-[state=open]:duration-500",
        side === "left" 
          ? "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm"
          : "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
      <Drawer.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#FF6F2C] focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Закрыть</span>
      </Drawer.Close>
    </Drawer.Content>
  </SwipeableSheetPortal>
));
SwipeableSheetContent.displayName = "SwipeableSheetContent";

// Header
const SwipeableSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SwipeableSheetHeader.displayName = "SwipeableSheetHeader";

// Title
const SwipeableSheetTitle = React.forwardRef<
  React.ElementRef<typeof Drawer.Title>,
  React.ComponentPropsWithoutRef<typeof Drawer.Title>
>(({ className, ...props }, ref) => (
  <Drawer.Title
    ref={ref}
    className={cn("text-lg font-semibold text-[#111827]", className)}
    {...props}
  />
));
SwipeableSheetTitle.displayName = "SwipeableSheetTitle";

// Description (optional)
const SwipeableSheetDescription = React.forwardRef<
  React.ElementRef<typeof Drawer.Description>,
  React.ComponentPropsWithoutRef<typeof Drawer.Description>
>(({ className, ...props }, ref) => (
  <Drawer.Description
    ref={ref}
    className={cn("text-sm text-[#6B7280]", className)}
    {...props}
  />
));
SwipeableSheetDescription.displayName = "SwipeableSheetDescription";

export {
  SwipeableSheet,
  SwipeableSheetPortal,
  SwipeableSheetOverlay,
  SwipeableSheetTrigger,
  SwipeableSheetClose,
  SwipeableSheetContent,
  SwipeableSheetHeader,
  SwipeableSheetTitle,
  SwipeableSheetDescription,
};
