import type { ToastState } from "../hooks/useToast";

type ToastProps = {
  toast: ToastState;
};

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  const isOk = toast.ok;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "28px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        minWidth: "280px",
        maxWidth: "480px",
        padding: "14px 18px",
        borderRadius: "14px",
        border: isOk
          ? "1px solid rgba(129, 255, 164, 0.22)"
          : "1px solid rgba(216, 93, 70, 0.34)",
        background: isOk
          ? "rgba(10, 30, 12, 0.7)"
          : "rgba(216, 93, 70, 0.12)",
        color: isOk ? "#9bffa3" : "#ffd8cf",
        fontSize: "0.9rem",
        fontWeight: 600,
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      {toast.message}
    </div>
  );
}
