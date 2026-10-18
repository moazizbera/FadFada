import { describe, expect, it } from "vitest";
import { approveFamilyFlowRoutine, completeFamilyFlowStep, createFamilyFlowRoutine, rescheduleFamilyFlowRoutine } from "./familyFlow";

describe("Family Flow routines", () => {
  it("creates a bounded parent-approval routine without child response content", () => {
    const routine = createFamilyFlowRoutine({
      childProfileId: "child-7",
      subject: "math",
      detectedTask: "Addition to 20",
      totalMinutes: 25,
    });

    expect(routine.status).toBe("awaiting_parent_approval");
    expect(routine.totalMinutes).toBe(25);
    expect(routine.steps.map((step) => step.kind)).toEqual(["settle", "practice", "review"]);
    expect(JSON.stringify(routine)).not.toContain("answer");
  });

  it("requires a parent approval before a routine is ready", () => {
    const routine = createFamilyFlowRoutine({
      childProfileId: "child-7",
      subject: "math",
      detectedTask: "Addition to 20",
      totalMinutes: 25,
    });

    expect(approveFamilyFlowRoutine(routine).status).toBe("approved");
  });

  it("reschedules while retaining completed steps and requiring approval again", () => {
    const routine = completeFamilyFlowStep(approveFamilyFlowRoutine(createFamilyFlowRoutine({
      childProfileId: "child-7",
      subject: "math",
      detectedTask: "Addition to 20",
      totalMinutes: 25,
    })), "settle");

    const rescheduledRoutine = rescheduleFamilyFlowRoutine(routine, 10);

    expect(rescheduledRoutine.totalMinutes).toBe(10);
    expect(rescheduledRoutine.revision).toBe(2);
    expect(rescheduledRoutine.status).toBe("awaiting_parent_approval");
    expect(rescheduledRoutine.steps.find((step) => step.id === "settle")?.completed).toBe(true);
    expect(rescheduledRoutine.steps.find((step) => step.id === "practice")?.durationMinutes).toBe(6);
  });
});

describe("Family Flow transition guards", () => {
  const baseRoutine = () => createFamilyFlowRoutine({
    childProfileId: "child-7",
    subject: "math",
    detectedTask: "Addition to 20",
    totalMinutes: 25,
  });

  it("does not authorize step completion while a routine is awaiting approval", () => {
    const routine = baseRoutine();

    const after = completeFamilyFlowStep(routine, "settle");

    expect(after).toBe(routine);
    expect(after.status).toBe("awaiting_parent_approval");
    expect(after.steps.every((step) => !step.completed)).toBe(true);
  });

  it("ignores unknown step ids", () => {
    const routine = approveFamilyFlowRoutine(baseRoutine());

    expect(completeFamilyFlowStep(routine, "does-not-exist")).toBe(routine);
  });

  it("does not re-approve a routine that is not awaiting approval", () => {
    let routine = approveFamilyFlowRoutine(baseRoutine());
    routine = completeFamilyFlowStep(routine, "settle");
    routine = completeFamilyFlowStep(routine, "practice");
    routine = completeFamilyFlowStep(routine, "review");

    expect(routine.status).toBe("completed");
    expect(approveFamilyFlowRoutine(routine)).toBe(routine);
  });

  it("reaches completed only after every approved step is done", () => {
    let routine = approveFamilyFlowRoutine(baseRoutine());

    routine = completeFamilyFlowStep(routine, "settle");
    expect(routine.status).toBe("approved");
    routine = completeFamilyFlowStep(routine, "practice");
    expect(routine.status).toBe("approved");
    routine = completeFamilyFlowStep(routine, "review");
    expect(routine.status).toBe("completed");
  });

  it("requires fresh approval after rescheduling an approved routine", () => {
    const approved = approveFamilyFlowRoutine(baseRoutine());
    expect(approved.status).toBe("approved");

    const rescheduled = rescheduleFamilyFlowRoutine(approved, 15);
    expect(rescheduled.status).toBe("awaiting_parent_approval");
    expect(approveFamilyFlowRoutine(rescheduled).status).toBe("approved");
  });

  it("clamps unreasonable durations into the supported range", () => {
    expect(createFamilyFlowRoutine({ childProfileId: "c", subject: "math", detectedTask: "x", totalMinutes: 1000 }).totalMinutes).toBe(45);
    expect(createFamilyFlowRoutine({ childProfileId: "c", subject: "math", detectedTask: "x", totalMinutes: 1 }).totalMinutes).toBe(5);
    expect(createFamilyFlowRoutine({ childProfileId: "c", subject: "math", detectedTask: "x", totalMinutes: Number.NaN }).totalMinutes).toBe(15);
  });

  it("normalizes empty labels to safe fallbacks", () => {
    const routine = createFamilyFlowRoutine({ childProfileId: "c", subject: "   ", detectedTask: "", totalMinutes: 25 });

    expect(routine.subject).toBe("mixed");
    expect(routine.detectedTask).toBe("Homework");
  });
});