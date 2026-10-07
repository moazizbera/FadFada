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