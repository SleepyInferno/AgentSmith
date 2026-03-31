import { useCallback, useEffect, useState } from "react";

export type ToastState = { message: string; ok: boolean } | null;

export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(id);
  }, [toast, durationMs]);
  return { toast, showToast };
}
