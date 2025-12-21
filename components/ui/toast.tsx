"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "rgb(var(--popover))",
          color: "rgb(var(--popover-foreground))",
          border: "1px solid rgb(var(--border))",
          borderRadius: "var(--radius)",
          padding: "16px",
        },
        success: {
          iconTheme: {
            primary: "rgb(var(--primary))",
            secondary: "rgb(var(--primary-foreground))",
          },
        },
        error: {
          iconTheme: {
            primary: "rgb(var(--destructive))",
            secondary: "rgb(var(--destructive-foreground))",
          },
        },
      }}
    />
  );
}







