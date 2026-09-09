"use client";

export default function GlobalErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, background: "#0E0D10", color: "#F7F3EC", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100dvh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "3.75rem", lineHeight: 1 }}>💫</div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, opacity: 0.9 }}>Something went wrong</h1>
          <p style={{ margin: 0, maxWidth: "20rem", fontSize: "1rem", opacity: 0.5 }}>A quiet reset should help. Tap below.</p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(201,168,106,0.35)",
              background: "rgba(201,168,106,0.07)",
              color: "#C9A86A",
              fontWeight: 700,
              fontSize: "0.86rem",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </body>
    </html>
  );
}
