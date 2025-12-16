"use client";

/**
 * Global Error Handler (Root Level)
 * 
 * Обрабатывает критические ошибки на самом верхнем уровне,
 * включая ошибки в root layout.
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif"
        }}>
          <div style={{ 
            maxWidth: "32rem", 
            textAlign: "center",
            padding: "2rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem"
          }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
              Критическая ошибка
            </h1>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              Произошла критическая ошибка приложения
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer"
                }}
              >
                Попробовать снова
              </button>
              <a
                href="/"
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
