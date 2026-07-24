"use client";

type Task = {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  emoji: string;
  points: number;
  completed: boolean;
};

type Language = "ar" | "en";

type ChildDailyTasksProps = {
  language: Language;
  tasks: Task[];
  totalPoints: number;
  onComplete: (taskId: string) => void;
  onRefresh: () => void;
};

const progressMilestones = [10, 25, 50, 100, 200];

export function ChildDailyTasks({
  language,
  tasks,
  totalPoints,
  onComplete,
  onRefresh,
}: ChildDailyTasksProps) {
  const isArabic = language === "ar";
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress = (completedTasks / tasks.length) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-arsans text-lg font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic ? "مهام اليوم" : "Today's Quests"}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="font-arsans text-sm font-bold text-amber-200">{totalPoints}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        {progressMilestones.map((milestone) => (
          <div
            key={milestone}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${(milestone / 200) * 100}%` }}
          >
            <div
              className={`h-2 w-2 rounded-full border ${
                totalPoints >= milestone
                  ? "border-amber-200 bg-amber-200"
                  : "border-white/20 bg-white/10"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => !task.completed && onComplete(task.id)}
            disabled={task.completed}
            className={`group flex w-full items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
              task.completed
                ? "border-green-500/30 bg-green-500/10"
                : "border-white/10 bg-white/[0.03] hover:border-amber-200/30 hover:bg-amber-200/[0.06]"
            }`}
          >
            <span className="text-2xl">{task.emoji}</span>
            <div className="flex-1 text-left" dir={isArabic ? "rtl" : "ltr"}>
              <p
                className={`font-arsans text-sm font-bold ${
                  task.completed ? "text-green-300" : "text-bone/90"
                }`}
              >
                {isArabic ? task.titleAr : task.titleEn}
              </p>
              <p className="font-arsans text-xs text-bone/50">
                {isArabic ? task.descriptionAr : task.descriptionEn}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-arsans text-xs text-amber-200/70">+{task.points}</span>
              {task.completed && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-green-500/30 text-xs text-green-300">
                  ✓
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Refresh button */}
      <button
        type="button"
        onClick={onRefresh}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 font-arsans text-xs text-bone/50 transition-all hover:bg-white/[0.06] hover:text-bone/70"
      >
        {isArabic ? "تحديث المهام" : "Refresh quests"}
      </button>
    </div>
  );
}
