"use client";

/**
 * Global Error Handler (Root Level)
 * 
 * Handles critical errors at the root level, including errors in root layout.
 * Uses inline styles because CSS may not be loaded.
 * 
 * SSOT: SSOT_UX_GOVERNANCE.md §2.2 — SYSTEM pages MUST use STANDARD width
 * SSOT: SSOT_UI_STATES.md §4 — ERROR state with retry action
 * SSOT: SSOT_UI_COPY.md §4.2 — Canonical error copy
 * FIX: Unified structure, wider container, guaranteed navigation escape
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
        {/* SSOT: page-container equivalent via inline styles (max-width: 1280px) */}
        <div style={{ 
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "4rem 1rem",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <div style={{ 
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center"
          }}>
            {/* Error icon */}
            <div style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "9999px",
              backgroundColor: "#FEF2F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem"
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1 style={{ 
              fontSize: "1.5rem", 
              fontWeight: "700", 
              color: "#111827",
              marginBottom: "0.75rem" 
            }}>
              Произошла ошибка
            </h1>
            
            <p style={{ 
              color: "#6b7280", 
              marginBottom: "2rem",
              maxWidth: "28rem"
            }}>
              Не удалось загрузить страницу
            </p>
            
            {/* SSOT: SSOT_UI_STATES.md §4.2 — Retry + navigation escape */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={reset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.25rem",
                  backgroundColor: "#FF6F2C",
                  color: "white",
                  border: "none",
                  borderRadius: "0.75rem",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Попробовать снова
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.75rem 1.25rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  textDecoration: "none",
                  color: "#111827",
                  fontWeight: "500"
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
