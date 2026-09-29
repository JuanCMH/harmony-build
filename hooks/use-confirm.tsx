import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { JSX, useState } from "react";

interface UseConfirmProps {
  title: string;
  message: string;
  type?: "info" | "warning" | "critical";
  cancelText?: string;
  confirmText?: string;
}

export const useConfirm = ({
  title,
  message,
  type = "info",
  cancelText = "Cancelar",
  confirmText = "Confirmar",
}: UseConfirmProps): [() => JSX.Element, () => Promise<boolean | null>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean | null) => void;
  } | null>(null);

  const confirm = () =>
    new Promise<boolean | null>((resolve, reject) => {
      setPromise({ resolve });
    });

  const handleClose = (resolved = false) => {
    if (promise && !resolved) {
      promise.resolve(null);
    }
    setPromise(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const handleCancel = () => {
    if (promise) {
      promise.resolve(false);
    }
    handleClose(true);
  };

  const handleConfirm = () => {
    if (promise) {
      promise.resolve(true);
    }
    handleClose(true);
  };

  const ConfirmDialog = () => (
    <Dialog open={promise !== null} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="p-0 overflow-hidden gap-0 z-[100]">
        <DialogHeader className="p-4">
          <div className="flex items-center gap-1">
            {type === "info" && (
              <Info className="size-5 shrink-0" />
            )}
            {type === "warning" && (
              <TriangleAlert className="size-5 text-yellow-500 shrink-0" />
            )}
            {type === "critical" && (
              <OctagonAlert className="size-5 text-red-500 shrink-0" />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <Separator />
        <DialogFooter className="p-4">
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button onClick={handleConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [ConfirmDialog, confirm];
};
