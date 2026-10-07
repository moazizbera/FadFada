export type FamilyFlowStepKind = "settle" | "practice" | "review";
export type FamilyFlowRoutineStatus = "awaiting_parent_approval" | "approved" | "completed";

export type FamilyFlowStep = {
  id: string;
  kind: FamilyFlowStepKind;
  title: string;
  durationMinutes: number;
  completed: boolean;
};

export type FamilyFlowRoutine = {
  childProfileId: string;
  subject: string;
  detectedTask: string;
  totalMinutes: number;
  status: FamilyFlowRoutineStatus;
  revision: number;
  steps: FamilyFlowStep[];
};

export type CreateFamilyFlowRoutineInput = {
  childProfileId: string;
  subject: string;
  detectedTask: string;
  totalMinutes: number;
};

export function createFamilyFlowRoutine(input: CreateFamilyFlowRoutineInput): FamilyFlowRoutine {
  const totalMinutes = clampRoutineMinutes(input.totalMinutes);
  const settleMinutes = totalMinutes >= 15 ? 3 : 2;
  const reviewMinutes = totalMinutes >= 15 ? 3 : 2;
  const practiceMinutes = Math.max(1, totalMinutes - settleMinutes - reviewMinutes);

  return {
    childProfileId: input.childProfileId,
    subject: normalizeLabel(input.subject, "mixed"),
    detectedTask: normalizeLabel(input.detectedTask, "Homework"),
    totalMinutes,
    status: "awaiting_parent_approval",
    revision: 1,
    steps: [
      { id: "settle", kind: "settle", title: "Settle in", durationMinutes: settleMinutes, completed: false },
      { id: "practice", kind: "practice", title: "Guided practice", durationMinutes: practiceMinutes, completed: false },
      { id: "review", kind: "review", title: "Parent review", durationMinutes: reviewMinutes, completed: false },
    ],
  };
}

export function approveFamilyFlowRoutine(routine: FamilyFlowRoutine): FamilyFlowRoutine {
  if (routine.status !== "awaiting_parent_approval") return routine;
  return { ...routine, status: "approved" };
}

export function rescheduleFamilyFlowRoutine(routine: FamilyFlowRoutine, totalMinutes: number): FamilyFlowRoutine {
  const nextRoutine = createFamilyFlowRoutine({
    childProfileId: routine.childProfileId,
    subject: routine.subject,
    detectedTask: routine.detectedTask,
    totalMinutes,
  });

  const completedStepIds = new Set(routine.steps.filter((step) => step.completed).map((step) => step.id));
  const steps = nextRoutine.steps.map((step) => ({ ...step, completed: completedStepIds.has(step.id) }));
  const allStepsCompleted = steps.every((step) => step.completed);

  return {
    ...nextRoutine,
    status: allStepsCompleted ? "completed" : "awaiting_parent_approval",
    revision: routine.revision + 1,
    steps,
  };
}

export function completeFamilyFlowStep(routine: FamilyFlowRoutine, stepId: string): FamilyFlowRoutine {
  const steps = routine.steps.map((step) => step.id === stepId ? { ...step, completed: true } : step);
  return {
    ...routine,
    status: steps.every((step) => step.completed) ? "completed" : routine.status,
    steps,
  };
}

function clampRoutineMinutes(value: number) {
  if (!Number.isFinite(value)) return 15;
  return Math.max(5, Math.min(45, Math.round(value)));
}

function normalizeLabel(value: string, fallback: string) {
  const cleanedValue = value.replace(/\s+/g, " ").trim().slice(0, 160);
  return cleanedValue || fallback;
}