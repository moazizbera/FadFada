"use client";

import { useEffect, useRef, useState } from "react";
import PersonaSpeaking from "./PersonaSpeaking";

type Language = "ar" | "en";

type VoiceConfig = {
  locale: string;
  rate: number;
  pitch: number;
};

type ChildDrawingBoardProps = {
  language: Language;
  personaId: string;
  personaNameAr: string;
  personaNameEn: string;
  avatarPath: string;
  voiceConfig: VoiceConfig;
  edgeTtsVoiceName: string;
  onClose: () => void;
};

const COLORS = [
  "#FF4D4D", "#FF8C42", "#FFD23F", "#6BCB77",
  "#4D96FF", "#9B59B6", "#FF6B9D", "#00CEC9",
  "#F0F0F0", "#2D2D2D",
];

const BRUSH_SIZES = [4, 10, 20];

export default function ChildDrawingBoard({
  language,
  personaId,
  personaNameAr,
  personaNameEn,
  avatarPath,
  voiceConfig,
  edgeTtsVoiceName,
  onClose,
}: ChildDrawingBoardProps) {
  const isArabic = language === "ar";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [commentText, setCommentText] = useState("");
  const [commentStatus, setCommentStatus] = useState<"idle" | "loading" | "speaking" | "done">("idle");
  const [speakKey, setSpeakKey] = useState(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (commentStatus !== "speaking") return;
    const timer = window.setTimeout(() => setCommentStatus("done"), 12000);
    return () => window.clearTimeout(timer);
  }, [commentStatus, speakKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1A1A1E";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getCanvasPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const pos = getCanvasPos(e);
    if (!pos) return;
    setIsDrawing(true);
    lastPosRef.current = pos;
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    if (!pos || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPosRef.current = pos;
  }

  function endDraw() {
    setIsDrawing(false);
    lastPosRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1A1A1E";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function saveDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function tellPersona() {
    setCommentStatus("loading");
    setCommentText("");
    const personaName = isArabic ? personaNameAr : personaNameEn;
    const commentPrompt = isArabic
      ? `طفل رسم رسمة جديدة. أنت ${personaName}. تفاعل مع رسم الطفل بطريقة شجعة وممتعة وخيالية. تحدث مباشرة للطفل بكلام بسيط. عبر عن إعجابك بالرسمة واسأله سؤالاً بسيطاً عنها. اجعل ردك في ٣-٤ جمل فقط.`
      : `A child just drew a picture. You are ${personaName}. React to the child's drawing in an encouraging, fun, and imaginative way. Speak directly to the child in simple words. Express admiration and ask a simple question. Keep your reply to 3-4 sentences.`;

    try {
      const reflectRes = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageText: commentPrompt,
          personaId,
          currentLanguage: language,
          personaSystemPrompt: `You are ${personaName}, a friendly children's companion. Respond in ${language === "ar" ? "Arabic" : "English"} with enthusiasm and warmth.`,
          recentMessages: [],
        }),
      });
      const reflectData = await reflectRes.json();
      const text = reflectData.text || (isArabic ? "رسمتك جميلة جداً! أحسنت!" : "What a beautiful drawing! Great job!");
      setCommentText(text);
      setSpeakKey((key) => key + 1);
      setCommentStatus("speaking");
    } catch {
      setCommentStatus("done");
    }
  }

  function hearAgain() {
    if (!commentText) return;
    setSpeakKey((key) => key + 1);
    setCommentStatus("speaking");
  }

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] top-0 z-[80] flex flex-col overflow-hidden bg-[#0E0D10]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-black/30 px-3 py-2 font-arsans text-sm font-bold text-[#F7F3EC]/80 hover:border-[#F7F3EC]/35 hover:text-[#F7F3EC]"
          aria-label={isArabic ? "رجوع" : "Back"}
        >
          {isArabic ? "→ رجوع" : "← Back"}
        </button>
        <h2 className="font-arsans text-lg font-bold text-[#F7F3EC]/90">
          {isArabic ? "🎨 ارسم ما تحب" : "🎨 Draw something"}
        </h2>
        <div className="w-20" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full flex-1 touch-none rounded-2xl border border-white/10"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      <div className="mobile-scrollbar-none flex shrink-0 items-center gap-2 overflow-x-auto border-t border-white/10 px-3 py-2">
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-white" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <div className="flex items-center gap-1">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setBrushSize(s)}
              className={`grid h-7 w-7 place-items-center rounded-full border transition-all ${brushSize === s ? "border-[#C9A86A] bg-[#C9A86A]/15" : "border-white/10 hover:border-white/30"}`}
              aria-label={isArabic ? `حجم الفرشاة ${s}` : `Brush size ${s}`}
            >
              <span className="rounded-full bg-current" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <button
          type="button"
          onClick={clearCanvas}
          className="rounded-lg border border-white/12 px-3 py-1.5 font-arsans text-xs text-[#F7F3EC]/70 hover:border-red-200/35 hover:bg-red-200/10 hover:text-red-100"
        >
          {isArabic ? "مسح" : "Clear"}
        </button>

        <button
          type="button"
          onClick={saveDrawing}
          className="rounded-lg border border-emerald-100/22 bg-emerald-100/10 px-3 py-1.5 font-arsans text-xs text-emerald-100 hover:bg-emerald-100 hover:text-[#0E0D10]"
        >
          {isArabic ? "💾 حفظ" : "💾 Save"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#C9A86A]/15 bg-[#C9A86A]/8 px-3 py-1.5 font-arsans text-xs text-[#C9A86A]/80 hover:bg-[#C9A86A] hover:text-[#0E0D10]"
        >
          {isArabic ? "← رجوع" : "← Back"}
        </button>

        <div className="mx-1 h-6 w-px bg-white/10" />

        {commentStatus === "idle" || commentStatus === "done" ? (
          <button
            type="button"
            onClick={tellPersona}
            className="rounded-lg border border-[#C9A86A]/25 bg-[#C9A86A]/10 px-4 py-1.5 font-arsans text-xs font-bold text-[#C9A86A] hover:bg-[#C9A86A] hover:text-[#0E0D10]"
          >
            {isArabic ? "🗣 أخبر رفيقي" : "🗣 Tell my buddy"}
          </button>
        ) : null}

        {commentStatus === "loading" ? (
          <span className="shrink-0 font-arsans text-xs text-[#C9A86A]/80">
            {isArabic ? "الرفيق يتحضّر..." : "Buddy is getting ready..."}
          </span>
        ) : null}

        {commentStatus === "speaking" && (
          <span className="shrink-0 font-arsans text-xs text-emerald-100/80">
            {isArabic ? "🔊 الرفيق يتكلم..." : "🔊 Buddy is speaking..."}
          </span>
        )}

      {commentStatus === "done" && commentText && (
        <button
          type="button"
          onClick={hearAgain}
          className="rounded-lg border border-emerald-100/22 bg-emerald-100/10 px-3 py-1.5 font-arsans text-xs text-emerald-100 hover:bg-emerald-100 hover:text-[#0E0D10]"
        >
          {isArabic ? "🔁 أعد الاستماع" : "🔁 Hear again"}
        </button>
      )}
      </div>

      {commentText ? (
        <div className="mx-3 mb-2 flex items-end gap-2.5 rounded-xl border border-[#C9A86A]/15 bg-[#C9A86A]/8 px-3 py-2">
          <PersonaSpeaking
            key={speakKey}
            personaId={personaId}
            avatarPath={avatarPath}
            displayName={isArabic ? personaNameAr : personaNameEn}
            text={commentText}
            language={language}
            voiceConfig={voiceConfig}
            edgeTtsVoiceName={edgeTtsVoiceName}
            autoPlay
            useStaticImg
            onSpeakingEnd={() => setCommentStatus("done")}
          />
          <p className="flex-1 font-arsans text-xs italic text-[#F7F3EC]/80" dir={isArabic ? "rtl" : "ltr"}>
            💬 {commentText}
          </p>
        </div>
      ) : null}
    </div>
  );
}
