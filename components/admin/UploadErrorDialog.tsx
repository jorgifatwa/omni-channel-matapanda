"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Pop-up shown when an image upload to Backblaze B2 fails.
 * Pass `message = null` to keep it closed.
 */
export function UploadErrorDialog({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!message} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>Upload Gambar Gagal</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button type="button" onClick={onClose}>
            Mengerti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Reads the error message returned by /api/upload, with a fallback. */
export async function readUploadError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return String(data.error);
  } catch {
    // ignore non-JSON bodies
  }
  return `Gagal mengunggah gambar (HTTP ${res.status}).`;
}
