import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideToConfirm } from "@/components/ui/slide-to-confirm";
import type { Employee } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Trash2,
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  Building2,
  ShieldAlert,
} from "lucide-react";

interface DeleteEmployeeDialogProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onConfirmDelete: (employee: Employee) => void | Promise<void>;
}

export function DeleteEmployeeDialog({
  employee,
  open,
  onClose,
  onConfirmDelete,
}: DeleteEmployeeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Preserve employee reference during smooth closing transitions
  const employeeRef = useRef<Employee | null>(null);
  if (employee) {
    employeeRef.current = employee;
  }
  const currentEmployee = employee || employeeRef.current;

  // Reset states whenever modal is reopened
  useEffect(() => {
    if (open) {
      setIsDeleting(false);
      setIsSuccess(false);
      setIsClosing(false);
    }
  }, [open]);

  if (!currentEmployee) return null;

  const handleConfirm = async () => {
    if (!currentEmployee || isDeleting) return;

    setIsDeleting(true);

    try {
      // 1. Show the red track with "Deleting..." and spinner for 1000ms
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 2. Perform the actual deletion in store
      await onConfirmDelete(currentEmployee);

      // 3. Briefly show the checkmark on the knob for 300ms
      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 4. Smoothly animate out dialog before closing
      setIsClosing(true);
      await new Promise((resolve) => setTimeout(resolve, 220));

      onClose();
    } catch {
      setIsDeleting(false);
      setIsSuccess(false);
      setIsClosing(false);
    }
  };

  // Initials for avatar fallback
  const initials = currentEmployee.name
    ? currentEmployee.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("")
    : "EMP";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isDeleting && onClose()}>
      <DialogContent
        className={cn(
          "max-w-md w-full p-0 overflow-hidden border-rose-500/20 shadow-2xl rounded-2xl bg-card transition-all duration-200 ease-out",
          isClosing && "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Top visual warning banner */}
        <div className="relative bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent p-6 pb-4 border-b border-rose-500/10">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <AlertTriangle className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                Delete Employee
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete this employee? This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Employee Summary Card */}
          <div className="bg-muted/40 dark:bg-muted/20 border border-border/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-3">
              {currentEmployee.photoDataUrl ? (
                <img
                  src={currentEmployee.photoDataUrl}
                  alt={currentEmployee.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-border shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                  {initials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-foreground truncate">
                    {currentEmployee.name}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                    {currentEmployee.empCode}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 truncate">
                  {currentEmployee.designation && (
                    <span className="flex items-center gap-1 truncate">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      {currentEmployee.designation}
                    </span>
                  )}
                  {currentEmployee.designation && currentEmployee.department && <span>•</span>}
                  {currentEmployee.department && (
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {currentEmployee.department}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick contact details */}
            {(currentEmployee.email || currentEmployee.phone) && (
              <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                {currentEmployee.email && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{currentEmployee.email}</span>
                  </span>
                )}
                {currentEmployee.phone && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{currentEmployee.phone}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Destructive Callout */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold">Irreversible Action: </span>
              All attendance logs, documents, salary slips, and biometric assignments for this employee will be deleted immediately.
            </div>
          </div>

          {/* Slide to Delete Button Section */}
          <div className="pt-2 space-y-3">
            <div className="space-y-1.5 pt-1">
              <SlideToConfirm
                key={open ? currentEmployee.id : "inactive"}
                onConfirm={handleConfirm}
                text="Slide to confirm"
                completedText="Deleting..."
                isLoading={isDeleting}
                isSuccess={isSuccess}
                disabled={isDeleting}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel, keep employee
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
