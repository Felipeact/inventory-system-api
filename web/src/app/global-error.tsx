"use client";

/**
 * Global error boundary — the last line of defence. Catches errors thrown in the root
 * layout itself (where `error.tsx` cannot run) and must render its own <html>/<body>.
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
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          gap: "1rem",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: "#475569", maxWidth: "28rem" }}>
          A critical error occurred while loading the application. Please reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.625rem 1.25rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
