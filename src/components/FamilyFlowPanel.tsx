"use client";

import { FormEvent, useEffect, useState } from "react";
import type { FamilyFlowRoutine } from "../lib/familyFlow";

type ChildOption = { id: string; nickname: string };
type FamilyFlowPanelProps = {
  children: ChildOption[];
  language: "ar" | "en";
};

type FamilyFlowResponse = {
  routine?: FamilyFlowRoutine | null;
  error?: string;
};

export function FamilyFlowPanel({ children, language }: FamilyFlowPanelProps) {
  const isArabic = language === "ar";
  const [childProfileId, setChildProfileId] = useState("");
  const [subject, setSubject] = useState("math");
  const [detectedTask, setDetectedTask] = useState("");
  const [totalMinutes, setTotalMinutes] = useState(25);
  const [routine, setRoutine] = useState<FamilyFlowRoutine | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setChildProfileId((current) => current || children[0]?.id || "");
  }, [children]);

  useEffect(() => {
    if (!childProfileId) {
      setRoutine(null);
      return;
    }

    let active = true;
    setStatus("loading");
    fetch(`/api/parent/family-flow?childProfileId=${encodeURIComponent(childProfileId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<FamilyFlowResponse> : Promise.reject(new Error("FAMILY_FLOW_LOAD_FAILED")))
      .then((data) => {
        if (!active) return;
        setRoutine(data.routine || null);
        setStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setRoutine(null);
        setStatus("error");
        setMessage(isArabic ? "تعذر تحميل روتين العائلة الآن." : "Family routine could not be loaded right now.");
      });

    return () => { active = false; };
  }, [childProfileId, isArabic]);

  async function sendAction(action: "create" | "approve" | "reschedule" | "complete_step", details: Record<string, unknown> = {}) {
    if (!childProfileId) return;
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/parent/family-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, childProfileId, ...details }),
      });
      const data = await response.json().catch(() => ({})) as FamilyFlowResponse;
      if (!response.ok || !data.routine) throw new Error(data.error || "FAMILY_FLOW_SAVE_FAILED");
      setRoutine(data.routine);
      setStatus("idle");
      setMessage(action === "approve"
        ? (isArabic ? "تم اعتماد الروتين. لا يزال تسليم أي نشاط للطفل قراراً منفصلاً للوالد." : "Routine approved. Any child-facing handoff remains a separate parent decision.")
        : action === "reschedule"
          ? (isArabic ? "تمت إعادة ضبط الوقت ويلزم اعتماد ولي الأمر مرة أخرى." : "Time updated. Parent approval is required again.")
          : "");
    } catch {
      setStatus("error");
      setMessage(isArabic ? "تعذر حفظ تغيير الروتين. حاول مرة أخرى." : "Routine change could not be saved. Please try again.");
    }
  }

  function createRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detectedTask.trim()) {
      setStatus("error");
      setMessage(isArabic ? "أضف تركيزاً قصيراً للواجب أولاً." : "Add a short homework focus first.");
      return;
    }
    void sendAction("create", { subject, detectedTask: detectedTask.trim(), totalMinutes });
  }

  const selectedChild = children.find((child) => child.id === childProfileId);

  return (
    <section className="mt-4 border border-cyan-200/22 bg-cyan-200/[0.035] p-4" aria-labelledby="family-flow-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-cyan-100">{isArabic ? "تجربة Alexa+ العائلية" : "Alexa+ family flow"}</p>
          <h3 id="family-flow-title" className="mt-1 font-arserif text-2xl text-bone/92">{isArabic ? "روتين واجب يتكيف مع وقت العائلة" : "A homework routine that adapts to family time"}</h3>
          <p className="mt-1 max-w-2xl font-arsans text-xs leading-5 text-bone/55">{isArabic ? "يبقى هذا الروتين داخل مساحة الوالد. لا يظهر للطفل إلا بعد اعتماد واضح من ولي الأمر." : "This routine remains in the parent workspace. Nothing becomes child-facing without an explicit parent approval."}</p>
        </div>
        {routine ? <span className={`border px-2.5 py-1 font-arsans text-[11px] ${routine.status === "approved" ? "border-emerald-200/35 text-emerald-100" : routine.status === "completed" ? "border-gold/35 text-gold" : "border-amber-100/35 text-amber-100"}`}>{formatRoutineStatus(routine.status, language)}</span> : null}
      </div>

      {children.length === 0 ? <p className="mt-3 font-arsans text-xs text-bone/50">{isArabic ? "أنشئ ملف طفل أولاً لبدء روتين عائلي." : "Create a child profile first to start a family routine."}</p> : null}

      {children.length > 0 && !routine ? (
        <form onSubmit={createRoutine} className="mt-4 grid gap-3 md:grid-cols-[1fr_0.8fr_1.5fr_0.7fr_auto] md:items-end">
          <label>
            <span className="mb-1 block font-arsans text-[11px] text-bone/52">{isArabic ? "الطفل" : "Child"}</span>
            <select value={childProfileId} onChange={(event) => setChildProfileId(event.target.value)} className="w-full border border-white/10 bg-black/24 px-3 py-2 font-arsans text-sm text-bone/85 outline-none focus:border-cyan-200/45">
              {children.map((child) => <option key={child.id} value={child.id}>{child.nickname}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block font-arsans text-[11px] text-bone/52">{isArabic ? "المادة" : "Subject"}</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full border border-white/10 bg-black/24 px-3 py-2 font-arsans text-sm text-bone/85 outline-none focus:border-cyan-200/45">
              <option value="math">{isArabic ? "رياضيات" : "Math"}</option>
              <option value="english">{isArabic ? "إنجليزي" : "English"}</option>
              <option value="arabic">{isArabic ? "عربي" : "Arabic"}</option>
              <option value="mixed">{isArabic ? "مختلط" : "Mixed"}</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block font-arsans text-[11px] text-bone/52">{isArabic ? "تركيز الواجب" : "Homework focus"}</span>
            <input value={detectedTask} onChange={(event) => setDetectedTask(event.target.value)} maxLength={160} placeholder={isArabic ? "مثال: جمع حتى 20" : "Example: addition to 20"} className="w-full border border-white/10 bg-black/24 px-3 py-2 font-arsans text-sm text-bone/85 outline-none placeholder:text-bone/30 focus:border-cyan-200/45" />
          </label>
          <label>
            <span className="mb-1 block font-arsans text-[11px] text-bone/52">{isArabic ? "الدقائق" : "Minutes"}</span>
            <select value={totalMinutes} onChange={(event) => setTotalMinutes(Number(event.target.value))} className="w-full border border-white/10 bg-black/24 px-3 py-2 font-arsans text-sm text-bone/85 outline-none focus:border-cyan-200/45">
              {[10, 15, 25, 35].map((minutes) => <option key={minutes} value={minutes}>{minutes}</option>)}
            </select>
          </label>
          <button type="submit" disabled={status === "saving" || status === "loading"} className="ui-action min-h-10 bg-cyan-200 px-4 py-2 text-xs text-ink hover:bg-bone disabled:cursor-wait disabled:opacity-60">{isArabic ? "بناء الروتين" : "Build routine"}</button>
        </form>
      ) : null}

      {routine ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-y border-white/10 py-3">
            <div>
              <p className="font-arsans text-sm font-semibold text-bone/90">{selectedChild?.nickname} · {routine.subject}</p>
              <p className="mt-1 font-arsans text-xs text-cyan-100/75">{routine.detectedTask} · {routine.totalMinutes} {isArabic ? "دقيقة" : "minutes"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {routine.status === "awaiting_parent_approval" ? <button type="button" onClick={() => void sendAction("approve")} disabled={status === "saving"} className="ui-action bg-emerald-200 px-3 py-2 text-xs text-ink hover:bg-bone disabled:opacity-60">{isArabic ? "اعتماد الروتين" : "Approve routine"}</button> : null}
              {routine.status !== "completed" ? <label className="flex items-center gap-2 border border-white/10 px-2 py-1.5 font-arsans text-xs text-bone/70"><span>{isArabic ? "وقت جديد" : "New time"}</span><select value={totalMinutes} onChange={(event) => setTotalMinutes(Number(event.target.value))} className="bg-transparent text-xs text-bone outline-none"><option value={10}>10</option><option value={15}>15</option><option value={25}>25</option><option value={35}>35</option></select><button type="button" onClick={() => void sendAction("reschedule", { totalMinutes })} disabled={status === "saving"} className="text-cyan-100 hover:text-bone disabled:opacity-60">{isArabic ? "تحديث" : "Update"}</button></label> : null}
            </div>
          </div>
          <ol className="mt-3 grid gap-2 md:grid-cols-3">
            {routine.steps.map((step, index) => (
              <li key={step.id} className={`border p-3 ${step.completed ? "border-emerald-200/26 bg-emerald-200/[0.05]" : "border-white/10 bg-black/16"}`}>
                <p className="font-mono text-[10px] text-cyan-100/60">0{index + 1}</p>
                <p className="mt-1 font-arsans text-sm font-semibold text-bone/86">{formatStepTitle(step.kind, language)}</p>
                <p className="mt-1 font-arsans text-xs text-bone/48">{step.durationMinutes} {isArabic ? "دقائق" : "minutes"}</p>
                {!step.completed && routine.status === "approved" ? <button type="button" onClick={() => void sendAction("complete_step", { stepId: step.id })} disabled={status === "saving"} className="ui-action mt-3 border border-emerald-200/28 px-2.5 py-1.5 text-[11px] text-emerald-100 hover:bg-emerald-200 hover:text-ink disabled:opacity-60">{isArabic ? "تم" : "Mark done"}</button> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {status === "loading" ? <p className="mt-3 font-arsans text-xs text-bone/45">{isArabic ? "جار تحميل الروتين..." : "Loading routine..."}</p> : null}
      {message ? <p className={`mt-3 font-arsans text-xs leading-5 ${status === "error" ? "text-red-100" : "text-emerald-100/80"}`}>{message}</p> : null}
    </section>
  );
}

function formatRoutineStatus(status: FamilyFlowRoutine["status"], language: "ar" | "en") {
  const isArabic = language === "ar";
  if (status === "approved") return isArabic ? "معتمد من الوالد" : "Parent approved";
  if (status === "completed") return isArabic ? "مكتمل" : "Complete";
  return isArabic ? "بانتظار الاعتماد" : "Awaiting approval";
}

function formatStepTitle(kind: FamilyFlowRoutine["steps"][number]["kind"], language: "ar" | "en") {
  const isArabic = language === "ar";
  if (kind === "settle") return isArabic ? "تهيئة هادئة" : "Settle in";
  if (kind === "practice") return isArabic ? "تدريب موجه" : "Guided practice";
  return isArabic ? "مراجعة الوالد" : "Parent review";
}