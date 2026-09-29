"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ---------------------------------- Root ---------------------------------- */

interface HarmonyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxWidth?: string;
  children: React.ReactNode;
}

function HarmonyModal({
  open,
  onOpenChange,
  maxWidth,
  children,
}: HarmonyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden [&>form]:min-h-0 [&>form]:flex [&>form]:flex-col [&>form]:overflow-hidden",
          maxWidth,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Header --------------------------------- */

interface HarmonyModalHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  description?: string;
}

function HarmonyModalHeader({
  icon: Icon,
  iconClassName = "bg-h-indigo/10 border-h-indigo/10 text-h-indigo",
  title,
  description,
}: HarmonyModalHeaderProps) {
  return (
    <div className="shrink-0">
      <DialogHeader className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center size-10 rounded-xl border",
              iconClassName,
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold tracking-tight">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>
      </DialogHeader>
      <Separator className="opacity-40" />
    </div>
  );
}

/* --------------------------------- Content -------------------------------- */

interface HarmonyModalContentProps {
  children: React.ReactNode;
  className?: string;
}

function HarmonyModalContent({
  children,
  className,
}: HarmonyModalContentProps) {
  return (
    <div className={cn("p-4 min-h-0 overflow-y-auto", className)}>
      {children}
    </div>
  );
}

/* --------------------------------- Footer --------------------------------- */

interface HarmonyModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

function HarmonyModalFooter({ children, className }: HarmonyModalFooterProps) {
  return (
    <div className="shrink-0">
      <Separator className="opacity-40" />
      <div className={cn("flex items-center justify-end gap-2 p-4", className)}>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------- Exports -------------------------------- */

export {
  HarmonyModal,
  HarmonyModalHeader,
  HarmonyModalContent,
  HarmonyModalFooter,
  DialogClose,
};
