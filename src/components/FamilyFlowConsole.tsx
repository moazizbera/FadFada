"use client";

import { useState } from "react";

type TranscriptEntry = { direction: "request" | "response"; payload: unknown };

type FamilyFlowConsoleProps = {
  childProfileId: string;
  language: "ar" | "en";
  onRoutineChanged?: () => void;
};

// In-app web MCP client. Every button sends a real JSON-RPC request over
// Streamable HTTP to the self-hosted MCP server via /api/alexa/family-flow.
// The raw request/response pair is shown so the Alexa+ integration is inspectable.
export function FamilyFlowConsole({ childProfileId, language, onRoutineChanged }: FamilyFlowConsoleProps) {
  const isArabic = language === "ar";
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mutatingTools = new Set(["create_family_routine", "reschedule_family_routine", "approve_family_routine"]);

  async function callMcp(action: "initialize" | "tools_list" | "tools_call", extra: Record<string, unknown> = {}) {
    if (!childProfileId) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/alexa/family-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.transcript)) throw new Error(data.error || "MCP_CALL_FAILED");

      setTranscript((previous) => [...previous, ...(data.transcript as TranscriptEntry[])]);
      if (action === "tools_call" && typeof extra.name === "string" && mutatingTools.has(extra.name)) {
        onRoutineChanged?.();
      }
    } catch {
      setError(isArabic ? "تعذر إرسال الطلب إلى خادم MCP." : "The MCP server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  const buttons: Array<{ label: string; onClick: () => void; primary?: boolean }> = [
    { label: isArabic ? "1 · تهيئة" : "1 · initialize", onClick: () => void callMcp("initialize"), primary: true },
    { label: isArabic ? "2 · الأدوات" : "2 · tools/list", onClick: () => void callMcp("tools_list"), primary: true },
    { label: isArabic ? "3 · اقرأ الروتين" : "3 · get_family_routine", onClick: () => void callMcp("tools_call", { name: "get_family_routine", arguments: { childProfileId } }) },
    { label: isArabic ? "4 · أنشئ 25 دقيقة" : "4 · create 25 min", onClick: () => void callMcp("tools_call", { name: "create_family_routine", arguments: { childProfileId, subject: "math", detectedTask: "Addition to 20", totalMinutes: 25 } }) },
    { label: isArabic ? "5 · أعد جدولة 10" : "5 · reschedule 10 min", onClick: () => void callMcp("tools_call", { name: "reschedule_family_routine", arguments: { childProfileId, totalMinutes: 10 } }) },
    { label: isArabic ? "6 · اعتمد" : "6 · approve_family_routine", onClick: () => void callMcp("tools_call", { name: "approve_family_routine", arguments: { childProfileId } }) },
  ];

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="ui-kicker text-cyan-100">{isArabic ? "وحدة تحكم Alexa+ (MCP حي)" : "Alexa+ console (live MCP)"}</p>
        {transcript.length > 0 ? (
          <button
            type="button"
            onClick={() => setTranscript([])}
            className="font-arsans text-[11px] text-bone/45 hover:text-bone"
          >
            {isArabic ? "مسح" : "Clear"}
          </button>
        ) : null}
      </div>
      <p className="mt-1 font-arsans text-xs leading-5 text-bone/50">
        {isArabic
          ? "كل زر يرسل طلب JSON-RPC حقيقي عبر Streamable HTTP إلى خادم MCP المضيف ذاتياً. التوكن يبقى في الخادم ولا يصل إلى المتصفح."
          : "Each button sends a real JSON-RPC request over Streamable HTTP to the self-hosted MCP server. The token stays server-side and never reaches the browser."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            disabled={busy}
            onClick={button.onClick}
            className={`ui-action border px-2.5 py-1.5 text-[11px] disabled:opacity-50 ${
              button.primary ? "border-cyan-200/40 text-cyan-100 hover:bg-cyan-200 hover:text-ink" : "border-white/12 text-bone/75 hover:bg-bone/10"
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-2 font-arsans text-xs text-red-100">{error}</p> : null}

      {transcript.length > 0 ? (
        <div className="mt-3 max-h-72 overflow-auto border border-white/10 bg-black/24 p-2">
          {transcript.map((entry, index) => (
            <pre key={index} className="font-mono text-[10px] leading-4 text-bone/60">
              <span className={entry.direction === "request" ? "text-cyan-100/80" : "text-emerald-100/80"}>
                {entry.direction === "request" ? "> request " : "< response "}
              </span>
              {JSON.stringify(entry.payload)}
            </pre>
          ))}
        </div>
      ) : null}
    </div>
  );
}
