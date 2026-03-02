import React from "react";
import { Alert, Snackbar } from "@mui/material";

type Toast = { message: string; severity: "success" | "info" | "warning" | "error" };

const ToastContext = React.createContext<{ toast: (t: Toast) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [toastState, setToastState] = React.useState<Toast>({ message: "", severity: "info" });

  function toast(t: Toast) {
    setToastState(t);
    setOpen(true);
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Snackbar open={open} autoHideDuration={3500} onClose={() => setOpen(false)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setOpen(false)} severity={toastState.severity} variant="filled" sx={{ width: "100%" }}>
          {toastState.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa do ToastProvider");
  return ctx;
}
