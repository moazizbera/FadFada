"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "../../components/AppShell";

type SavedMoment = {
  id: string;
  text: string;
  world: string;
  personaId?: string;
  personaName?: string;
  avatarPath?: string;
  language?: "ar" | "en";
  savedAt: string;
};

type TinyPlan = {
  id: string;
  title: string;
  steps: string[];
  world: string;
  language?: "ar" | "en";
  createdAt: string;
};

type JourneySnapshot = {
  id: string;
  title: string;
  theme: string;
  nextStep: string;
  messageCount: number;
  world: string;
  language?: "ar" | "en";
  createdAt: string;
};

type GrowthQuest = {
  id: string;
  title: string;
  reason: string;
  days: Array<{ label: string; done: boolean }>;
  world: string;
  language?: "ar" | "en";
  createdAt: string;
};

type JourneyInsight = {
  artifactCount: number;
  completedQuestSteps: number;
  dominantWorlds: Array<{ world: string; count: number }>;
  reflectionScore: number;
  streakSignal: string;
  nextFocus: string;
};

type CompanionInsight = {
  name: string;
  avatarPath?: string;
  count: number;
  world: string;
  latestText: string;
};

type ReflectionReelItem = {
  before: string;
  after: string;
  world: string;
  createdAt: string;
};

type CompanionRecommendation = {
  name: string;
  reason: string;
  command: string;
};

type JourneyWorldTransition = {
  id: string;
  from: string;
  to: string;
  count: number;
  lastSeenAt: string;
};

type EmotionTimelineItem = {
  id: string;
  world: string;
  moodLabelAr: string;
  moodLabelEn: string;
  createdAt: string;
  source: CapsuleLibraryItemType;
};

type CapsuleLibraryItemType = "moment" | "plan" | "snapshot" | "quest";

type CapsuleLibraryItem = {
  id: string;
  type: CapsuleLibraryItemType;
  title: string;
  summary: string;
  world: string;
  createdAt: string;
};

type MemoryPreferences = {
  savedMoments: boolean;
  tinyPlans: boolean;
  journeySnapshots: boolean;
  growthQuests: boolean;
};

type VoiceDialect = "ar-EG" | "ar-SA" | "ar-AE" | "ar-LB";
type ProfileTabId = "account-details" | "child-profiles" | "journey-map" | "saved-library";
type ChildProfilesPanelId = "overview" | "insights" | "tools" | "profiles";
type ParentToolDialog = "homework" | "playbook" | null;

type ChildProfile = {
  id: string;
  nickname: string;
  birthYear: number;
  ageBand: "under_8" | "8_to_10" | "11_to_12" | "13_plus";
  avatarPreference: string;
  gamePoints: number;
  dailyTimeLimitMinutes: number;
  createdAt: string;
  updatedAt: string;
  conversationHistory: ChildConversationHistoryItem[];
};

type ChildConversationHistoryItem = {
  id: string;
  childText: string;
  assistantText: string;
  personaId: string | null;
  world: string;
  language: "ar" | "en";
  createdAt: string;
};

type ChildPulseSummary = {
  childProfileId: string;
  nickname: string;
  turnCount7d: number;
  lastActivityAt: string | null;
  dominantWorld: string;
  trend: "up" | "steady" | "down" | "quiet";
  riskLevel: "low" | "medium" | "high";
};

type ParentTimelineEntry = {
  childProfileId: string;
  nickname: string;
  badge: string;
  title: string;
  summary: string;
  nextStep: string;
  signal: string;
  updatedAt: string | null;
};

type WeeklyReportChild = {
  childProfileId: string;
  nickname: string;
  dominantWorld: string;
  turnCount7d: number;
  trend: ChildPulseSummary["trend"];
  riskLevel: ChildPulseSummary["riskLevel"];
  homeworkCount7d: number;
  playbookCount7d: number;
  headline: string;
  summary: string;
  nextAction: string;
  updatedAt: string | null;
};

type WeeklyParentReport = {
  generatedAt: string;
  windowDays: number;
  summary: string;
  wins: string[];
  focusAreas: string[];
  nextWeekPlan: string[];
  businessHint: string;
  metrics: {
    activeChildren: number;
    totalTurns: number;
    homeworkAssignments: number;
    playbookRuns: number;
    highRiskChildren: number;
  };
  children: WeeklyReportChild[];
};

type HomeworkActivity = {
  type: "quiz" | "trace" | "match" | "story" | "challenge";
  title: string;
  prompt: string;
  hint: string;
  answer: string;
  choices?: string[];
};

type HomeworkResult = {
  subject: "math" | "english" | "arabic" | "kg" | "mixed";
  detectedTask: string;
  parentSummary: string;
  childIntro: string;
  activities: HomeworkActivity[];
  safetyNote: string;
};

type ParentPlaybookResult = {
  title: string;
  quickRead: string;
  childLens: string;
  sayThis: string[];
  avoidThis: string[];
  resetSteps: string[];
  playBridge: string;
  boundaryScript: string;
  repairLine: string;
  followUp: string;
  safetyNote: string;
  childNickname?: string | null;
};

type ChildForm = {
  nickname: string;
  birthYear: string;
  avatarPreference: string;
  dailyTimeLimitMinutes: string;
};

type Profile = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
  role: string;
  activeTier: string;
  lemonSubscriptionStatus: string | null;
  lemonCustomerPortalUrl: string | null;
  createdAt: string;
  socialLinks: Record<string, string>;
};

const logoOptions = [
  "/profile-logos/calm.svg",
  "/profile-logos/spark.svg",
  "/profile-logos/cedar.svg",
  "/profile-logos/moon.svg",
  "/profile-logos/wave.svg",
  "/profile-logos/terracotta.svg",
];

const worldLabels: Record<string, { ar: string; en: string }> = {
  calm: { ar: "هادئ", en: "Calm" },
  story: { ar: "حكاية", en: "Story" },
  faith: { ar: "إيمان", en: "Faith" },
  build: { ar: "بناء", en: "Build" },
  learning: { ar: "تعلم", en: "Learning" },
  celebration: { ar: "فرح", en: "Joy" },
  grief: { ar: "سكينة", en: "Stillness" },
};

const voiceDialectStorageKey = "fadfada-voice-dialect";
const memoryPreferencesStorageKey = "fadfada-memory-preferences";
const defaultMemoryPreferences: MemoryPreferences = {
  savedMoments: true,
  tinyPlans: true,
  journeySnapshots: true,
  growthQuests: true,
};

const voiceDialects: Array<{ value: VoiceDialect; ar: string; en: string; detailAr: string; detailEn: string }> = [
  { value: "ar-EG", ar: "مصري", en: "Egyptian", detailAr: "دافئ وقريب", detailEn: "warm and close" },
  { value: "ar-SA", ar: "فصحى هادئة", en: "MSA", detailAr: "واضح ورسمي", detailEn: "clear and formal" },
  { value: "ar-AE", ar: "خليجي", en: "Gulf", detailAr: "ناعم ومطمئن", detailEn: "soft and steady" },
  { value: "ar-LB", ar: "شامي", en: "Levantine", detailAr: "خفيف وقريب", detailEn: "light and familiar" },
];

const childAvatarOptions = [
  { avatar: "/avatars/zain_avatar.png", ar: "زين الروضة", en: "Zain KG" },
  { avatar: "/avatars/rami_riddles.png", ar: "رامي الألغاز", en: "Rami Riddles" },
  { avatar: "/avatars/deema_drama.png", ar: "ديما مسرح", en: "Deema Drama" },
  { avatar: "/avatars/faris_focus.png", ar: "فارس التركيز", en: "Faris Focus" },
  { avatar: "/avatars/nour_nature.png", ar: "نور الطبيعة", en: "Nour Nature" },
  { avatar: "/avatars/sami_space.png", ar: "سامي الفضاء", en: "Sami Space" },
  { avatar: "/avatars/leila_logic.png", ar: "ليلى المنطق", en: "Leila Logic" },
];

const defaultChildForm: ChildForm = {
  nickname: "",
  birthYear: "2017",
  avatarPreference: "/avatars/rami_riddles.png",
  dailyTimeLimitMinutes: "30",
};

const profileTabIds: ProfileTabId[] = ["account-details", "child-profiles", "journey-map", "saved-library"];

function normalizeProfileTabId(value: string | null | undefined): ProfileTabId {
  const tabId = value?.replace(/^#/, "");
  return profileTabIds.includes(tabId as ProfileTabId) ? tabId as ProfileTabId : "account-details";
}

export function ProfileClient({ initialProfile }: { initialProfile: Profile }) {
  const { language, direction } = useAppLocale();
  const { data: session, update: updateSession } = useSession();
  const isArabic = language === "ar";
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTabId>("account-details");
  const [profile, setProfile] = useState(initialProfile);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [childForm, setChildForm] = useState<ChildForm>(defaultChildForm);
  const [childStatus, setChildStatus] = useState<"loading" | "idle" | "saving" | "saved" | "switching" | "error">("loading");
  const [childMessage, setChildMessage] = useState("");
  const [activeChildPanel, setActiveChildPanel] = useState<ChildProfilesPanelId>("overview");
  const [childProfilesExpanded, setChildProfilesExpanded] = useState(true);
  const [childFormOpen, setChildFormOpen] = useState(false);
  const [childProfileLimit, setChildProfileLimit] = useState(profile.activeTier === "PLUS" || profile.activeTier === "BUSINESS" ? 5 : 1);
  const [childProfileTier, setChildProfileTier] = useState(profile.activeTier === "PLUS" || profile.activeTier === "BUSINESS" ? "PLUS" : "FREE");
  const [childPulse, setChildPulse] = useState<ChildPulseSummary[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyParentReport | null>(null);
  const [weeklyReportStatus, setWeeklyReportStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [weeklyReportMessage, setWeeklyReportMessage] = useState("");
  const [homeworkImage, setHomeworkImage] = useState<File | null>(null);
  const [homeworkImagePreviewUrl, setHomeworkImagePreviewUrl] = useState("");
  const [homeworkHint, setHomeworkHint] = useState("");
  const [homeworkAgeBand, setHomeworkAgeBand] = useState<ChildProfile["ageBand"] | "unknown">("unknown");
  const [homeworkChildProfileId, setHomeworkChildProfileId] = useState("");
  const [homeworkStatus, setHomeworkStatus] = useState<"idle" | "analyzing" | "ready" | "error">("idle");
  const [homeworkMessage, setHomeworkMessage] = useState("");
  const [homeworkResult, setHomeworkResult] = useState<HomeworkResult | null>(null);
  const [activeParentToolDialog, setActiveParentToolDialog] = useState<ParentToolDialog>(null);
  const [playbookChildProfileId, setPlaybookChildProfileId] = useState("");
  const [playbookSituation, setPlaybookSituation] = useState("");
  const [playbookGoal, setPlaybookGoal] = useState("");
  const [playbookEnergy, setPlaybookEnergy] = useState<"calm" | "tired" | "stressed" | "angry">("calm");
  const [playbookStatus, setPlaybookStatus] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [playbookMessage, setPlaybookMessage] = useState("");
  const [playbookResult, setPlaybookResult] = useState<ParentPlaybookResult | null>(null);
  const [parentReturnCode, setParentReturnCode] = useState("");
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [tinyPlans, setTinyPlans] = useState<TinyPlan[]>([]);
  const [journeySnapshots, setJourneySnapshots] = useState<JourneySnapshot[]>([]);
  const [growthQuests, setGrowthQuests] = useState<GrowthQuest[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [billingStatus, setBillingStatus] = useState<"idle" | "opening" | "error">("idle");
  const [billingMessage, setBillingMessage] = useState("");
  const [voiceDialect, setVoiceDialect] = useState<VoiceDialect>("ar-EG");
  const [memoryPreferences, setMemoryPreferences] = useState<MemoryPreferences>(defaultMemoryPreferences);
  const [journeyWorldFilter, setJourneyWorldFilter] = useState<string>("all");
  const [capsuleSearchQuery, setCapsuleSearchQuery] = useState("");
  const [capsuleWorldFilter, setCapsuleWorldFilter] = useState<string>("all");
  const [capsuleTypeFilter, setCapsuleTypeFilter] = useState<"all" | CapsuleLibraryItemType>("all");
  const [shareSafeStatusMessage, setShareSafeStatusMessage] = useState("");
  const journeyInsight = buildJourneyInsight({ savedMoments, tinyPlans, journeySnapshots, growthQuests }, language);
  const companionInsights = buildCompanionInsights(savedMoments, language);
  const storyMirrorMoments = savedMoments.filter((moment) => moment.world === "story").slice(0, 4);
  const moodConstellation = buildMoodConstellation({ savedMoments, tinyPlans, journeySnapshots, growthQuests });
  const reflectionReel = buildReflectionReel(savedMoments, journeySnapshots, language);
  const worldTransitions = useMemo(
    () => buildJourneyWorldTransitions({ savedMoments, tinyPlans, journeySnapshots, growthQuests }),
    [savedMoments, tinyPlans, journeySnapshots, growthQuests]
  );
  const journeyWorldOptions = useMemo(
    () => buildJourneyWorldOptions({ savedMoments, tinyPlans, journeySnapshots, growthQuests }),
    [savedMoments, tinyPlans, journeySnapshots, growthQuests]
  );
  const filteredReflectionReel = journeyWorldFilter === "all"
    ? reflectionReel
    : reflectionReel.filter((item) => item.world === journeyWorldFilter);
  const capsuleWorldOptions = useMemo(
    () => buildJourneyWorldOptions({ savedMoments, tinyPlans, journeySnapshots, growthQuests }),
    [savedMoments, tinyPlans, journeySnapshots, growthQuests]
  );
  const capsuleLibraryItems = useMemo(
    () => buildCapsuleLibraryItems({ savedMoments, tinyPlans, journeySnapshots, growthQuests }, language),
    [savedMoments, tinyPlans, journeySnapshots, growthQuests, language]
  );
  const emotionTimeline = useMemo(
    () => buildEmotionTimeline({ savedMoments, tinyPlans, journeySnapshots, growthQuests }),
    [savedMoments, tinyPlans, journeySnapshots, growthQuests]
  );
  const filteredCapsuleLibraryItems = useMemo(() => {
    const normalizedQuery = capsuleSearchQuery.trim().toLowerCase();
    return capsuleLibraryItems.filter((item) => {
      if (capsuleTypeFilter !== "all" && item.type !== capsuleTypeFilter) return false;
      if (capsuleWorldFilter !== "all" && item.world !== capsuleWorldFilter) return false;
      if (!normalizedQuery) return true;
      return `${item.title} ${item.summary}`.toLowerCase().includes(normalizedQuery);
    });
  }, [capsuleLibraryItems, capsuleSearchQuery, capsuleTypeFilter, capsuleWorldFilter]);
  const companionRecommendations = buildCompanionRecommendations(journeyInsight.dominantWorlds, language);
  const parentTimeline = useMemo(() => buildParentCopilotTimeline(childProfiles, childPulse, language), [childProfiles, childPulse, language]);

  useEffect(() => {
    setSavedMoments(JSON.parse(localStorage.getItem("fadfada-saved-moments") || "[]") as SavedMoment[]);
    setTinyPlans(JSON.parse(localStorage.getItem("fadfada-tiny-plans") || "[]") as TinyPlan[]);
    setJourneySnapshots(JSON.parse(localStorage.getItem("fadfada-journey-snapshots") || "[]") as JourneySnapshot[]);
    setGrowthQuests(JSON.parse(localStorage.getItem("fadfada-growth-quests") || "[]") as GrowthQuest[]);
    setVoiceDialect(normalizeVoiceDialect(localStorage.getItem(voiceDialectStorageKey)));
    setMemoryPreferences(normalizeMemoryPreferences(localStorage.getItem(memoryPreferencesStorageKey)));
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/parent/return-code", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ code?: string }> : null)
      .then((data) => {
        if (!active) return;
        const code = typeof data?.code === "string" ? data.code.trim() : "";
        setParentReturnCode(/^\d{4}$/.test(code) ? code : "");
      })
      .catch(() => {
        if (!active) return;
        setParentReturnCode("");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function syncTabFromHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash === "homework-transformer") {
        setActiveProfileTab("child-profiles");
        setActiveChildPanel("tools");
        setActiveParentToolDialog("homework");
        return;
      }
      if (hash === "parent-playbook") {
        setActiveProfileTab("child-profiles");
        setActiveChildPanel("tools");
        setActiveParentToolDialog("playbook");
        return;
      }
      setActiveProfileTab(normalizeProfileTabId(hash));
    }

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  useEffect(() => {
    return () => {
      if (homeworkImagePreviewUrl) URL.revokeObjectURL(homeworkImagePreviewUrl);
    };
  }, [homeworkImagePreviewUrl]);

  async function loadChildProfiles(active = true) {
    setChildStatus("loading");

    try {
      const [response, pulseResponse] = await Promise.all([
        fetch("/api/parent/child", { cache: "no-store" }),
        fetch("/api/parent/pulse", { cache: "no-store" }).catch(() => null),
      ]);
      const data = await response.json().catch(() => ({})) as { childProfiles?: ChildProfile[]; childProfileLimit?: number; childProfileTier?: string; error?: string };
      if (!response.ok) throw new Error(data.error || String(response.status));

      const pulseData = pulseResponse && pulseResponse.ok
        ? (await pulseResponse.json().catch(() => ({})) as { pulse?: ChildPulseSummary[] })
        : null;

      if (!active) return;
      const nextChildProfiles = data.childProfiles || [];
      setChildProfiles(nextChildProfiles);
      setHomeworkChildProfileId((current) => current || nextChildProfiles[0]?.id || "");
      setPlaybookChildProfileId((current) => current || nextChildProfiles[0]?.id || "");
      setChildProfileLimit(typeof data.childProfileLimit === "number" ? data.childProfileLimit : childProfileLimit);
      setChildProfileTier(typeof data.childProfileTier === "string" ? data.childProfileTier : childProfileTier);
      setChildPulse(Array.isArray(pulseData?.pulse) ? pulseData.pulse : []);
      setChildStatus("idle");
    } catch (error) {
      if (!active) return;
      setChildStatus("error");
      setChildMessage(formatChildProfileError(error instanceof Error ? error.message : undefined, language));
    }
  }

  useEffect(() => {
    let active = true;

    void loadChildProfiles(active);

    return () => {
      active = false;
    };
  }, [isArabic]);

  useEffect(() => {
    if (activeProfileTab !== "child-profiles") return;
    if (weeklyReportStatus === "ready" && weeklyReport) return;

    void loadWeeklyParentReport();
  }, [activeProfileTab, language]);

  async function loadWeeklyParentReport() {
    setWeeklyReportStatus("loading");
    setWeeklyReportMessage("");

    try {
      const response = await fetch(`/api/parent/weekly-report?language=${language}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as WeeklyParentReport & { error?: string };

      if (!response.ok || !data || !Array.isArray(data.children)) {
        throw new Error(data.error || String(response.status));
      }

      setWeeklyReport(data);
      setWeeklyReportStatus("ready");
    } catch (error) {
      setWeeklyReportStatus("error");
      setWeeklyReportMessage(formatWeeklyReportError(error instanceof Error ? error.message : undefined, language));
    }
  }

  function saveVoiceDialect(nextDialect: VoiceDialect) {
    localStorage.setItem(voiceDialectStorageKey, nextDialect);
    setVoiceDialect(nextDialect);
  }

  function openParentToolDialog(tool: Exclude<ParentToolDialog, null>) {
    setActiveProfileTab("child-profiles");
    setActiveParentToolDialog(tool);
    window.history.replaceState(null, "", tool === "homework" ? "#homework-transformer" : "#parent-playbook");
  }

  function closeParentToolDialog() {
    setActiveParentToolDialog(null);
    if (window.location.hash === "#homework-transformer" || window.location.hash === "#parent-playbook") {
      window.history.replaceState(null, "", "#child-profiles");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.name,
        nickname: profile.nickname,
        image: profile.image,
        socialLinks: profile.socialLinks,
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    const data = (await response.json()) as { profile: Profile };
    setProfile(data.profile);
    setStatus("saved");
  }

  async function createChildProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChildStatus("saving");
    setChildMessage("");

    const normalizedNickname = childForm.nickname.trim().toLocaleLowerCase();
    if (normalizedNickname && childProfiles.some((profile) => profile.nickname.trim().toLocaleLowerCase() === normalizedNickname)) {
      setChildStatus("error");
      setChildMessage(language === "ar" ? "اسم الطفل مستخدم مسبقاً في حسابك. اختر اسماً مختلفاً لكل طفل." : "This child name already exists in your account. Please choose a different name.");
      return;
    }

    const response = await fetch("/api/parent/child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: childForm.nickname,
        birthYear: childForm.birthYear,
        avatarPreference: childForm.avatarPreference,
        dailyTimeLimitMinutes: childForm.dailyTimeLimitMinutes,
      }),
    }).catch(() => null);

    const data = response ? ((await response.json().catch(() => ({}))) as { childProfile?: ChildProfile; error?: string; maxProfiles?: number; childProfileTier?: string; upgradeRequired?: boolean }) : null;

    if (!response?.ok || !data?.childProfile) {
      setChildStatus("error");
      if (typeof data?.maxProfiles === "number") setChildProfileLimit(data.maxProfiles);
      if (typeof data?.childProfileTier === "string") setChildProfileTier(data.childProfileTier);
      setChildMessage(formatChildProfileError(data?.error, language, data?.maxProfiles, data?.upgradeRequired));
      return;
    }

    setChildProfiles((current) => [...current, data.childProfile as ChildProfile]);
    setChildForm(defaultChildForm);
    setChildFormOpen(false);
    setChildProfilesExpanded(true);
    setChildStatus("saved");
    setChildMessage(isArabic ? "تم إنشاء ملف الطفل وظهر في القائمة. دخول الطفل يتم من حساب الوالد بزر فتح فقط، بدون اسم مستخدم أو كلمة مرور منفصلة." : "Child profile created and added to the list. The child enters through the parent account with Open, without a separate username or password.");
  }

  async function openChildWorkspace(childProfileId: string) {
    setChildStatus("switching");
    setChildMessage("");
    try {
      const nextSession = await updateSession({ childProfileId, activeChildProfileId: childProfileId });
      const nextWorkspaceMode = nextSession?.user && "workspaceMode" in nextSession.user ? nextSession.user.workspaceMode : null;
      const nextChildProfileId = nextSession?.user && "childProfileId" in nextSession.user ? nextSession.user.childProfileId : null;

      if (nextWorkspaceMode !== "child" || nextChildProfileId !== childProfileId) {
        setChildStatus("error");
        setChildMessage(isArabic ? "لم يتم تفعيل مساحة الطفل بعد. حاول مرة أخرى من ملف الأطفال." : "Child workspace did not activate yet. Try again from the child profiles panel.");
        return;
      }

      window.location.assign("/");
    } catch {
      setChildStatus("error");
      setChildMessage(isArabic ? "تعذر فتح مساحة الطفل الآن. حاول مرة أخرى بعد قليل." : "Could not open the child workspace right now. Please try again shortly.");
    }
  }

  async function returnToParentWorkspace() {
    setChildStatus("switching");
    setChildMessage("");
    await updateSession({ clearChildProfile: true });
    window.location.reload();
  }

  function selectHomeworkImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setHomeworkImage(file);
    setHomeworkImagePreviewUrl(file ? URL.createObjectURL(file) : "");
    if (homeworkStatus !== "idle") {
      setHomeworkStatus("idle");
      setHomeworkMessage("");
    }
  }

  async function submitHomeworkHelper(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (homeworkStatus === "analyzing") return;

    if (!homeworkChildProfileId) {
      setHomeworkStatus("error");
      setHomeworkMessage(isArabic ? "اختر الطفل الذي سيستلم الواجب أولاً." : "Choose the child who should receive this homework first.");
      return;
    }

    if (!homeworkImage && !homeworkHint.trim()) {
      setHomeworkStatus("error");
      setHomeworkMessage(isArabic ? "ارفع صورة الواجب أو اكتب وصفاً قصيراً له." : "Upload a homework image or type a short description.");
      return;
    }

    setHomeworkStatus("analyzing");
    setHomeworkMessage("");

    const formData = new FormData();
    formData.set("language", language);
    formData.set("childAgeBand", homeworkAgeBand);
    formData.set("childProfileId", homeworkChildProfileId);
    formData.set("hint", homeworkHint.trim());
    if (homeworkImage) formData.set("image", homeworkImage);

    try {
      const response = await fetch("/api/parent/homework", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({})) as HomeworkResult & { error?: string };

      if (!response.ok || !Array.isArray(data.activities)) {
        throw new Error(data.error || "HOMEWORK_HELPER_FAILED");
      }

      const assignedChild = childProfiles.find((profile) => profile.id === homeworkChildProfileId);
      setHomeworkResult(data);
      setHomeworkStatus("ready");
      setHomeworkMessage(isArabic ? `تم إرسال الواجب إلى مساحة ${assignedChild?.nickname || "الطفل"}.` : `Homework sent to ${assignedChild?.nickname || "the child"}'s space.`);
    } catch (error) {
      setHomeworkStatus("error");
      setHomeworkMessage(formatHomeworkError(error instanceof Error ? error.message : undefined, language));
    }
  }

  async function submitParentPlaybook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (playbookStatus === "building") return;

    if (!playbookSituation.trim()) {
      setPlaybookStatus("error");
      setPlaybookMessage(isArabic ? "اكتب الموقف الذي تريد خطة له." : "Write the situation you want a plan for.");
      return;
    }

    setPlaybookStatus("building");
    setPlaybookMessage("");

    const selectedChild = childProfiles.find((child) => child.id === playbookChildProfileId);

    try {
      const response = await fetch("/api/parent/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          childProfileId: playbookChildProfileId,
          childAgeBand: selectedChild?.ageBand || "unknown",
          parentEnergy: playbookEnergy,
          situation: playbookSituation.trim(),
          goal: playbookGoal.trim(),
        }),
      });
      const data = await response.json().catch(() => ({})) as ParentPlaybookResult & { error?: string };

      if (!response.ok || !data.title) {
        throw new Error(data.error || "PARENT_PLAYBOOK_FAILED");
      }

      setPlaybookResult(data);
      setPlaybookStatus("ready");
      setPlaybookMessage(isArabic ? "جهزت خطة ولي الأمر لهذا الموقف." : "Parent playbook is ready for this moment.");
    } catch (error) {
      setPlaybookStatus("error");
      setPlaybookMessage(formatParentPlaybookError(error instanceof Error ? error.message : undefined, language));
    }
  }

  function clearSavedMoments() {
    localStorage.removeItem("fadfada-saved-moments");
    setSavedMoments([]);
  }

  function clearTinyPlans() {
    localStorage.removeItem("fadfada-tiny-plans");
    setTinyPlans([]);
  }

  function clearJourneySnapshots() {
    localStorage.removeItem("fadfada-journey-snapshots");
    setJourneySnapshots([]);
  }

  function toggleQuestDay(questId: string, dayIndex: number) {
    const nextQuests = growthQuests.map((quest) =>
      quest.id === questId
        ? { ...quest, days: quest.days.map((day, index) => index === dayIndex ? { ...day, done: !day.done } : day) }
        : quest
    );
    localStorage.setItem("fadfada-growth-quests", JSON.stringify(nextQuests));
    setGrowthQuests(nextQuests);
  }

  function clearGrowthQuests() {
    localStorage.removeItem("fadfada-growth-quests");
    setGrowthQuests([]);
  }

  function saveMemoryPreferences(next: MemoryPreferences) {
    localStorage.setItem(memoryPreferencesStorageKey, JSON.stringify(next));
    setMemoryPreferences(next);
  }

  function toggleMemoryPreference(key: keyof MemoryPreferences) {
    saveMemoryPreferences({ ...memoryPreferences, [key]: !memoryPreferences[key] });
  }

  function clearAllMemoryArtifacts() {
    localStorage.removeItem("fadfada-saved-moments");
    localStorage.removeItem("fadfada-tiny-plans");
    localStorage.removeItem("fadfada-journey-snapshots");
    localStorage.removeItem("fadfada-growth-quests");
    setSavedMoments([]);
    setTinyPlans([]);
    setJourneySnapshots([]);
    setGrowthQuests([]);
  }

  async function shareSafeCapsule(item: CapsuleLibraryItem) {
    const safeText = buildShareSafeCapsuleText(item, language);
    const shareTitle = language === "ar" ? "كبسولة فضفضة آمنة" : "FadFada Safe Capsule";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: safeText,
          url: "https://fad-fada.vercel.app",
        });
        setShareSafeStatusMessage(language === "ar" ? "تمت مشاركة كبسولة آمنة بدون تفاصيل حساسة." : "Shared a safe capsule without sensitive details.");
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareTitle}\n\n${safeText}`);
        setShareSafeStatusMessage(language === "ar" ? "تم نسخ الكبسولة الآمنة. يمكنك لصقها ومشاركتها." : "Safe capsule copied. You can paste and share it.");
      } else {
        setShareSafeStatusMessage(language === "ar" ? "المشاركة غير مدعومة هنا. جرّب متصفحاً أحدث." : "Share is not supported here. Try a newer browser.");
      }
    } catch {
      setShareSafeStatusMessage(language === "ar" ? "تعذر إكمال المشاركة الآمنة الآن." : "Could not complete safe sharing right now.");
    }

    window.setTimeout(() => setShareSafeStatusMessage(""), 2400);
  }

  async function startPlusCheckout() {
    setBillingStatus("opening");
    setBillingMessage("");
    const discountCode = typeof window !== "undefined" ? localStorage.getItem("fadfada-discount-code") || undefined : undefined;
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, currentLanguage: language, product: "plus_access", personaId: "profile", discountCode }),
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => ({}))) as { url?: string; error?: string; message?: string; messageEn?: string; lemonMessage?: string; paddleMessage?: string }) : null;

    if (data?.url) {
      window.location.assign(data.url);
      return;
    }

    setBillingStatus("error");
    setBillingMessage(getCheckoutErrorMessage(data, language));
  }

  function selectProfileTab(tabId: ProfileTabId) {
    setActiveProfileTab(tabId);
    window.history.pushState(null, "", `#${tabId}`);
  }

  return (
    <main className="min-h-screen bg-ink px-4 pb-16 pt-24 text-bone/90 sm:px-6 md:px-8" dir={direction}>
      <section className="mx-auto mb-6 max-w-5xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ui-kicker text-gold">{isArabic ? "مركز الحساب" : "Account center"}</p>
            <h1 className="mt-2 font-arserif text-3xl text-bone/95 md:text-4xl">{isArabic ? "ملف الحساب" : "Account profile"}</h1>
          </div>
          <Link href="/" className="ui-action self-start border border-gold/35 px-4 py-3 text-gold transition-colors hover:bg-gold hover:text-ink md:self-auto">
            {isArabic ? "إغلاق والعودة للرئيسية" : "Close and return home"}
          </Link>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto [scrollbar-width:none]" aria-label={isArabic ? "أقسام ملف الحساب" : "Account profile sections"} role="tablist">
          {[
            { id: "account-details", ar: "الحساب", en: "Account" },
            { id: "child-profiles", ar: "الأطفال", en: "Children" },
            { id: "journey-map", ar: "الرحلة", en: "Journey" },
            { id: "saved-library", ar: "المحفوظات", en: "Saved" },
          ].map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={activeProfileTab === item.id} onClick={() => selectProfileTab(item.id as ProfileTabId)} className={`shrink-0 border px-4 py-2 font-arsans text-sm transition-colors ${activeProfileTab === item.id ? "border-gold/55 bg-gold/15 text-gold" : "border-white/10 bg-black/15 text-bone/70 hover:border-gold/35 hover:text-gold"}`}>
              {isArabic ? item.ar : item.en}
            </button>
          ))}
        </nav>
      </section>
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <aside id="account-details" className={`${activeProfileTab === "account-details" ? "" : "hidden"} scroll-mt-24 border border-white/10 bg-white/[0.03] p-5`}>
          <p className="ui-kicker">{isArabic ? "ملف الحساب" : "Account profile"}</p>
          <div className="mt-5 flex items-center gap-4">
            <span className="relative h-20 w-20 overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-950">
              {profile.image ? <Image src={profile.image} alt={isArabic ? "شعار الملف" : "Profile logo"} fill sizes="80px" className="object-cover" unoptimized /> : <span className="grid h-full place-items-center font-mono text-2xl text-gold">{isArabic ? "ف" : "F"}</span>}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-arserif text-4xl text-bone/95">{profile.nickname || profile.name || (isArabic ? "ملفي" : "My profile")}</h1>
              <p className="mt-1 truncate font-ensans text-xs text-bone/45" dir="ltr">{profile.email}</p>
              <p className="mt-1 font-arsans text-sm text-gold">{profile.role === "ADMIN" ? (isArabic ? "مدير" : "Admin") : isArabic ? "مستخدم" : "User"} · {formatTier(profile.activeTier, language)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/" className="ui-action border border-white/15 px-3 py-2 text-bone/85 hover:border-gold/35 hover:text-gold">
              {isArabic ? "العودة للمحادثة" : "Return to chat"}
            </Link>
            {profile.role === "ADMIN" ? <Link href="/admin/dashboard" className="ui-action border border-gold/35 px-3 py-2 text-gold">{isArabic ? "لوحة الإدارة" : "Admin dashboard"}</Link> : null}
            <button type="button" onClick={() => void signOut({ callbackUrl: "/" })} className="ui-action border border-red-300/25 px-3 py-2 text-red-200/80">
              {isArabic ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        </aside>

        <section className={`${activeProfileTab === "account-details" ? "" : "hidden"} border border-gold/20 bg-gold/[0.025] p-5`}>
          <p className="ui-kicker">{isArabic ? "الفوترة" : "Billing"}</p>
          <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "إدارة الخطة" : "Manage plan"}</h2>
          <p className="mt-3 font-arsans text-sm leading-7 text-bone/60">
            {isArabic
              ? `خطتك الحالية: ${formatTier(profile.activeTier, language)}${profile.lemonSubscriptionStatus ? ` · ${formatSubscriptionStatus(profile.lemonSubscriptionStatus, language)}` : ""}`
              : `Current plan: ${formatTier(profile.activeTier, language)}${profile.lemonSubscriptionStatus ? ` · ${formatSubscriptionStatus(profile.lemonSubscriptionStatus, language)}` : ""}`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.activeTier === "PLUS" && profile.lemonCustomerPortalUrl ? (
              <a href={profile.lemonCustomerPortalUrl} target="_blank" rel="noreferrer" className="ui-action bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone">
                {isArabic ? "إدارة الاشتراك" : "Manage subscription"}
              </a>
            ) : profile.activeTier === "PLUS" ? (
              <Link href="/refund" className="ui-action border border-white/15 px-4 py-3 text-bone/85 hover:border-gold/35 hover:text-gold">
                {isArabic ? "مساعدة الفوترة" : "Billing help"}
              </Link>
            ) : (
              <button type="button" onClick={() => void startPlusCheckout()} disabled={billingStatus === "opening"} className="ui-action bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone disabled:opacity-60">
                {billingStatus === "opening" ? (isArabic ? "جار فتح الدفع..." : "Opening checkout...") : isArabic ? "الترقية إلى بلس" : "Upgrade to Plus"}
              </button>
            )}
            <Link href="/refund" className="ui-action border border-white/15 px-4 py-3 text-bone/85 hover:border-gold/35 hover:text-gold">
              {isArabic ? "سياسة الاسترداد" : "Refund policy"}
            </Link>
          </div>
          {billingStatus === "error" ? <p className="mt-3 font-arsans text-sm leading-6 text-red-200">{billingMessage}</p> : null}
          <PlusUnlockedPanel language={language} activeTier={profile.activeTier} />
        </section>

        <form onSubmit={saveProfile} className={`${activeProfileTab === "account-details" ? "" : "hidden"} space-y-5 border border-white/10 bg-white/[0.025] p-5`}>
          <div>
            <p className="ui-kicker">{isArabic ? "تعديل الهوية العامة" : "Edit public identity"}</p>
            <p className="mt-2 font-arsans text-sm leading-7 text-bone/55">{isArabic ? "هذه بيانات حساب المستخدم، وليست شخصية الرفيق داخل المحادثة." : "These are account details, separate from the companion persona inside chat."}</p>
          </div>
          <ProfileInput label={isArabic ? "الاسم الكامل" : "Full name"} value={profile.name || ""} onChange={(value) => setProfile((current) => ({ ...current, name: value }))} />
          <ProfileInput label={isArabic ? "الاسم المختصر" : "Nickname"} value={profile.nickname || ""} onChange={(value) => setProfile((current) => ({ ...current, nickname: value }))} />
          <ProfileInput label={isArabic ? "رابط صورة آمن" : "Secure image link"} value={profile.image || ""} onChange={(value) => setProfile((current) => ({ ...current, image: value }))} dir="ltr" />

          <div>
            <p className="mb-3 font-arsans text-sm text-bone/65">{isArabic ? "أو اختر شعار حساب جاهز" : "Or choose a ready account logo"}</p>
            <div className="grid grid-cols-6 gap-2">
              {logoOptions.map((logo) => (
                <button key={logo} type="button" onClick={() => setProfile((current) => ({ ...current, image: logo }))} className={`relative aspect-square overflow-hidden border ${profile.image === logo ? "border-gold" : "border-white/10"}`}>
                  <Image src={logo} alt={isArabic ? "خيار شعار الحساب" : "Profile logo option"} fill sizes="64px" className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["website", "linkedin", "x", "instagram"] as const).map((key) => (
              <ProfileInput key={key} label={socialLabels[language][key]} value={profile.socialLinks[key] || ""} onChange={(value) => setProfile((current) => ({ ...current, socialLinks: { ...current.socialLinks, [key]: value } }))} dir="ltr" />
            ))}
          </div>

          <button type="submit" className="ui-action w-full bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone">
            {status === "saving" ? (isArabic ? "جار الحفظ..." : "Saving...") : status === "saved" ? (isArabic ? "تم الحفظ" : "Saved") : isArabic ? "حفظ الملف" : "Save profile"}
          </button>
          {status === "error" ? <p className="font-arsans text-sm text-red-200">{isArabic ? "لم يتم الحفظ. تأكد أن الروابط تبدأ باتصال آمن." : "Could not save. Make sure links use a secure address."}</p> : null}
        </form>

        <section id="child-profiles" className={`${activeProfileTab === "child-profiles" ? "" : "hidden"} scroll-mt-24 border border-cyan-200/15 bg-cyan-200/[0.025] p-5 md:col-span-2`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="ui-kicker text-cyan-100">{isArabic ? "ملفات الأطفال" : "Children profiles"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "مساحات أطفال منفصلة من حساب واحد" : "Separate child spaces from one account"}</h2>
              <p className="mt-3 font-arsans text-sm leading-7 text-bone/58">
                {isArabic
                  ? "كل طفل له مساحة ومحادثات مستقلة. الطفل لا يملك بريداً أو كلمة مرور، والرجوع لملف الوالد يحتاج تأكيد بريد ولي الأمر."
                  : "Each child gets a separate space and conversation history. Children do not use email or passwords, and returning to the parent profile requires parent email confirmation."}
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[24rem]">
              <button type="button" onClick={() => setChildProfilesExpanded((current) => !current)} className="ui-action border border-cyan-200/25 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-200 hover:text-ink">
                {childProfilesExpanded ? (isArabic ? "إخفاء الملفات" : "Collapse") : isArabic ? "عرض الملفات" : "Show profiles"}
              </button>
              <button type="button" onClick={() => void loadChildProfiles()} disabled={childStatus === "loading"} className="ui-action border border-white/10 px-3 py-2 text-xs text-bone/70 hover:border-cyan-200/35 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-60">
                {childStatus === "loading" ? (isArabic ? "تحديث..." : "Refreshing...") : isArabic ? "تحديث النشاط" : "Refresh activity"}
              </button>
              <button type="button" onClick={() => void loadWeeklyParentReport()} disabled={weeklyReportStatus === "loading"} className="ui-action border border-gold/25 px-3 py-2 text-xs text-gold/82 hover:bg-gold hover:text-ink disabled:cursor-wait disabled:opacity-60">
                {weeklyReportStatus === "loading" ? (isArabic ? "يبني التقرير..." : "Building report...") : isArabic ? "تقرير أسبوعي" : "Weekly report"}
              </button>
              <button type="button" onClick={childProfiles.length >= childProfileLimit && childProfileTier !== "PLUS" ? () => void startPlusCheckout() : () => setChildFormOpen(true)} disabled={childProfiles.length >= childProfileLimit && childProfileTier === "PLUS"} className="ui-action bg-cyan-200 px-3 py-2 text-xs text-ink hover:bg-bone disabled:opacity-60">
                {childProfiles.length >= childProfileLimit ? (childProfileTier === "PLUS" ? (isArabic ? "اكتمل العدد" : "Limit reached") : isArabic ? "ترقية لبلس" : "Upgrade to Plus") : isArabic ? "إضافة طفل" : "Add child"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={isArabic ? "أقسام شاشة الأطفال" : "Children view sections"}>
            {([
              { id: "overview", ar: "ملخص سريع", en: "Quick overview" },
              { id: "insights", ar: "التحليلات", en: "Insights" },
              { id: "tools", ar: "أدوات الوالد", en: "Parent tools" },
              { id: "profiles", ar: "ملفات الأطفال", en: "Child profiles" },
            ] as const).map((tab) => {
              const active = activeChildPanel === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveChildPanel(tab.id)}
                  className={`ui-action border px-3 py-2 text-xs transition-colors ${active ? "border-cyan-200/50 bg-cyan-200 text-ink" : "border-white/10 text-bone/68 hover:border-cyan-200/35 hover:text-cyan-100"}`}
                >
                  {isArabic ? tab.ar : tab.en}
                </button>
              );
            })}
          </div>

          {activeChildPanel === "overview" ? (
          <>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="border border-cyan-200/12 bg-cyan-200/[0.035] p-3">
              <span className="block font-arsans text-[10px] uppercase tracking-[0.08em] text-cyan-100/50">{isArabic ? "الدخول" : "Access"}</span>
              <span className="mt-1 block font-arsans text-xs leading-5 text-bone/60">{isArabic ? "من حساب الوالد فقط" : "Parent account only"}</span>
            </div>
            <div className="border border-cyan-200/12 bg-cyan-200/[0.035] p-3">
              <span className="block font-arsans text-[10px] uppercase tracking-[0.08em] text-cyan-100/50">{isArabic ? "الخصوصية" : "Privacy"}</span>
              <span className="mt-1 block font-arsans text-xs leading-5 text-bone/60">{isArabic ? "لا يرى الطفل ملف الوالد" : "Child never sees parent profile"}</span>
            </div>
            <div className="border border-cyan-200/12 bg-cyan-200/[0.035] p-3">
              <span className="block font-arsans text-[10px] uppercase tracking-[0.08em] text-cyan-100/50">{isArabic ? "السجل" : "History"}</span>
              <span className="mt-1 block font-arsans text-xs leading-5 text-bone/60">{isArabic ? "آخر ٨ أنشطة لكل طفل" : "Last 8 activities per child"}</span>
            </div>
            <div className="border border-gold/20 bg-gold/[0.055] p-3">
              <span className="block font-arsans text-[10px] uppercase tracking-[0.08em] text-gold/60">{isArabic ? "رمز الرجوع" : "Return code"}</span>
              <span className="mt-1 block font-mono text-lg tracking-[0.18em] text-gold" dir="ltr">{parentReturnCode || "----"}</span>
              <span className="mt-1 block font-arsans text-[11px] leading-5 text-bone/48">{isArabic ? "اختصار ولي الأمر: Escape ثلاث مرات. لا يظهر للطفل." : "Parent shortcut: press Escape three times. Not shown to child."}</span>
            </div>
          </div>
          <div className="mt-4 border border-cyan-200/12 bg-black/12 p-3">
            <p className="font-arsans text-xs font-semibold text-cyan-100/80">{isArabic ? "ملخص ولي الأمر اليومي" : "Parent pulse snapshot"}</p>
            {childPulse.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {childPulse.map((item) => {
                  const ritual = buildConnectionRitual(item, language);

                  return (
                  <article key={item.childProfileId} className="border border-white/10 bg-black/18 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-arsans text-sm text-bone/90" dir="auto">{item.nickname}</p>
                      <span className={`rounded-full border px-2 py-0.5 font-arsans text-[10px] ${item.riskLevel === "high" ? "border-red-200/45 text-red-100" : item.riskLevel === "medium" ? "border-amber-200/45 text-amber-100" : "border-emerald-200/35 text-emerald-100"}`}>
                        {formatChildPulseRisk(item.riskLevel, language)}
                      </span>
                    </div>
                    <p className="mt-2 font-arsans text-xs text-bone/58">
                      {isArabic ? "النشاط ٧ أيام" : "7-day activity"}: {item.turnCount7d} · {isArabic ? "المجال" : "World"}: {formatWorld(item.dominantWorld, language)}
                    </p>
                    <p className="mt-1 font-arsans text-xs text-bone/45">
                      {isArabic ? "الاتجاه" : "Trend"}: {formatChildPulseTrend(item.trend, language)}
                    </p>
                    <p className="mt-1 font-arsans text-[11px] text-bone/38">
                      {isArabic ? "آخر نشاط" : "Last activity"}: {item.lastActivityAt ? formatChildConversationDate(item.lastActivityAt, language) : (isArabic ? "لا يوجد" : "No activity")}
                    </p>
                    <div className="mt-3 border border-gold/15 bg-gold/[0.045] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-arsans text-[11px] font-semibold uppercase tracking-[0.08em] text-gold/70">{isArabic ? "طقس الليلة" : "Tonight's ritual"}</p>
                        <span className="rounded-full border border-gold/20 px-2 py-0.5 font-arsans text-[10px] text-gold/72">{ritual.badge}</span>
                      </div>
                      <p className="mt-2 font-arsans text-sm font-semibold text-bone/88">{ritual.title}</p>
                      <p className="mt-1 font-arsans text-xs leading-5 text-bone/52">{ritual.detail}</p>
                      <div className="mt-2 grid gap-1.5">
                        {ritual.steps.map((step) => (
                          <span key={step} className="font-arsans text-[11px] leading-5 text-bone/46">{step}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 font-arsans text-xs text-bone/45">{isArabic ? "سيظهر الملخص بعد تسجيل نشاطات الطفل." : "Pulse cards appear once child activity is recorded."}</p>
            )}
          </div>
          </>
          ) : null}

          {activeChildPanel === "insights" ? (
          <>
          <div className="mt-4 border border-gold/20 bg-gold/[0.04] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-arsans text-xs font-semibold text-gold/80">{isArabic ? "الخط الزمني لولي الأمر" : "Parent Copilot Timeline"}</p>
                <p className="mt-1 font-arsans text-[11px] leading-5 text-bone/48">
                  {isArabic ? "قراءة سريعة لآخر ٧ أيام: ما الذي تغيّر، وما الخطوة الأذكى الليلة؟" : "A fast read of the last 7 days: what changed, and what is the smartest move tonight?"}
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-gold/62">{isArabic ? "٧ أيام" : "7 days"}</span>
            </div>
            {parentTimeline.length > 0 ? (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {parentTimeline.map((entry) => (
                  <article key={entry.childProfileId} className="border border-white/10 bg-black/16 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-arsans text-sm font-semibold text-bone/88" dir="auto">{entry.nickname}</p>
                      <span className="rounded-full border border-gold/20 px-2 py-0.5 font-arsans text-[10px] text-gold/76">{entry.badge}</span>
                    </div>
                    <p className="mt-2 font-arsans text-sm text-bone/82">{entry.title}</p>
                    <p className="mt-2 font-arsans text-xs leading-5 text-bone/55">{entry.summary}</p>
                    <p className="mt-2 font-arsans text-[11px] leading-5 text-cyan-100/72"><span className="font-semibold">{isArabic ? "الإشارة: " : "Signal: "}</span>{entry.signal}</p>
                    <p className="mt-1 font-arsans text-[11px] leading-5 text-emerald-100/72"><span className="font-semibold">{isArabic ? "الخطوة التالية: " : "Next step: "}</span>{entry.nextStep}</p>
                    <p className="mt-2 font-arsans text-[10px] text-bone/34">{isArabic ? "آخر تحديث: " : "Updated: "}{entry.updatedAt ? formatChildConversationDate(entry.updatedAt, language) : (isArabic ? "هادئ هذا الأسبوع" : "quiet this week")}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-arsans text-xs leading-5 text-bone/45">{isArabic ? "سيظهر الخط الزمني عندما يصبح لدى الطفل نشاط ومؤشرات كافية لهذا الأسبوع." : "The timeline appears when a child has enough recent activity and signals this week."}</p>
            )}
          </div>
          <div className="mt-4 border border-amber-200/20 bg-amber-200/[0.045] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-arsans text-xs font-semibold text-amber-100/86">{isArabic ? "التقرير الأسبوعي لولي الأمر" : "Weekly Parent Report"}</p>
                <p className="mt-1 font-arsans text-[11px] leading-5 text-bone/50">
                  {isArabic ? "ملخص نمو، مخاطر، وخطة تنفيذ للأسبوع القادم مبني على نشاط الطفل." : "Growth, safety, and next-week execution plan built from child activity."}
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-amber-100/62">{weeklyReport?.windowDays ? `${weeklyReport.windowDays} ${isArabic ? "أيام" : "days"}` : (isArabic ? "٧ أيام" : "7 days")}</span>
            </div>
            {weeklyReportStatus === "loading" ? <p className="mt-3 font-arsans text-xs text-bone/55">{isArabic ? "نبني التقرير من نشاط الأسبوع..." : "Building your weekly report from recent activity..."}</p> : null}
            {weeklyReportStatus === "error" ? <p className="mt-3 font-arsans text-xs leading-5 text-red-200">{weeklyReportMessage}</p> : null}
            {weeklyReportStatus === "ready" && weeklyReport ? (
              <div className="mt-3 space-y-3">
                <p className="font-arsans text-sm leading-6 text-bone/80">{weeklyReport.summary}</p>
                <div className="grid gap-2 sm:grid-cols-5">
                  <WeeklyMetricTile label={isArabic ? "أطفال نشطون" : "Active children"} value={String(weeklyReport.metrics.activeChildren)} />
                  <WeeklyMetricTile label={isArabic ? "تفاعلات" : "Turns"} value={String(weeklyReport.metrics.totalTurns)} />
                  <WeeklyMetricTile label={isArabic ? "واجبات" : "Homework"} value={String(weeklyReport.metrics.homeworkAssignments)} />
                  <WeeklyMetricTile label={isArabic ? "خطط ولي أمر" : "Playbooks"} value={String(weeklyReport.metrics.playbookRuns)} />
                  <WeeklyMetricTile label={isArabic ? "مخاطر مرتفعة" : "High risk"} value={String(weeklyReport.metrics.highRiskChildren)} />
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="border border-white/10 bg-black/15 p-3">
                    <p className="font-arsans text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-100/75">{isArabic ? "نقاط قوة" : "Wins"}</p>
                    <div className="mt-2 grid gap-1.5">
                      {weeklyReport.wins.map((item) => <span key={item} className="font-arsans text-xs leading-5 text-bone/62">{item}</span>)}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-black/15 p-3">
                    <p className="font-arsans text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-100/75">{isArabic ? "محاور متابعة" : "Focus"}</p>
                    <div className="mt-2 grid gap-1.5">
                      {weeklyReport.focusAreas.map((item) => <span key={item} className="font-arsans text-xs leading-5 text-bone/62">{item}</span>)}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-black/15 p-3">
                    <p className="font-arsans text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-100/75">{isArabic ? "خطة الأسبوع القادم" : "Next week plan"}</p>
                    <div className="mt-2 grid gap-1.5">
                      {weeklyReport.nextWeekPlan.map((item) => <span key={item} className="font-arsans text-xs leading-5 text-bone/62">{item}</span>)}
                    </div>
                  </div>
                </div>

                <p className="border border-gold/18 bg-gold/[0.05] px-3 py-2 font-arsans text-xs leading-5 text-gold/88">{weeklyReport.businessHint}</p>

                {weeklyReport.children.length > 0 ? (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {weeklyReport.children.map((entry) => (
                      <article key={entry.childProfileId} className="border border-white/10 bg-black/16 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-arsans text-sm font-semibold text-bone/88" dir="auto">{entry.nickname}</p>
                          <span className={`rounded-full border px-2 py-0.5 font-arsans text-[10px] ${entry.riskLevel === "high" ? "border-red-200/45 text-red-100" : entry.riskLevel === "medium" ? "border-amber-200/45 text-amber-100" : "border-emerald-200/35 text-emerald-100"}`}>
                            {formatChildPulseRisk(entry.riskLevel, language)}
                          </span>
                        </div>
                        <p className="mt-2 font-arsans text-sm text-bone/82">{entry.headline}</p>
                        <p className="mt-1 font-arsans text-xs leading-5 text-bone/56">{entry.summary}</p>
                        <p className="mt-2 font-arsans text-[11px] leading-5 text-cyan-100/72">
                          <span className="font-semibold">{isArabic ? "الخطوة التالية: " : "Next step: "}</span>{entry.nextAction}
                        </p>
                        <p className="mt-2 font-arsans text-[10px] text-bone/38">
                          {isArabic ? "الاتجاه" : "Trend"}: {formatChildPulseTrend(entry.trend, language)} · {isArabic ? "المجال" : "World"}: {formatWorld(entry.dominantWorld, language)} · {isArabic ? "نشاط" : "Turns"}: {entry.turnCount7d}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}

                <p className="font-arsans text-[10px] text-bone/35">{isArabic ? "آخر تحديث: " : "Updated: "}{formatWeeklyReportGeneratedAt(weeklyReport.generatedAt, language)}</p>
              </div>
            ) : null}
          </div>
          </>
          ) : null}

          {activeChildPanel === "tools" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button id="homework-transformer" type="button" onClick={() => openParentToolDialog("homework")} className="group scroll-mt-24 border border-emerald-200/18 bg-emerald-200/[0.045] p-4 text-start transition-colors hover:border-emerald-200/45 hover:bg-emerald-200/[0.085]">
              <span className="ui-kicker text-emerald-100">{isArabic ? "محول الواجب" : "Homework transformer"}</span>
              <span className="mt-2 block font-arserif text-2xl text-bone/90">{isArabic ? "افتح نافذة تحويل الواجب" : "Open the homework dialog"}</span>
              <span className="mt-2 block font-arsans text-sm leading-6 text-bone/54">{isArabic ? "صورة أو ملاحظة قصيرة تتحول إلى نشاط مرسل لمساحة الطفل." : "Turn an image or short note into an activity sent to the child workspace."}</span>
              <span className="mt-3 inline-flex font-arsans text-xs font-semibold text-emerald-100 group-hover:text-bone">{isArabic ? "فتح المحول" : "Open transformer"}</span>
            </button>
            <button id="parent-playbook" type="button" onClick={() => openParentToolDialog("playbook")} className="group scroll-mt-24 border border-amber-200/18 bg-amber-200/[0.045] p-4 text-start transition-colors hover:border-amber-200/45 hover:bg-amber-200/[0.085]">
              <span className="ui-kicker text-amber-100">{isArabic ? "دليل ولي الأمر" : "Parent Playbook"}</span>
              <span className="mt-2 block font-arserif text-2xl text-bone/90">{isArabic ? "افتح نافذة خطة الموقف" : "Open the parent plan dialog"}</span>
              <span className="mt-2 block font-arsans text-sm leading-6 text-bone/54">{isArabic ? "اكتب موقفًا صعبًا لتحصل على جملة، حد، وخطوة اتصال." : "Write a hard moment and get phrases, boundaries, and one connection move."}</span>
              <span className="mt-3 inline-flex font-arsans text-xs font-semibold text-amber-100 group-hover:text-bone">{isArabic ? "فتح الدليل" : "Open playbook"}</span>
            </button>
          </div>
          ) : null}
          {activeParentToolDialog === "playbook" ? (
          <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/76 px-3 py-4 backdrop-blur-md sm:px-6" role="dialog" aria-modal="true" aria-label={isArabic ? "دليل ولي الأمر" : "Parent Playbook"} dir={direction}>
          <section className="mx-auto max-w-6xl border border-amber-200/22 bg-[#0E0D10] p-4 shadow-2xl shadow-black/70" dir={direction}>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={closeParentToolDialog} className="ui-action border border-white/10 px-3 py-2 text-xs text-bone/65 hover:border-amber-200/35 hover:text-amber-100">
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={submitParentPlaybook} className="space-y-3 text-start">
                <div>
                  <p className="ui-kicker text-amber-100">{isArabic ? "دليل ولي الأمر" : "Parent Playbook"}</p>
                  <h3 className="mt-2 font-arserif text-2xl text-bone/92">{isArabic ? "حوّل الموقف الصعب إلى خطة قصيرة" : "Turn a hard moment into a short plan"}</h3>
                  <p className="mt-2 font-arsans text-sm leading-6 text-bone/56">
                    {isArabic
                      ? "اكتب موقفًا مثل رفض الواجب، النوم، الشاشات، أو غضب الطفل. سنبني لك جملة تبدأ بها، حدًا واضحًا، ولعبة اتصال صغيرة."
                      : "Write a moment like homework refusal, bedtime, screens, or big feelings. FadFada builds what to say, the boundary, and one tiny connection move."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-start">
                    <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "الطفل" : "Child"}</span>
                    <select value={playbookChildProfileId} onChange={(event) => setPlaybookChildProfileId(event.target.value)} className="w-full rounded-lg border border-amber-200/18 bg-black/24 px-3 py-2.5 font-arsans text-sm text-bone/82 outline-none focus:border-amber-200/45">
                      <option value="">{isArabic ? "بدون طفل محدد" : "No specific child"}</option>
                      {childProfiles.map((child) => <option key={child.id} value={child.id}>{child.nickname}</option>)}
                    </select>
                  </label>
                  <label className="block text-start">
                    <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "طاقتك الآن" : "Your energy now"}</span>
                    <select value={playbookEnergy} onChange={(event) => setPlaybookEnergy(event.target.value as "calm" | "tired" | "stressed" | "angry")} className="w-full rounded-lg border border-amber-200/18 bg-black/24 px-3 py-2.5 font-arsans text-sm text-bone/82 outline-none focus:border-amber-200/45">
                      <option value="calm">{isArabic ? "هادئ" : "Calm"}</option>
                      <option value="tired">{isArabic ? "متعب" : "Tired"}</option>
                      <option value="stressed">{isArabic ? "مضغوط" : "Stressed"}</option>
                      <option value="angry">{isArabic ? "غاضب" : "Angry"}</option>
                    </select>
                  </label>
                </div>
                <label className="block text-start">
                  <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "ما الموقف؟" : "What happened?"}</span>
                  <textarea value={playbookSituation} onChange={(event) => setPlaybookSituation(event.target.value)} rows={4} placeholder={isArabic ? "مثلاً: ابني يرفض الواجب ويبكي كل مرة أطلب منه يبدأ." : "Example: My child refuses homework and cries every time I ask them to start."} className="w-full resize-none rounded-lg border border-white/10 bg-black/24 px-3 py-2.5 font-arsans text-sm leading-6 text-bone/82 outline-none placeholder:text-bone/28 focus:border-amber-200/45" />
                </label>
                <label className="block text-start">
                  <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "هدفك الاختياري" : "Optional goal"}</span>
                  <input value={playbookGoal} onChange={(event) => setPlaybookGoal(event.target.value)} placeholder={isArabic ? "أريد أن أساعده يبدأ بدون صراخ" : "I want to help them start without shouting"} className="w-full rounded-lg border border-white/10 bg-black/24 px-3 py-2.5 font-arsans text-sm text-bone/82 outline-none placeholder:text-bone/28 focus:border-amber-200/45" />
                </label>
                <button type="submit" disabled={playbookStatus === "building"} className="ui-action w-full bg-amber-200 px-4 py-3 text-ink transition-colors hover:bg-bone disabled:cursor-wait disabled:opacity-60">
                  {playbookStatus === "building" ? (isArabic ? "يبني الخطة..." : "Building playbook...") : isArabic ? "اصنع خطة ولي الأمر" : "Create parent playbook"}
                </button>
                {playbookMessage ? <p className={`font-arsans text-xs leading-5 ${playbookStatus === "error" ? "text-red-100" : "text-amber-100/78"}`}>{playbookMessage}</p> : null}
              </form>
              <div className="border border-white/10 bg-black/18 p-3 text-start">
                {playbookResult ? (
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-arsans text-xs font-semibold uppercase tracking-[0.08em] text-amber-100/70">{playbookResult.childNickname || (isArabic ? "خطة عامة" : "general plan")}</p>
                        <h4 className="mt-1 font-arsans text-lg font-semibold text-bone/90">{playbookResult.title}</h4>
                      </div>
                      <span className="rounded-full border border-amber-200/25 px-2.5 py-1 font-arsans text-[10px] text-amber-100/72">{isArabic ? "جاهزة الآن" : "ready now"}</span>
                    </div>
                    <p className="mt-2 font-arsans text-sm leading-6 text-bone/62">{playbookResult.quickRead}</p>
                    <p className="mt-3 rounded-xl border border-amber-200/16 bg-amber-200/[0.055] px-3 py-2 font-arsans text-sm leading-6 text-amber-50/88">{playbookResult.childLens}</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="border border-emerald-200/16 bg-emerald-200/[0.04] p-3">
                        <p className="font-arsans text-xs font-semibold text-emerald-100/78">{isArabic ? "قل هذا" : "Say this"}</p>
                        <ul className="mt-2 space-y-1.5">
                          {playbookResult.sayThis.map((item) => <li key={item} className="font-arsans text-xs leading-5 text-bone/66">{item}</li>)}
                        </ul>
                      </div>
                      <div className="border border-red-200/14 bg-red-200/[0.035] p-3">
                        <p className="font-arsans text-xs font-semibold text-red-100/72">{isArabic ? "تجنب هذا" : "Avoid this"}</p>
                        <ul className="mt-2 space-y-1.5">
                          {playbookResult.avoidThis.map((item) => <li key={item} className="font-arsans text-xs leading-5 text-bone/58">{item}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-2 border border-white/10 bg-black/18 p-3">
                      <p className="font-arsans text-xs font-semibold text-bone/68">{isArabic ? "إعادة ضبط من ٤ خطوات" : "4-step reset"}</p>
                      <div className="mt-2 grid gap-1.5">
                        {playbookResult.resetSteps.map((item, index) => <span key={item} className="font-arsans text-xs leading-5 text-bone/62"><span className="text-amber-100/72">{index + 1}. </span>{item}</span>)}
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <p className="border border-cyan-200/14 bg-cyan-200/[0.035] p-3 font-arsans text-xs leading-5 text-cyan-50/72"><span className="font-semibold">{isArabic ? "لعبة اتصال: " : "Play bridge: "}</span>{playbookResult.playBridge}</p>
                      <p className="border border-gold/18 bg-gold/[0.045] p-3 font-arsans text-xs leading-5 text-bone/66"><span className="font-semibold text-gold/76">{isArabic ? "الحد: " : "Boundary: "}</span>{playbookResult.boundaryScript}</p>
                    </div>
                    <p className="mt-2 font-arsans text-xs leading-5 text-bone/56"><span className="font-semibold text-amber-100/74">{isArabic ? "إصلاح: " : "Repair: "}</span>{playbookResult.repairLine}</p>
                    <p className="mt-1 font-arsans text-xs leading-5 text-bone/46"><span className="font-semibold">{isArabic ? "متابعة: " : "Follow-up: "}</span>{playbookResult.followUp}</p>
                    <p className="mt-3 font-arsans text-[11px] leading-5 text-bone/34">{playbookResult.safetyNote}</p>
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-amber-200/18 bg-amber-200/[0.025] p-5 text-center">
                    <div>
                      <p className="font-arserif text-2xl text-amber-100/86">{isArabic ? "خطة جاهزة قبل رد الفعل" : "A plan before the reaction"}</p>
                      <p className="mt-2 font-arsans text-sm leading-6 text-bone/48">
                        {isArabic ? "ستظهر هنا جمل جاهزة، حدود، وخطوة اتصال صغيرة تساعدك تتصرف بثبات." : "Ready phrases, boundaries, and one connection move will appear here."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          </div>
          ) : null}
          {activeParentToolDialog === "homework" ? (
          <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/76 px-3 py-4 backdrop-blur-md sm:px-6" role="dialog" aria-modal="true" aria-label={isArabic ? "محول الواجب" : "Homework transformer"} dir={direction}>
          <section className="mx-auto max-w-6xl border border-emerald-200/22 bg-[#0E0D10] p-4 shadow-2xl shadow-black/70" dir={direction}>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={closeParentToolDialog} className="ui-action border border-white/10 px-3 py-2 text-xs text-bone/65 hover:border-emerald-200/35 hover:text-emerald-100">
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <form onSubmit={submitHomeworkHelper} className="space-y-3 text-start">
                <div>
                  <p className="ui-kicker text-emerald-100">{isArabic ? "محول الواجب" : "Homework transformer"}</p>
                  <h3 className="mt-2 font-arserif text-2xl text-bone/92">{isArabic ? "صوّر الواجب ونحوّله للعبة تعليم" : "Capture homework, turn it into learning play"}</h3>
                  <p className="mt-2 font-arsans text-sm leading-6 text-bone/56">
                    {isArabic
                      ? "ارفع صورة واجب رياضيات، إنجليزي، عربي، أو نشاط KG. سنستخرج المهارة ونبني أسئلة وتلميحات وإجابات لولي الأمر."
                      : "Upload a math, English, Arabic, or KG worksheet. FadFada extracts the skill and builds questions, hints, and parent answers."}
                  </p>
                </div>
                <label className="block text-start">
                  <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "إرسال إلى الطفل" : "Send to child"}</span>
                  <select value={homeworkChildProfileId} onChange={(event) => setHomeworkChildProfileId(event.target.value)} className="w-full rounded-lg border border-emerald-200/18 bg-black/24 px-3 py-2.5 font-arsans text-sm text-bone/82 outline-none focus:border-emerald-200/45">
                    {childProfiles.length === 0 ? <option value="">{isArabic ? "أنشئ ملف طفل أولاً" : "Create a child profile first"}</option> : null}
                    {childProfiles.map((child) => <option key={child.id} value={child.id}>{child.nickname}</option>)}
                  </select>
                </label>
                <div className="block border border-emerald-200/18 bg-black/18 p-3 transition-colors hover:border-emerald-200/40">
                  <span className="block font-arsans text-xs font-semibold text-emerald-100/82">{isArabic ? "صورة الواجب أو لقطة الكاميرا" : "Homework image or camera capture"}</span>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="ui-action cursor-pointer border border-emerald-200/28 bg-emerald-200/10 px-3 py-2.5 text-center text-xs text-emerald-50 transition-colors hover:bg-emerald-200 hover:text-ink">
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectHomeworkImage} className="sr-only" />
                      {isArabic ? "رفع صورة" : "Upload image"}
                    </label>
                    <label className="ui-action cursor-pointer bg-emerald-200 px-3 py-2.5 text-center text-xs text-ink transition-colors hover:bg-bone">
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" capture="environment" onChange={selectHomeworkImage} className="sr-only" />
                      {isArabic ? "فتح الكاميرا" : "Open camera"}
                    </label>
                  </div>
                  {homeworkImage ? <span className="mt-2 block truncate font-arsans text-[11px] text-emerald-100/72" dir="auto">{homeworkImage.name}</span> : null}
                  <p className="mt-2 font-arsans text-[11px] leading-5 text-bone/38">{isArabic ? "زر الكاميرا يفتح كاميرا الهاتف إذا كان المتصفح يدعم ذلك." : "The camera button opens the phone camera when the browser supports it."}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                  <label className="block text-start">
                    <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "مرحلة الطفل" : "Child stage"}</span>
                    <select value={homeworkAgeBand} onChange={(event) => setHomeworkAgeBand(event.target.value as ChildProfile["ageBand"] | "unknown")} className="w-full rounded-lg border border-white/10 bg-black/24 px-3 py-2.5 font-arsans text-sm text-bone/82 outline-none focus:border-emerald-200/45">
                      <option value="unknown">{isArabic ? "تلقائي" : "Auto"}</option>
                      <option value="under_8">{formatChildAgeBand("under_8", language)}</option>
                      <option value="8_to_10">{formatChildAgeBand("8_to_10", language)}</option>
                      <option value="11_to_12">{formatChildAgeBand("11_to_12", language)}</option>
                      <option value="13_plus">{formatChildAgeBand("13_plus", language)}</option>
                    </select>
                  </label>
                  <label className="block text-start">
                    <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "ملاحظة اختيارية" : "Optional note"}</span>
                    <input value={homeworkHint} onChange={(event) => setHomeworkHint(event.target.value)} placeholder={isArabic ? "مثلاً: جمع حتى ٢٠ أو حروف A/B/C" : "Example: addition to 20 or A/B/C letters"} className="w-full rounded-lg border border-white/10 bg-black/24 px-3 py-2.5 font-arsans text-sm text-bone/82 outline-none placeholder:text-bone/28 focus:border-emerald-200/45" />
                  </label>
                </div>
                <button type="submit" disabled={homeworkStatus === "analyzing"} className="ui-action w-full bg-emerald-200 px-4 py-3 text-ink transition-colors hover:bg-bone disabled:cursor-wait disabled:opacity-60">
                  {homeworkStatus === "analyzing" ? (isArabic ? "يقرأ الواجب..." : "Reading homework...") : isArabic ? "اصنع وأرسل للطفل" : "Create and send to child"}
                </button>
                {homeworkMessage ? <p className={`font-arsans text-xs leading-5 ${homeworkStatus === "error" ? "text-red-100" : "text-emerald-100/78"}`}>{homeworkMessage}</p> : null}
                <p className="font-arsans text-[11px] leading-5 text-bone/38">
                  {isArabic ? "للخصوصية: لا ترفع اسم المدرسة أو بيانات الطفل الكاملة." : "Privacy: avoid school names, teacher names, or the child’s full private details."}
                </p>
              </form>
              <div className="border border-white/10 bg-black/18 p-3 text-start">
                {homeworkResult ? (
                  <div>
                    {homeworkImagePreviewUrl ? (
                      <figure className="mb-3 overflow-hidden border border-emerald-200/18 bg-[#050607]">
                        <img src={homeworkImagePreviewUrl} alt={isArabic ? "صورة الواجب الأصلية" : "Original homework image"} className="max-h-72 w-full object-contain" />
                        <figcaption className="border-t border-emerald-200/12 px-3 py-2 font-arsans text-[11px] text-emerald-100/68" dir="auto">
                          {isArabic ? "مرجع الواجب الأصلي" : "Original homework reference"}{homeworkImage?.name ? ` · ${homeworkImage.name}` : ""}
                        </figcaption>
                      </figure>
                    ) : null}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-arsans text-xs font-semibold uppercase tracking-[0.08em] text-emerald-100/70">{formatHomeworkSubject(homeworkResult.subject, language)}</p>
                        <h4 className="mt-1 font-arsans text-lg font-semibold text-bone/90">{homeworkResult.detectedTask}</h4>
                      </div>
                      <span className="rounded-full border border-emerald-200/25 px-2.5 py-1 font-arsans text-[10px] text-emerald-100/72">{isArabic ? "جاهز للطفل" : "child-ready"}</span>
                    </div>
                    <p className="mt-2 font-arsans text-sm leading-6 text-bone/58">{homeworkResult.parentSummary}</p>
                    <p className="mt-3 rounded-xl border border-emerald-200/16 bg-emerald-200/[0.055] px-3 py-2 font-arsans text-sm font-semibold text-emerald-50/88">{homeworkResult.childIntro}</p>
                    <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(110,231,183,0.4)_transparent]">
                      {homeworkResult.activities.map((activity, index) => (
                        <article key={`${activity.title}-${index}`} className="border border-white/10 bg-black/18 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-arsans text-sm font-semibold text-bone/88">{activity.title}</p>
                            <span className="rounded-full border border-white/10 px-2 py-0.5 font-arsans text-[10px] text-bone/45">{formatHomeworkActivityType(activity.type, language)}</span>
                          </div>
                          <p className="mt-2 font-arsans text-xs leading-5 text-bone/70">{activity.prompt}</p>
                          {activity.choices && activity.choices.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {activity.choices.map((choice) => <span key={choice} className="rounded-full border border-emerald-200/16 bg-emerald-200/[0.045] px-2 py-1 font-arsans text-[11px] text-emerald-100/72">{choice}</span>)}
                            </div>
                          ) : null}
                          <p className="mt-2 font-arsans text-[11px] leading-5 text-amber-100/72"><span className="font-semibold">{isArabic ? "تلميح: " : "Hint: "}</span>{activity.hint}</p>
                          <p className="mt-1 font-arsans text-[11px] leading-5 text-cyan-100/66"><span className="font-semibold">{isArabic ? "إجابة ولي الأمر: " : "Parent answer: "}</span>{activity.answer}</p>
                        </article>
                      ))}
                    </div>
                    <p className="mt-3 font-arsans text-[11px] leading-5 text-bone/38">{homeworkResult.safetyNote}</p>
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-emerald-200/18 bg-emerald-200/[0.025] p-5 text-center">
                    <div>
                      <p className="font-arserif text-2xl text-emerald-100/86">{isArabic ? "من ورقة واجب إلى لعبة" : "From worksheet to game"}</p>
                      <p className="mt-2 font-arsans text-sm leading-6 text-bone/48">
                        {isArabic ? "ستظهر هنا أسئلة قصيرة، اختيارات، تلميحات، وإجابات تساعد ولي الأمر يراجع مع الطفل بدون توتر." : "Short questions, choices, hints, and parent answers will appear here for calm homework review."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          </div>
          ) : null}
          {activeChildPanel === "profiles" ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-2xl border border-cyan-200/16 bg-black/16 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]" dir={direction}>
                <p className="font-arsans text-xs font-semibold text-cyan-100/82">{isArabic ? "إضافة ملف طفل" : "Add child profile"}</p>
                <p className="mt-1 font-arsans text-xs leading-5 text-bone/55">
                  {isArabic
                    ? `حد الأطفال الحالي: ${childProfiles.length}/${childProfileLimit} (${childProfileTier === "PLUS" ? "بلس" : "مجاني"}).`
                    : `Current child limit: ${childProfiles.length}/${childProfileLimit} (${childProfileTier === "PLUS" ? "Plus" : "Free"}).`}
                </p>
                <form onSubmit={createChildProfile} className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-start">
                      <span className="mb-2 block font-arsans text-xs text-bone/60">{isArabic ? "سنة الميلاد" : "Birth year"}</span>
                      <input
                        value={childForm.birthYear}
                        onChange={(event) => setChildForm((current) => ({ ...current, birthYear: event.target.value }))}
                        dir="ltr"
                        className="w-full rounded-xl border border-white/12 bg-[#0F1216] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none focus:border-cyan-200/45"
                      />
                    </label>
                    <label className="block text-start">
                      <span className="mb-2 block font-arsans text-xs text-bone/60">{isArabic ? "الحد اليومي بالدقائق" : "Daily limit (minutes)"}</span>
                      <input
                        value={childForm.dailyTimeLimitMinutes}
                        onChange={(event) => setChildForm((current) => ({ ...current, dailyTimeLimitMinutes: event.target.value }))}
                        dir="ltr"
                        className="w-full rounded-xl border border-white/12 bg-[#0F1216] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none focus:border-cyan-200/45"
                      />
                    </label>
                  </div>
                  <label className="block text-start">
                    <span className="mb-2 block font-arsans text-xs text-bone/60">{isArabic ? "اسم الطفل" : "Child nickname"}</span>
                    <input
                      value={childForm.nickname}
                      onChange={(event) => setChildForm((current) => ({ ...current, nickname: event.target.value }))}
                      className="w-full rounded-xl border border-white/12 bg-[#0F1216] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none focus:border-cyan-200/45"
                    />
                  </label>
                  <div>
                    <p className="mb-2 font-arsans text-xs text-bone/62">{isArabic ? "اختر رفيق البداية" : "Choose starter companion"}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {childAvatarOptions.map((option) => (
                        <button
                          key={option.avatar}
                          type="button"
                          onClick={() => setChildForm((current) => ({ ...current, avatarPreference: option.avatar }))}
                          className={`border p-1.5 text-center ${childForm.avatarPreference === option.avatar ? "border-cyan-200/70 bg-cyan-200/10" : "border-white/12 bg-[#0F1216] hover:border-cyan-200/35"}`}
                        >
                          <span className="relative mx-auto block h-12 w-12 overflow-hidden rounded-full bg-cyan-200/10">
                            <Image src={option.avatar} alt={isArabic ? option.ar : option.en} fill sizes="48px" className="object-cover" unoptimized />
                          </span>
                          <span className="mt-1 block truncate font-arsans text-[10px] text-bone/58">{isArabic ? option.ar : option.en}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={childStatus === "saving" || childProfiles.length >= childProfileLimit}
                    className="ui-action w-full rounded-xl bg-cyan-200 px-4 py-3 text-ink hover:bg-bone disabled:opacity-60"
                  >
                    {childStatus === "saving" ? (isArabic ? "جار إنشاء الملف..." : "Creating profile...") : childProfiles.length >= childProfileLimit ? (isArabic ? "وصلت للحد الأقصى" : "Profile limit reached") : isArabic ? "إضافة ملف طفل" : "Add child profile"}
                  </button>
                </form>
              </section>

              <section className="rounded-2xl border border-cyan-200/16 bg-black/16 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]" dir={direction}>
                <p className="font-arsans text-sm font-semibold text-bone/90">
                  {isArabic
                    ? "الطفل لا ينشئ حسابا ولا يضيف بريدا أو كلمة مرور. الوالد يضيف ملفا آمنا ثم يضغط فتح مساحة الطفل."
                    : "Children do not create accounts or passwords. Parent adds a safe profile, then opens the child space."}
                </p>
                <div className="mt-3 rounded-xl border border-cyan-200/24 bg-cyan-200/[0.07] p-3">
                  <p className="font-arsans text-xs font-semibold text-cyan-100/92">{isArabic ? "طريقة دخول الطفل" : "Child access method"}</p>
                  <p className="mt-1 font-arsans text-sm text-bone/80">{isArabic ? "لا يوجد يوزر أو باسورد للطفل حاليا. هذا مقصود للأمان؛ الوالد يسجل الدخول ثم يختار الطفل." : "No username or password for child mode by design; parent signs in and selects the child."}</p>
                </div>

                <div className="mt-4 space-y-2 md:hidden">
                  {childProfiles.map((child) => (
                    <article key={`${child.id}-card`} className="rounded-xl border border-white/12 bg-[#0F1216] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-cyan-200/25 bg-cyan-200/10">
                            <Image src={child.avatarPreference} alt={child.nickname} fill sizes="36px" className="object-cover" unoptimized />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-arsans text-sm font-semibold text-bone/88" dir="auto">{child.nickname}</p>
                            <p className="font-arsans text-[11px] text-bone/45">{formatChildAgeBand(child.ageBand, language)} · {child.gamePoints} pts</p>
                          </div>
                        </div>
                        <span className="font-arsans text-[11px] text-bone/65" dir="ltr">{child.dailyTimeLimitMinutes} {isArabic ? "د/يوم" : "min/day"}</span>
                      </div>
                      <p className="mt-2 font-arsans text-[11px] text-bone/62">{isArabic ? "الدخول من حساب الوالد فقط" : "Parent account only"}</p>
                      <button
                        type="button"
                        onClick={() => void openChildWorkspace(child.id)}
                        disabled={childStatus === "switching"}
                        className="ui-action mt-3 w-full rounded-lg border border-cyan-200/35 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-200 hover:text-ink disabled:opacity-60"
                      >
                        {isArabic ? "فتح مساحة الطفل" : "Open child space"}
                      </button>
                    </article>
                  ))}
                </div>

                <div className="mt-4 hidden overflow-x-auto rounded-xl border border-white/12 md:block">
                  <table className="w-full border-collapse text-xs sm:text-sm" dir={direction}>
                    <thead className="bg-white/[0.02]">
                      <tr>
                        <th className="border-b border-white/10 px-3 py-2 text-start font-arsans text-xs text-cyan-100/75">{isArabic ? "الطفل" : "Child"}</th>
                        <th className="border-b border-white/10 px-3 py-2 text-start font-arsans text-xs text-cyan-100/75">{isArabic ? "الدخول" : "Access"}</th>
                        <th className="border-b border-white/10 px-3 py-2 text-start font-arsans text-xs text-cyan-100/75">{isArabic ? "الحد" : "Limit"}</th>
                        <th className="border-b border-white/10 px-3 py-2 text-start font-arsans text-xs text-cyan-100/75">{isArabic ? "إجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childProfiles.map((child) => (
                        <tr key={child.id} className="border-b border-white/10 transition-colors hover:bg-white/[0.02] last:border-b-0">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="relative h-9 w-9 overflow-hidden rounded-full border border-cyan-200/25 bg-cyan-200/10">
                                <Image src={child.avatarPreference} alt={child.nickname} fill sizes="36px" className="object-cover" unoptimized />
                              </span>
                              <div>
                                <p className="font-arsans text-sm font-semibold text-bone/88" dir="auto">{child.nickname}</p>
                                <p className="font-arsans text-[11px] text-bone/45">{formatChildAgeBand(child.ageBand, language)} · {child.gamePoints} pts</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-arsans text-xs text-bone/72">{isArabic ? "من حساب الوالد فقط" : "Parent account only"}</td>
                          <td className="px-3 py-2 font-arsans text-xs text-bone/72">{child.dailyTimeLimitMinutes} {isArabic ? "دقيقة يوميا" : "min/day"}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => void openChildWorkspace(child.id)}
                              disabled={childStatus === "switching"}
                              className="ui-action rounded-lg border border-cyan-200/35 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-200 hover:text-ink disabled:opacity-60"
                            >
                              {isArabic ? "فتح مساحة الطفل" : "Open child space"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-arsans text-sm font-semibold text-cyan-100/84">{isArabic ? "آخر محادثات الطفل" : "Recent child conversations"}</p>
                    {session?.user && "workspaceMode" in session.user && session.user.workspaceMode === "child" ? (
                      <button type="button" onClick={() => void returnToParentWorkspace()} disabled={childStatus === "switching"} className="ui-action rounded-lg border border-cyan-200/35 px-2.5 py-1.5 text-[11px] text-cyan-100 hover:bg-cyan-200 hover:text-ink disabled:opacity-60">
                        {childStatus === "switching" ? (isArabic ? "جار الرجوع..." : "Returning...") : isArabic ? "الرجوع للوالد" : "Back to parent"}
                      </button>
                    ) : null}
                  </div>
                  {childProfiles.length > 0 && childProfiles.some((child) => child.conversationHistory.length > 0) ? (
                    <div className="mt-2 space-y-2">
                      {childProfiles.slice(0, 3).map((child) => {
                        const latest = child.conversationHistory[0];
                        if (!latest) return null;
                        return (
                          <article key={`${child.id}-latest`} className="rounded-xl border border-white/12 bg-[#0F1216] px-3 py-2.5">
                            <p className="font-arsans text-xs font-semibold text-bone/86" dir="auto">{child.nickname}</p>
                            <p className="mt-1 font-arsans text-xs leading-5 text-bone/58" dir="auto">{latest.childText}</p>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-xl border border-white/12 bg-[#0F1216] px-3 py-2.5 font-arsans text-xs text-bone/48">
                      {isArabic ? "لم يبدأ هذا الطفل محادثة بعد. بعد فتح مساحة الطفل وإرسال أول رسالة ستظهر هنا." : "No child messages yet. After opening child space and sending a first message, it will appear here."}
                    </p>
                  )}
                </div>

                {childMessage ? <p className={`mt-3 font-arsans text-sm leading-6 ${childStatus === "error" ? "text-red-200" : "text-cyan-100/80"}`}>{childMessage}</p> : null}
              </section>
            </div>
          ) : null}

          {childFormOpen ? (
            <div className="fixed inset-0 z-[70] grid place-items-center bg-black/72 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={isArabic ? "إضافة طفل" : "Add child"} dir={direction}>
              <form onSubmit={createChildProfile} className="max-h-[88vh] w-full max-w-2xl space-y-4 overflow-y-auto border border-cyan-200/18 bg-[#0E0D10]/96 p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="ui-kicker text-cyan-100">{isArabic ? "إضافة طفل" : "Add child"}</p>
                    <h3 className="mt-2 font-arserif text-2xl text-bone/90">{isArabic ? "ملف آمن بدون حساب منفصل" : "Safe profile without a separate login"}</h3>
                  </div>
                  <button type="button" onClick={() => setChildFormOpen(false)} className="ui-action border border-white/10 px-3 py-2 text-xs text-bone/60 hover:border-bone/35 hover:text-bone">
                    {isArabic ? "إغلاق" : "Close"}
                  </button>
                </div>
                <ProfileInput label={isArabic ? "اسم مختصر للطفل" : "Child safe nickname"} value={childForm.nickname} onChange={(value) => setChildForm((current) => ({ ...current, nickname: value }))} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProfileInput label={isArabic ? "سنة الميلاد" : "Birth year"} value={childForm.birthYear} onChange={(value) => setChildForm((current) => ({ ...current, birthYear: value }))} dir="ltr" />
                  <ProfileInput label={isArabic ? "الحد اليومي بالدقائق" : "Daily limit in minutes"} value={childForm.dailyTimeLimitMinutes} onChange={(value) => setChildForm((current) => ({ ...current, dailyTimeLimitMinutes: value }))} dir="ltr" />
                </div>
                <div>
                  <p className="mb-3 font-arsans text-sm text-bone/65">{isArabic ? "اختر رفيق البداية" : "Choose a starter companion"}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {childAvatarOptions.map((option) => (
                      <button key={option.avatar} type="button" onClick={() => setChildForm((current) => ({ ...current, avatarPreference: option.avatar }))} className={`border p-2 transition-colors ${childForm.avatarPreference === option.avatar ? "border-cyan-200/70 bg-cyan-200/10" : "border-white/10 bg-black/10 hover:border-cyan-200/35"}`}>
                        <span className="relative block aspect-square overflow-hidden rounded-full bg-cyan-200/10">
                          <Image src={option.avatar} alt={isArabic ? option.ar : option.en} fill sizes="64px" className="object-cover" unoptimized />
                        </span>
                        <span className="mt-2 block truncate font-arsans text-[11px] text-bone/60">{isArabic ? option.ar : option.en}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={childStatus === "saving" || childProfiles.length >= childProfileLimit} className="ui-action w-full bg-cyan-200 px-4 py-3 text-ink transition-colors hover:bg-bone disabled:opacity-60">
                  {childStatus === "saving" ? (isArabic ? "جار إنشاء الملف..." : "Creating profile...") : childProfiles.length >= childProfileLimit ? (isArabic ? "وصلت للحد الأقصى" : "Profile limit reached") : isArabic ? "إضافة ملف طفل" : "Add child profile"}
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <section id="journey-map" className={`${activeProfileTab === "journey-map" ? "" : "hidden"} scroll-mt-24 border border-dusk/25 bg-dusk/[0.035] p-5 md:col-span-2`}>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="ui-kicker text-dusk">{isArabic ? "خريطة الرحلة" : "Journey map"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "ما يتكرر في رحلتك" : "What keeps returning in your journey"}</h2>
              <p className="mt-3 font-arsans text-sm leading-7 text-bone/58">{journeyInsight.nextFocus}</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <InsightTile label={isArabic ? "أثر محفوظ" : "Artifacts"} value={journeyInsight.artifactCount.toLocaleString(isArabic ? "ar-EG" : "en-US")} />
                <InsightTile label={isArabic ? "خطوات منجزة" : "Steps done"} value={journeyInsight.completedQuestSteps.toLocaleString(isArabic ? "ar-EG" : "en-US")} />
                <InsightTile label={isArabic ? "مؤشر التقدم" : "Progress"} value={`${journeyInsight.reflectionScore}%`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setJourneyWorldFilter("all")}
                  className={`ui-action border px-3 py-2 text-xs ${journeyWorldFilter === "all" ? "border-dusk/60 bg-dusk text-ink" : "border-white/10 text-bone/72 hover:border-dusk/35 hover:text-dusk"}`}
                >
                  {isArabic ? "كل المساحات" : "All worlds"}
                </button>
                {journeyWorldOptions.map((world) => {
                  const active = journeyWorldFilter === world;
                  return (
                    <button
                      key={world}
                      type="button"
                      onClick={() => setJourneyWorldFilter(world)}
                      className={`ui-action border px-3 py-2 text-xs ${active ? "border-dusk/60 bg-dusk text-ink" : "border-white/10 text-bone/72 hover:border-dusk/35 hover:text-dusk"}`}
                    >
                      {formatWorld(world, language)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              <p className="font-arsans text-sm text-bone/55">{journeyInsight.streakSignal}</p>
              <div className="space-y-3">
                {journeyInsight.dominantWorlds.length > 0 ? journeyInsight.dominantWorlds.map((entry) => (
                  <div key={entry.world} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3">
                    <span className="font-arsans text-xs text-bone/55">{formatWorld(entry.world, language)}</span>
                    <span className="h-px bg-white/10"><span className="block h-px bg-dusk" style={{ width: `${Math.min(100, entry.count * 22)}%` }} /></span>
                    <span className="text-right font-mono text-[10px] text-bone/38">{entry.count}</span>
                  </div>
                )) : <p className="font-arsans text-sm text-bone/42">{isArabic ? "ابدأ بحفظ لحظة أو خطة صغيرة لتظهر الخريطة." : "Save a moment or tiny plan to light up the map."}</p>}
              </div>
            </div>
          </div>

          <div className="mt-6 border border-white/10 bg-black/12 p-4">
            <p className="ui-kicker text-dusk">{isArabic ? "مسار الانتقال بين المساحات" : "World movement trail"}</p>
            <p className="mt-2 font-arsans text-sm text-bone/58">{isArabic ? "نقرأ آخر الآثار المحفوظة لنرى كيف تنتقل من مساحة لأخرى أثناء الأيام." : "We read your latest saved artifacts to show how you move from one world to another over time."}</p>
            <div className="mt-4 space-y-2">
              {worldTransitions.length > 0 ? worldTransitions.slice(0, 8).map((transition) => (
                <button
                  key={transition.id}
                  type="button"
                  onClick={() => setJourneyWorldFilter(transition.to)}
                  className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border border-white/10 bg-white/[0.02] px-3 py-2 text-start transition-colors hover:border-dusk/35"
                >
                  <span className="font-arsans text-sm text-bone/78">
                    {formatWorld(transition.from, language)}
                    <span className="mx-2 text-bone/35">→</span>
                    {formatWorld(transition.to, language)}
                  </span>
                  <span className="font-mono text-[10px] text-dusk">{transition.count}x</span>
                  <span className="font-arsans text-[11px] text-bone/42">{new Date(transition.lastSeenAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</span>
                </button>
              )) : <p className="font-arsans text-sm text-bone/42">{isArabic ? "لا توجد انتقالات كافية بعد. احفظ لحظات في أكثر من مساحة ليظهر المسار." : "Not enough transitions yet. Save artifacts across multiple worlds to reveal the trail."}</p>}
            </div>
          </div>

          <div className="mt-4 border border-emerald-300/15 bg-emerald-300/[0.03] p-4">
            <p className="ui-kicker text-emerald-200">{isArabic ? "خط زمني للمزاج" : "Emotion timeline"}</p>
            <p className="mt-2 font-arsans text-sm text-bone/58">{isArabic ? "سجل بصري خفيف يوضح كيف تحركت حالتك عبر آخر الآثار المحفوظة." : "A lightweight visual log showing how your state moved across recent saved artifacts."}</p>
            <div className="mt-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {emotionTimeline.length > 0 ? (
                <div className="flex min-w-max items-center gap-2">
                  {emotionTimeline.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setJourneyWorldFilter(item.world)}
                        className="border border-emerald-300/20 bg-black/12 px-3 py-2 text-start transition-colors hover:border-emerald-300/45"
                      >
                        <span className="block font-arsans text-xs text-emerald-100/88">{isArabic ? item.moodLabelAr : item.moodLabelEn}</span>
                        <span className="mt-1 block font-arsans text-[11px] text-bone/45">{formatWorld(item.world, language)} · {new Date(item.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</span>
                      </button>
                      {index < emotionTimeline.length - 1 ? <span className="text-emerald-200/65">→</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-arsans text-sm text-bone/42">{isArabic ? "ابدأ بحفظ لحظات أو خطط ليظهر الخط الزمني." : "Save moments or plans to reveal the timeline."}</p>
              )}
            </div>
          </div>
        </section>

        <section id="saved-library" className={`${activeProfileTab === "saved-library" ? "" : "hidden"} scroll-mt-24 border border-white/10 bg-white/[0.025] p-5 md:col-span-2`}>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="ui-kicker text-dusk">{isArabic ? "كوكبة المزاج" : "Mood constellation"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "نمطك بدون ازدحام أرقام" : "Your pattern without chart clutter"}</h2>
              <p className="mt-3 font-arsans text-sm leading-7 text-bone/55">{isArabic ? "كل نقطة أثر محفوظ. لونها يلمّح للمساحة التي رجعت لها أكثر من مرة." : "Each point is a saved artifact. Its color hints at the world you returned to."}</p>
            </div>
            <div className="grid min-h-44 grid-cols-8 gap-2 rounded-sm border border-white/10 bg-black/15 p-4 sm:grid-cols-12">
              {moodConstellation.length > 0 ? moodConstellation.map((point, index) => (
                <span key={`${point.world}-${index}`} title={formatWorld(point.world, language)} className={`aspect-square rounded-full ${point.className}`} style={{ opacity: point.opacity }} />
              )) : <p className="col-span-full self-center font-arsans text-sm text-bone/42">{isArabic ? "احفظ لحظات وخططاً لتظهر الكوكبة." : "Save moments and plans to reveal the constellation."}</p>}
            </div>
          </div>
        </section>

        <section className={`${activeProfileTab === "journey-map" ? "" : "hidden"} grid gap-4 md:col-span-2 lg:grid-cols-2`}>
          <div className="border border-emerald-300/15 bg-emerald-300/[0.025] p-5">
            <p className="ui-kicker text-emerald-200">{isArabic ? "شريط قبل / بعد" : "Before / after reel"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "الأثر الذي تتركه الجلسات" : "The trace your sessions leave"}</h2>
            <div className="mt-5 space-y-3">
              {filteredReflectionReel.length > 0 ? filteredReflectionReel.map((item) => (
                <article key={`${item.createdAt}-${item.world}`} className="border border-emerald-300/15 bg-black/10 p-4">
                  <p className="font-arsans text-xs text-bone/38">{formatWorld(item.world, language)} · {new Date(item.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                  <p className="mt-3 font-arsans text-sm leading-6 text-bone/58" dir="auto"><span className="text-bone/35">{isArabic ? "قبل: " : "Before: "}</span>{item.before}</p>
                  <p className="mt-2 font-arsans text-sm leading-6 text-emerald-100/75" dir="auto"><span className="text-emerald-200">{isArabic ? "بعد: " : "After: "}</span>{item.after}</p>
                </article>
              )) : <p className="font-arsans text-sm leading-7 text-bone/45">{journeyWorldFilter !== "all" ? (isArabic ? "لا توجد عناصر محفوظة لهذه المساحة بعد. اختر مساحة أخرى أو فعّل الكل." : "No saved reel items for this world yet. Try another world or switch back to all.") : (isArabic ? "احفظ لقطة رحلة لتظهر هنا نتيجة الجلسة بدون كشف كل المحادثة." : "Save a journey snapshot to show the session outcome without exposing the full chat.")}</p>}
            </div>
          </div>

          <div className="border border-dusk/25 bg-dusk/[0.035] p-5">
            <p className="ui-kicker text-dusk">{isArabic ? "اقتراح الرفيق التالي" : "Next companion suggestion"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "من يستحق التجربة الآن" : "Who is worth trying next"}</h2>
            <div className="mt-5 space-y-3">
              {companionRecommendations.map((item) => (
                <article key={item.command} className="grid grid-cols-[1fr_auto] gap-3 border border-white/10 bg-black/10 p-4">
                  <span className="min-w-0">
                    <span className="block font-arsans text-sm text-bone/82">{item.name}</span>
                    <span className="mt-1 block font-arsans text-xs leading-5 text-bone/45">{item.reason}</span>
                  </span>
                  <Link href={`/?demoCommand=${encodeURIComponent(item.command)}`} className="ui-action self-center border border-dusk/35 px-3 py-2 text-dusk hover:bg-dusk hover:text-ink">{item.command}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${activeProfileTab === "saved-library" ? "" : "hidden"} border border-dusk/25 bg-dusk/[0.035] p-5 md:col-span-2`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="ui-kicker text-dusk">{isArabic ? "مكتبة الكبسولات" : "Capsule library"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "ابحث في آثارك المحفوظة" : "Search your saved artifacts"}</h2>
              <p className="mt-3 max-w-2xl font-arsans text-sm leading-7 text-bone/55">{isArabic ? "مكتبة موحدة تجمع اللحظات والخطط واللقطات والتحديات في مكان واحد قابل للتصفية." : "A unified library for moments, plans, snapshots, and quests with fast filtering."}</p>
            </div>
            <div className="w-full max-w-md">
              <input
                value={capsuleSearchQuery}
                onChange={(event) => setCapsuleSearchQuery(event.target.value)}
                placeholder={isArabic ? "ابحث بكلمة من النص أو العنوان..." : "Search by title or text..."}
                className="w-full border border-white/10 bg-black/20 px-3 py-3 font-arsans text-sm text-bone outline-none transition-colors focus:border-dusk/45"
                dir={direction}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={isArabic ? "تصفية نوع الكبسولة" : "Capsule type filters"}>
            {([
              { id: "all", ar: "الكل", en: "All" },
              { id: "moment", ar: "لحظة", en: "Moments" },
              { id: "plan", ar: "خطة", en: "Plans" },
              { id: "snapshot", ar: "لقطة", en: "Snapshots" },
              { id: "quest", ar: "تحدي", en: "Quests" },
            ] as const).map((option) => {
              const active = capsuleTypeFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCapsuleTypeFilter(option.id)}
                  className={`ui-action border px-3 py-2 text-xs ${active ? "border-dusk/60 bg-dusk text-ink" : "border-white/10 text-bone/72 hover:border-dusk/35 hover:text-dusk"}`}
                >
                  {isArabic ? option.ar : option.en}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCapsuleWorldFilter("all")}
              className={`ui-action border px-3 py-2 text-xs ${capsuleWorldFilter === "all" ? "border-gold/60 bg-gold text-ink" : "border-white/10 text-bone/72 hover:border-gold/35 hover:text-gold"}`}
            >
              {isArabic ? "كل المساحات" : "All worlds"}
            </button>
            {capsuleWorldOptions.map((world) => {
              const active = capsuleWorldFilter === world;
              return (
                <button
                  key={world}
                  type="button"
                  onClick={() => setCapsuleWorldFilter(world)}
                  className={`ui-action border px-3 py-2 text-xs ${active ? "border-gold/60 bg-gold text-ink" : "border-white/10 text-bone/72 hover:border-gold/35 hover:text-gold"}`}
                >
                  {formatWorld(world, language)}
                </button>
              );
            })}
          </div>

          {shareSafeStatusMessage ? <p className="mt-3 font-arsans text-xs text-cyan-100/85">{shareSafeStatusMessage}</p> : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filteredCapsuleLibraryItems.length > 0 ? filteredCapsuleLibraryItems.map((item) => (
              <article key={item.id} className="border border-white/10 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-arsans text-sm font-semibold text-bone/88" dir="auto">{item.title}</p>
                    <p className="mt-1 font-arsans text-xs text-bone/38">{formatCapsuleTypeLabel(item.type, language)} · {formatWorld(item.world, language)} · {new Date(item.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                  </div>
                </div>
                <p className="mt-3 font-arsans text-sm leading-6 text-bone/62" dir="auto">{item.summary}</p>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => void shareSafeCapsule(item)} className="ui-action border border-cyan-200/35 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-200/10">
                    {isArabic ? "مشاركة آمنة" : "Share-safe"}
                  </button>
                </div>
              </article>
            )) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا يوجد نتائج مطابقة الآن. جرّب نوعاً آخر أو امسح البحث." : "No matching artifacts right now. Try another type or clear search."}</p>}
          </div>
        </section>

        <section className={`${activeProfileTab === "saved-library" ? "" : "hidden"} grid gap-4 md:col-span-2 lg:grid-cols-2`}>
          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="ui-kicker text-gold">{isArabic ? "ذاكرة الرفقاء" : "Companion memory"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "من ساعدك مؤخراً" : "Who has been helping lately"}</h2>
            <div className="mt-5 space-y-3">
              {companionInsights.length > 0 ? companionInsights.map((companion) => (
                <article key={companion.name} className="grid grid-cols-[2.6rem_1fr_auto] items-center gap-3 border border-white/10 bg-black/10 p-3">
                  <span className="relative h-10 w-10 overflow-hidden rounded-full border border-gold/20 bg-gold/10">
                    {companion.avatarPath ? <Image src={companion.avatarPath} alt={companion.name} fill sizes="40px" className="object-cover" unoptimized /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-arsans text-sm text-bone/82" dir="auto">{companion.name}</span>
                    <span className="mt-1 block truncate font-arsans text-xs text-bone/42" dir="auto">{formatWorld(companion.world, language)} · {companion.latestText}</span>
                  </span>
                  <span className="font-mono text-[10px] text-gold">{companion.count}</span>
                  {companion.count >= 3 ? <span className="col-span-3 border-t border-white/10 pt-2 font-arsans text-xs text-gold/80">{isArabic ? "شارة تطور: رفيق متكرر" : "Evolution badge: recurring companion"}</span> : null}
                </article>
              )) : <p className="font-arsans text-sm leading-7 text-bone/45">{isArabic ? "احفظ لحظة من رد رفيقك لتبدأ ذاكرة الرفقاء بالظهور هنا." : "Save a reply from a companion and this memory strip will start to appear here."}</p>}
            </div>
          </div>

          <div className="border border-gold/20 bg-gold/[0.025] p-5">
            <p className="ui-kicker text-gold">{isArabic ? "معرض المرآة" : "Story Mirror gallery"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "مشاهدك الرمزية المحفوظة" : "Your saved symbolic scenes"}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {storyMirrorMoments.length > 0 ? storyMirrorMoments.map((moment) => (
                <article key={moment.id} className="border border-gold/20 bg-black/10 p-4">
                  <img src={buildStoryMirrorPreviewUrl(moment)} alt={isArabic ? "مشهد رمزي محفوظ" : "Saved symbolic scene"} className="mb-4 aspect-video w-full border border-white/10 object-cover" loading="lazy" />
                  <p className="font-arsans text-sm leading-6 text-bone/72" dir="auto">{cleanArtifactText(moment.text).slice(0, 160)}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{new Date(moment.savedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                </article>
              )) : <p className="font-arsans text-sm leading-7 text-bone/45">{isArabic ? "استخدم /story ثم احفظ الرد ليظهر هنا كمعرض هادئ." : "Use /story, then save the reply to build a quiet gallery here."}</p>}
            </div>
          </div>
        </section>

        <section className={`${activeProfileTab === "account-details" ? "" : "hidden"} border border-cyan-200/15 bg-cyan-200/[0.025] p-5 md:col-span-2`}>
          <p className="ui-kicker text-cyan-100">{isArabic ? "الذاكرة التي تتحكم بها" : "Memory you control"}</p>
          <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "اختر ما الذي يتذكره فضفضة" : "Choose what FadFada remembers"}</h2>
          <p className="mt-3 font-arsans text-sm leading-7 text-bone/55">{isArabic ? "يمكنك إيقاف حفظ أي نوع من الآثار. الإيقاف لا يحذف القديم تلقائياً، ويمكنك مسحه فوراً من الزر أدناه." : "You can disable saving any artifact type. Turning it off does not delete old data automatically, and you can wipe everything below."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {([
              {
                key: "savedMoments",
                arTitle: "اللحظات المحفوظة",
                enTitle: "Saved moments",
                arDetail: "زر احفظ اللحظة تحت الردود",
                enDetail: "Save moment action under replies",
              },
              {
                key: "tinyPlans",
                arTitle: "الخطط الصغيرة",
                enTitle: "Tiny plans",
                arDetail: "تحويل الرد إلى خطوات تنفيذ",
                enDetail: "Turn replies into action steps",
              },
              {
                key: "journeySnapshots",
                arTitle: "لقطات الرحلة",
                enTitle: "Journey snapshots",
                arDetail: "ملخصات قبل/بعد للجلسات",
                enDetail: "Before/after session snapshots",
              },
              {
                key: "growthQuests",
                arTitle: "التحديات الصغيرة",
                enTitle: "Growth quests",
                arDetail: "تحديات 3 أيام القابلة للإنهاء",
                enDetail: "3-day quests you can finish",
              },
            ] as const).map((item) => {
              const enabled = memoryPreferences[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleMemoryPreference(item.key)}
                  className={`border p-4 text-start transition-colors ${enabled ? "border-cyan-200/55 bg-cyan-200/10" : "border-white/10 bg-black/10 hover:border-cyan-200/35"}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-arsans text-sm text-bone/88">{isArabic ? item.arTitle : item.enTitle}</span>
                    <span className={`rounded-full px-2 py-1 font-mono text-[10px] ${enabled ? "bg-cyan-200/20 text-cyan-100" : "bg-white/10 text-bone/55"}`}>{enabled ? (isArabic ? "مفعل" : "On") : (isArabic ? "متوقف" : "Off")}</span>
                  </span>
                  <span className="mt-2 block font-arsans text-xs text-bone/45">{isArabic ? item.arDetail : item.enDetail}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => saveMemoryPreferences(defaultMemoryPreferences)} className="ui-action border border-cyan-200/40 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-200/10">
              {isArabic ? "تفعيل كل الذاكرة" : "Enable all memory"}
            </button>
            <button type="button" onClick={() => saveMemoryPreferences({ savedMoments: false, tinyPlans: false, journeySnapshots: false, growthQuests: false })} className="ui-action border border-white/15 px-3 py-2 text-xs text-bone/72 hover:border-white/35 hover:text-bone">
              {isArabic ? "إيقاف الكل" : "Disable all"}
            </button>
            <button type="button" onClick={clearAllMemoryArtifacts} className="ui-action border border-red-200/35 px-3 py-2 text-xs text-red-100 hover:bg-red-200/10">
              {isArabic ? "مسح كل الآثار المحفوظة" : "Clear all saved artifacts"}
            </button>
          </div>
        </section>

        <section className={`${activeProfileTab === "account-details" ? "" : "hidden"} border border-cyan-200/15 bg-cyan-200/[0.025] p-5 md:col-span-2`}>
          <p className="ui-kicker text-cyan-100">{isArabic ? "استوديو الصوت الخفيف" : "Voice studio lite"}</p>
          <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "اختر نبرة العربية المفضلة" : "Choose your Arabic voice flavor"}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {voiceDialects.map((dialect) => (
              <button key={dialect.value} type="button" onClick={() => saveVoiceDialect(dialect.value)} className={`border p-4 text-start transition-colors ${voiceDialect === dialect.value ? "border-cyan-200/60 bg-cyan-200/10" : "border-white/10 bg-black/10 hover:border-cyan-200/35"}`}>
                <span className="block font-arsans text-sm text-bone/85">{isArabic ? dialect.ar : dialect.en}</span>
                <span className="mt-2 block font-arsans text-xs text-bone/42">{isArabic ? dialect.detailAr : dialect.detailEn}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={`${activeProfileTab === "saved-library" ? "" : "hidden"} border border-white/10 bg-white/[0.025] p-5 md:col-span-2`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "اللحظات المحفوظة" : "Saved moments"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "لحظاتك المحفوظة على هذا الجهاز" : "Your saved moments on this device"}</h2>
            </div>
            {savedMoments.length > 0 ? <button type="button" onClick={clearSavedMoments} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح الكل" : "Clear all"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {savedMoments.length > 0 ? savedMoments.map((moment) => (
              <article key={moment.id} className="border border-white/10 p-4">
                <p className="font-arsans text-sm leading-7 text-bone/75" dir="auto">{moment.text}</p>
                <p className="mt-3 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(moment.world, language)} · {new Date(moment.savedAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
              </article>
            )) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد لحظات محفوظة بعد. استخدم زر احفظ اللحظة تحت أي رد." : "No saved moments yet. Use the save moment button under any reply."}</p>}
          </div>
        </section>

        <section className={`${activeProfileTab === "saved-library" ? "" : "hidden"} border border-gold/20 bg-gold/[0.025] p-5 md:col-span-2`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "لقطات الرحلة" : "Journey snapshots"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "ملخصات تقدمك المحفوظة" : "Saved progress artifacts"}</h2>
            </div>
            {journeySnapshots.length > 0 ? <button type="button" onClick={clearJourneySnapshots} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح اللقطات" : "Clear snapshots"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {journeySnapshots.length > 0 ? journeySnapshots.map((snapshot) => (
              <article key={snapshot.id} className="border border-gold/20 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-arsans text-sm font-semibold text-bone/88">{formatSnapshotTitle(snapshot, language)}</p>
                    <p className="mt-1 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(snapshot.world, language)} · {new Date(snapshot.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-2 py-1 font-mono text-[10px] text-gold">{snapshot.messageCount}</span>
                </div>
                <p className="mt-4 font-arsans text-sm leading-7 text-bone/72" dir="auto"><span className="text-gold">{isArabic ? "الخيط: " : "Thread: "}</span>{snapshot.theme}</p>
                <p className="mt-2 font-arsans text-sm leading-7 text-bone/62" dir="auto"><span className="text-emerald-200">{isArabic ? "الخطوة: " : "Step: "}</span>{snapshot.nextStep}</p>
              </article>
            )) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد لقطات بعد. من الصفحة الرئيسية، احفظ لقطة من استمرار المحادثة." : "No snapshots yet. From the home screen, save a snapshot from Smart Continuity."}</p>}
          </div>
        </section>

        <section className={`${activeProfileTab === "saved-library" ? "" : "hidden"} border border-cyan-200/15 bg-cyan-200/[0.025] p-5 md:col-span-2`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "تحديات فضفضة" : "FadFada quests"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "تحديات صغيرة تكسبها خلال ٣ أيام" : "Tiny 3-day challenges you can actually finish"}</h2>
            </div>
            {growthQuests.length > 0 ? <button type="button" onClick={clearGrowthQuests} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح التحديات" : "Clear quests"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {growthQuests.length > 0 ? growthQuests.map((quest) => {
              const doneCount = quest.days.filter((day) => day.done).length;
              return (
                <article key={quest.id} className="border border-cyan-200/15 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-arsans text-sm font-semibold text-bone/88">{formatQuestTitle(quest, language)}</p>
                      <p className="mt-1 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(quest.world, language)} · {new Date(quest.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
                    </div>
                    <span className="rounded-full bg-cyan-200/10 px-2 py-1 font-mono text-[10px] text-cyan-100">{doneCount}/{quest.days.length}</span>
                  </div>
                  <p className="mt-3 font-arsans text-sm leading-6 text-bone/60" dir="auto">{cleanArtifactText(quest.reason)}</p>
                  <div className="mt-4 grid gap-2">
                    {quest.days.map((day, index) => (
                      <label key={`${quest.id}-${index}`} className="flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.025] p-3 transition-colors hover:border-cyan-200/35" dir="auto">
                        <input type="checkbox" checked={day.done} onChange={() => toggleQuestDay(quest.id, index)} className="mt-1 h-4 w-4 accent-cyan-200" />
                        <span className={`font-arsans text-sm leading-6 ${day.done ? "text-bone/38 line-through" : "text-bone/72"}`}>{formatQuestDayLabel(quest, index, language)}</span>
                      </label>
                    ))}
                  </div>
                </article>
              );
            }) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد تحديات بعد. من الصفحة الرئيسية، ابدأ تحدي من استمرار المحادثة." : "No quests yet. From the home screen, start a quest from Smart Continuity."}</p>}
          </div>
        </section>

        <section className={`${activeProfileTab === "saved-library" ? "" : "hidden"} border border-emerald-300/15 bg-emerald-300/[0.025] p-5 md:col-span-2`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "الخطط الصغيرة" : "Tiny plans"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "خطواتك المحفوظة لهذا الأسبوع" : "Your saved steps for this week"}</h2>
            </div>
            {tinyPlans.length > 0 ? <button type="button" onClick={clearTinyPlans} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح الخطط" : "Clear plans"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {tinyPlans.length > 0 ? tinyPlans.map((plan) => (
              <article key={plan.id} className="border border-emerald-300/15 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-arsans text-sm font-semibold text-bone/88">{formatTinyPlanTitle(plan, language)}</p>
                    <p className="mt-1 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(plan.world, language)} · {new Date(plan.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
                  </div>
                  <span className="rounded-full bg-emerald-300/10 px-2 py-1 font-mono text-[10px] text-emerald-200">{plan.steps.length}</span>
                </div>
                <ol className="mt-4 space-y-2">
                  {plan.steps.map((step, index) => (
                    <li key={`${plan.id}-${index}`} className="grid grid-cols-[1.6rem_1fr] gap-2 font-arsans text-sm leading-6 text-bone/72" dir="auto">
                      <span className="grid h-6 w-6 place-items-center rounded bg-emerald-300/10 font-mono text-[10px] text-emerald-200">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            )) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد خطط صغيرة بعد. استخدم زر خطة صغيرة تحت أي رد." : "No tiny plans yet. Use the Tiny plan button under any reply."}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}

function ProfileInput({ label, value, onChange, dir = "auto" }: { label: string; value: string; onChange: (value: string) => void; dir?: "auto" | "ltr" }) {
  return (
    <label className="block">
      <span className="mb-2 block font-arsans text-sm text-bone/65">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} dir={dir} className="w-full border border-white/10 bg-black/20 px-3 py-3 font-arsans text-base text-bone outline-none transition-colors focus:border-gold/50" />
    </label>
  );
}

function formatChildAgeBand(ageBand: ChildProfile["ageBand"], language: "ar" | "en") {
  const labels: Record<ChildProfile["ageBand"], { ar: string; en: string }> = {
    under_8: { ar: "أقل من ٨", en: "Under 8" },
    "8_to_10": { ar: "٨ إلى ١٠", en: "8 to 10" },
    "11_to_12": { ar: "١١ إلى ١٢", en: "11 to 12" },
    "13_plus": { ar: "١٣+", en: "13+" },
  };

  return labels[ageBand][language];
}

function formatChildConversationDate(value: string, language: "ar" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return language === "ar" ? "تاريخ غير معروف" : "Unknown date";
  return date.toLocaleString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatChildPulseTrend(value: ChildPulseSummary["trend"], language: "ar" | "en") {
  const labels = {
    ar: {
      up: "تصاعد",
      steady: "مستقر",
      down: "هبوط",
      quiet: "هادئ",
    },
    en: {
      up: "Rising",
      steady: "Steady",
      down: "Dropping",
      quiet: "Quiet",
    },
  };

  return labels[language][value];
}

function formatChildPulseRisk(value: ChildPulseSummary["riskLevel"], language: "ar" | "en") {
  const labels = {
    ar: {
      low: "منخفض",
      medium: "متوسط",
      high: "مرتفع",
    },
    en: {
      low: "Low risk",
      medium: "Medium risk",
      high: "High risk",
    },
  };

  return labels[language][value];
}

function formatHomeworkSubject(value: HomeworkResult["subject"], language: "ar" | "en") {
  const labels: Record<HomeworkResult["subject"], { ar: string; en: string }> = {
    math: { ar: "رياضيات", en: "Math" },
    english: { ar: "إنجليزي", en: "English" },
    arabic: { ar: "عربي", en: "Arabic" },
    kg: { ar: "KG", en: "KG" },
    mixed: { ar: "مختلط", en: "Mixed" },
  };

  return labels[value]?.[language] || value;
}

function formatHomeworkActivityType(value: HomeworkActivity["type"], language: "ar" | "en") {
  const labels: Record<HomeworkActivity["type"], { ar: string; en: string }> = {
    quiz: { ar: "سؤال", en: "Quiz" },
    trace: { ar: "تتبّع", en: "Trace" },
    match: { ar: "توصيل", en: "Match" },
    story: { ar: "قصة", en: "Story" },
    challenge: { ar: "تحدي", en: "Challenge" },
  };

  return labels[value]?.[language] || value;
}

function formatHomeworkError(error: string | undefined, language: "ar" | "en") {
  if (error === "UNSUPPORTED_IMAGE_TYPE") return language === "ar" ? "نوع الصورة غير مدعوم. استخدم PNG أو JPG أو WEBP." : "Unsupported image type. Use PNG, JPG, or WEBP.";
  if (error === "IMAGE_TOO_LARGE") return language === "ar" ? "الصورة كبيرة جداً. جرّب صورة أقل من ٨ ميجابايت." : "The image is too large. Try an image under 8 MB.";
  if (error === "CHILD_PROFILE_REQUIRED") return language === "ar" ? "اختر الطفل الذي سيستلم الواجب." : "Choose the child who should receive this homework.";
  if (error === "CHILD_PROFILE_NOT_FOUND") return language === "ar" ? "لم نجد ملف الطفل المختار. حدّث الصفحة وحاول مرة أخرى." : "Could not find the selected child profile. Refresh and try again.";
  if (error === "PARENT_WORKSPACE_REQUIRED") return language === "ar" ? "هذه الميزة لولي الأمر فقط." : "This feature is parent-only.";
  return language === "ar" ? "لم نتمكن من قراءة الواجب الآن. جرّب صورة أوضح أو اكتب وصفاً قصيراً." : "Could not read the homework right now. Try a clearer image or type a short description.";
}

function formatParentPlaybookError(error: string | undefined, language: "ar" | "en") {
  if (error === "SITUATION_REQUIRED") return language === "ar" ? "اكتب موقفاً واضحاً أولاً." : "Write a clear situation first.";
  if (error === "CHILD_PROFILE_NOT_FOUND") return language === "ar" ? "لم نجد ملف الطفل المختار. حدّث الصفحة وحاول مرة أخرى." : "Could not find the selected child profile. Refresh and try again.";
  if (error === "PARENT_WORKSPACE_REQUIRED") return language === "ar" ? "هذه الميزة لولي الأمر فقط." : "This feature is parent-only.";
  return language === "ar" ? "لم نتمكن من بناء الخطة الآن. جرّب وصفاً أقصر أو حاول مرة أخرى." : "Could not build the playbook right now. Try a shorter description or try again.";
}

function formatWeeklyReportError(error: string | undefined, language: "ar" | "en") {
  if (error === "PARENT_WORKSPACE_REQUIRED") return language === "ar" ? "التقرير الأسبوعي متاح لولي الأمر فقط." : "Weekly report is available in parent workspace only.";
  if (error === "UNAUTHORIZED") return language === "ar" ? "سجّل الدخول أولاً لعرض التقرير." : "Sign in first to view the weekly report.";
  return language === "ar" ? "تعذر إنشاء التقرير الأسبوعي الآن. حاول مرة أخرى بعد قليل." : "Could not generate the weekly report right now. Please try again shortly.";
}

function formatWeeklyReportGeneratedAt(value: string, language: "ar" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return language === "ar" ? "غير متاح" : "Unavailable";
  return date.toLocaleString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function WeeklyMetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-amber-200/16 bg-black/14 px-2 py-2">
      <span className="block font-arsans text-[10px] uppercase tracking-[0.08em] text-amber-100/58">{label}</span>
      <span className="mt-1 block font-mono text-sm text-bone/88">{value}</span>
    </div>
  );
}

function buildConnectionRitual(item: ChildPulseSummary, language: "ar" | "en") {
  const isArabic = language === "ar";

  if (item.riskLevel === "high") {
    return {
      badge: isArabic ? "دعم هادئ" : "Gentle support",
      title: isArabic ? "جلسة قرب بلا أسئلة كثيرة" : "A close check-in with fewer questions",
      detail: isArabic ? "اجلس قريباً من طفلك وابدأ بعبارة اطمئنان، ثم اترك له مساحة أن يتكلم أو يصمت." : "Sit nearby, open with reassurance, then leave room for your child to talk or stay quiet.",
      steps: isArabic ? ["قل: أنا معك، ولا تحتاج أن تشرح كل شيء الآن.", "اعرض كوب ماء أو نشاطاً هادئاً لعشر دقائق.", "تابع معه لاحقاً بلطف إذا بقي القلق واضحاً."] : ["Say: I am here, and you do not have to explain everything now.", "Offer water or a calm ten-minute activity.", "Check in gently again if the worry still feels present."],
    };
  }

  if (item.riskLevel === "medium" || item.trend === "down") {
    return {
      badge: isArabic ? "إصلاح صغير" : "Small repair",
      title: isArabic ? "سؤال واحد واحتضان المعنى" : "One question, then hold the meaning",
      detail: isArabic ? "استخدم سؤالاً واحداً واضحاً بدل التحقيق. الهدف أن يشعر الطفل أن صوته مسموع." : "Use one clear question instead of an interview. The goal is for the child to feel heard.",
      steps: isArabic ? ["اسأل: ما الشيء الذي كان ثقيلاً اليوم؟", "كرر معنى جوابه بكلمات بسيطة.", "اختم بخطوة صغيرة: نمشي؟ نرسم؟ نحكي قصة؟"] : ["Ask: What felt heavy today?", "Repeat the meaning back in simple words.", "Close with one small choice: walk, draw, or story?"],
    };
  }

  if (item.trend === "quiet" || item.turnCount7d === 0) {
    return {
      badge: isArabic ? "فتح باب" : "Open the door",
      title: isArabic ? "دعوة لعب من دقيقتين" : "A two-minute play invitation",
      detail: isArabic ? "لا تبدأ بسؤال كبير. افتح باب الحديث بلعبة قصيرة أو اختيار لطيف." : "Do not start with a big question. Open the door with a short game or gentle choice.",
      steps: isArabic ? ["قل: اختر لوناً يصف يومك.", "شارك لونك أنت أولاً.", "اترك الطفل يقرر إن كان يريد كلاماً أكثر."] : ["Say: Pick one color for your day.", "Share your own color first.", "Let your child decide whether to say more."],
    };
  }

  const worldRituals: Record<string, { badge: string; title: string; detail: string; steps: string[] }> = {
    learning: isArabic ? {
      badge: "فضول",
      title: "اسألني مثل المعلم الصغير",
      detail: "حوّل اهتمام التعلم إلى لحظة ثقة، لا اختبار.",
      steps: ["اطلب من طفلك أن يعلّمك شيئاً تعلمه.", "امدح طريقة الشرح لا النتيجة فقط.", "اختم بسؤال: ماذا تريد أن نكتشف غداً؟"],
    } : {
      badge: "Curiosity",
      title: "Let them be the tiny teacher",
      detail: "Turn learning energy into confidence, not a quiz.",
      steps: ["Ask your child to teach you one thing they learned.", "Praise the way they explained, not only the answer.", "End with: What should we discover tomorrow?"],
    },
    story: isArabic ? {
      badge: "خيال",
      title: "نهاية ثانية للحكاية",
      detail: "استخدم الخيال لفهم المشاعر بطريقة آمنة وغير مباشرة.",
      steps: ["اطلب نهاية مضحكة للحكاية.", "اسأل: أي شخصية تشبه يومك؟", "اختم بجملة أمان للشخصية."],
    } : {
      badge: "Imagination",
      title: "Invent a second ending",
      detail: "Use imagination to understand feelings safely and indirectly.",
      steps: ["Ask for a funny alternate ending.", "Ask: Which character felt like your day?", "End with one safe sentence for that character."],
    },
    build: isArabic ? {
      badge: "إنجاز",
      title: "مهمة صغيرة مشتركة",
      detail: "حوّل طاقة الحلول إلى تعاون بينك وبين الطفل.",
      steps: ["اختارا مهمة منزلية صغيرة معاً.", "اجعل الطفل قائد أول خطوة.", "احتفل بالانتهاء بجملة تقدير محددة."],
    } : {
      badge: "Agency",
      title: "One tiny shared mission",
      detail: "Turn problem-solving energy into parent-child teamwork.",
      steps: ["Pick one small home task together.", "Let your child lead the first step.", "Finish with one specific appreciation."],
    },
  };

  return worldRituals[item.dominantWorld] ?? (isArabic ? {
    badge: "اتصال",
    title: "ثلاث دقائق حضور كامل",
    detail: "لحظة قصيرة بلا هاتف تكفي لتثبيت الإحساس بالأمان.",
    steps: ["اجلسوا بلا شاشة ثلاث دقائق.", "اسأل: ما أجمل شيء صغير اليوم؟", "اختم بوعد بسيط للغد."],
  } : {
    badge: "Connection",
    title: "Three minutes of full attention",
    detail: "A short phone-free moment can anchor a child in safety.",
    steps: ["Sit without screens for three minutes.", "Ask: What was one small good thing today?", "Close with one simple promise for tomorrow."],
  });
}

function buildParentCopilotTimeline(childProfiles: ChildProfile[], childPulse: ChildPulseSummary[], language: "ar" | "en") {
  const pulseById = new Map(childPulse.map((item) => [item.childProfileId, item]));

  return childProfiles
    .map((child) => {
      const pulse = pulseById.get(child.id);
      if (!pulse) return null;

      const latestMoment = child.conversationHistory[0];
      const worldLabel = formatWorld(pulse.dominantWorld, language);
      const recentChildText = latestMoment?.childText?.slice(0, 72) || "";
      const isArabic = language === "ar";

      if (pulse.riskLevel === "high") {
        return {
          childProfileId: child.id,
          nickname: child.nickname,
          badge: isArabic ? "أولوية هادئة" : "Calm priority",
          title: isArabic ? "خفّض المطالبة وارفع القرب" : "Lower demand, raise connection",
          summary: isArabic ? `الإشارة الحالية مرتفعة، والعالم الغالب ${worldLabel}. الليلة ليست وقت تصحيح طويل.` : `Risk is elevated and the dominant world is ${worldLabel}. Tonight is not the moment for long correction.`,
          nextStep: isArabic ? "ابدأ بجملة أمان قصيرة ثم نشاط هادئ من دقيقتين." : "Open with one safe sentence, then a two-minute calm activity.",
          signal: isArabic ? (recentChildText ? `آخر إشارة: ${recentChildText}` : "النشاط الأخير يحتاج اقتراباً بدون ضغط.") : (recentChildText ? `Latest cue: ${recentChildText}` : "Recent activity points to closeness before demands."),
          updatedAt: pulse.lastActivityAt,
        } as ParentTimelineEntry;
      }

      if (pulse.trend === "up") {
        return {
          childProfileId: child.id,
          nickname: child.nickname,
          badge: isArabic ? "نافذة مفتوحة" : "Open window",
          title: isArabic ? "هذا وقت البناء فوق الاهتمام" : "Build on the current momentum",
          summary: isArabic ? `النشاط صاعد هذا الأسبوع مع حضور واضح في ${worldLabel}.` : `Activity is rising this week with clear energy in ${worldLabel}.`,
          nextStep: isArabic ? "اسأل سؤال متابعة واحداً وابنِ عليه في لعبة أو مهمة قصيرة." : "Ask one follow-up question and turn it into a short game or task.",
          signal: isArabic ? `${pulse.turnCount7d} نشاطات خلال ٧ أيام.` : `${pulse.turnCount7d} activities over the last 7 days.`,
          updatedAt: pulse.lastActivityAt,
        } as ParentTimelineEntry;
      }

      if (pulse.trend === "down" || pulse.riskLevel === "medium") {
        return {
          childProfileId: child.id,
          nickname: child.nickname,
          badge: isArabic ? "إصلاح خفيف" : "Light repair",
          title: isArabic ? "اسأل أقل، لاحظ أكثر" : "Ask less, notice more",
          summary: isArabic ? `هناك هبوط أو حساسية متوسطة، مع ظهور ${worldLabel} كمساحة متكررة.` : `There is a dip or medium sensitivity, with ${worldLabel} showing up repeatedly.`,
          nextStep: isArabic ? "استخدم سؤالاً واحداً فقط ثم قدّم اختيارين آمنين." : "Use only one question, then offer two safe choices.",
          signal: isArabic ? (recentChildText ? `آخر عبارة ملفتة: ${recentChildText}` : "راجع نبرة المساء وقلّل التصحيح المباشر.") : (recentChildText ? `Latest notable phrase: ${recentChildText}` : "Review evening tone and reduce direct correction."),
          updatedAt: pulse.lastActivityAt,
        } as ParentTimelineEntry;
      }

      return {
        childProfileId: child.id,
        nickname: child.nickname,
        badge: isArabic ? "استقرار" : "Steady",
        title: isArabic ? "حافظ على الإيقاع بدون ازدحام" : "Keep the rhythm without crowding it",
        summary: isArabic ? `الإيقاع مستقر هذا الأسبوع، والعالم الأقرب هو ${worldLabel}.` : `The rhythm is steady this week, with ${worldLabel} as the closest world.`,
        nextStep: isArabic ? "اختم اليوم بطقس قصير ثابت بدل فتح موضوع جديد." : "End the day with one short steady ritual instead of opening a new topic.",
        signal: isArabic ? `${pulse.turnCount7d} نشاطات خلال ٧ أيام.` : `${pulse.turnCount7d} activities over the last 7 days.`,
        updatedAt: pulse.lastActivityAt,
      } as ParentTimelineEntry;
    })
    .filter((entry): entry is ParentTimelineEntry => Boolean(entry))
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
    .slice(0, 6);
}

function formatChildProfileError(error: string | undefined, language: "ar" | "en", maxProfiles?: number, upgradeRequired?: boolean) {
  const isArabic = language === "ar";

  if (error === "INVALID_BIRTH_YEAR") {
    return isArabic ? "أدخل سنة ميلاد لطفل بين ٤ و١٧ سنة." : "Enter a birth year for a child between 4 and 17 years old.";
  }

  if (error === "CHILD_PROFILE_LIMIT_REACHED") {
    const limit = maxProfiles || 1;
    if (upgradeRequired) {
      return isArabic ? `الخطة المجانية تسمح بـ ${limit} ملف طفل. أضف أطفالاً أكثر بالترقية إلى بلس.` : `The free plan allows ${limit} child profile. Upgrade to Plus to add more children.`;
    }
    return isArabic ? `وصلت للحد الأقصى الحالي: ${limit} ملفات أطفال.` : `You reached the current child profile limit: ${limit}.`;
  }

  if (error === "CHILD_NICKNAME_ALREADY_EXISTS") {
    return isArabic ? "اسم الطفل موجود بالفعل ضمن هذا الحساب. اختر اسماً مختلفاً لكل طفل." : "This child name already exists under your account. Please use a different name for each child.";
  }

  if (error === "PARENT_WORKSPACE_REQUIRED") {
    return isArabic ? "أنت الآن داخل مساحة الطفل. اضغط الرجوع لمساحة الوالد لإدارة ملفات الأطفال بأمان." : "You are currently in the child workspace. Return to the parent workspace to manage child profiles safely.";
  }

  if (error === "DATABASE_NOT_CONFIGURED") {
    return isArabic ? "خدمة ملفات الأطفال غير متاحة مؤقتاً. جرّب مرة أخرى بعد قليل." : "Child profiles are temporarily unavailable. Please try again shortly.";
  }

  if (error === "CHILD_PROFILE_MIGRATION_REQUIRED") {
    return isArabic ? "إعداد ملفات الأطفال قيد التحديث الآن. جرّب مرة أخرى بعد قليل." : "Child profile setup is being updated. Please try again shortly.";
  }

  if (error === "CHILD_PROFILE_DATABASE_UNAVAILABLE") {
    return isArabic ? "تعذر فتح خدمة ملفات الأطفال الآن. جرّب لاحقاً." : "Child profiles cannot be opened right now. Please try later.";
  }

  if (error === "UNAUTHORIZED") {
    return isArabic ? "سجّل الدخول بحساب الوالد أولاً." : "Sign in with the parent account first.";
  }

  return isArabic ? "تعذر إنشاء ملف الطفل الآن. جرّب مرة أخرى بعد قليل." : "Could not create the child profile right now. Please try again shortly.";
}

function InsightTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/15 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{label}</p>
      <p className="mt-2 font-enserif text-3xl italic text-bone/90">{value}</p>
    </div>
  );
}

function buildJourneyInsight(
  artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] },
  language: "ar" | "en"
): JourneyInsight {
  const worldCounts = new Map<string, number>();
  const addWorld = (world: string) => worldCounts.set(world, (worldCounts.get(world) || 0) + 1);
  artifacts.savedMoments.forEach((item) => addWorld(item.world));
  artifacts.tinyPlans.forEach((item) => addWorld(item.world));
  artifacts.journeySnapshots.forEach((item) => addWorld(item.world));
  artifacts.growthQuests.forEach((item) => addWorld(item.world));

  const artifactCount = artifacts.savedMoments.length + artifacts.tinyPlans.length + artifacts.journeySnapshots.length + artifacts.growthQuests.length;
  const completedQuestSteps = artifacts.growthQuests.reduce((total, quest) => total + quest.days.filter((day) => day.done).length, 0);
  const dominantWorlds = Array.from(worldCounts.entries())
    .map(([world, count]) => ({ world, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const reflectionScore = Math.min(100, Math.round(artifactCount * 10 + completedQuestSteps * 7 + artifacts.journeySnapshots.length * 12));
  const topWorld = dominantWorlds[0]?.world;

  return {
    artifactCount,
    completedQuestSteps,
    dominantWorlds,
    reflectionScore,
    streakSignal: language === "ar"
      ? artifactCount > 0 ? "الخريطة لا تقيسك؛ هي فقط تريك أين يعود انتباهك." : "الخريطة هادئة الآن، وستبدأ مع أول لحظة تحفظها."
      : artifactCount > 0 ? "The map does not judge you; it simply shows where attention keeps returning." : "The map is quiet for now; it starts with your first saved artifact.",
    nextFocus: language === "ar"
      ? topWorld ? `أكثر خيط ظاهر الآن هو ${formatWorld(topWorld, language)}. اجعل الخطوة القادمة صغيرة بما يكفي أن تبدأها اليوم.` : "احفظ لحظة، خطة، أو لقطة رحلة لتبدأ فضفضة في رسم نمطك الشخصي."
      : topWorld ? `Your strongest current thread is ${formatWorld(topWorld, language)}. Keep the next step small enough to start today.` : "Save a moment, plan, or snapshot so FadFada can begin drawing your personal pattern.",
  };
}

function buildCompanionInsights(savedMoments: SavedMoment[], language: "ar" | "en"): CompanionInsight[] {
  const fallbackName = language === "ar" ? "رفيق فضفضة" : "FadFada companion";
  const companionMap = new Map<string, CompanionInsight>();

  savedMoments.forEach((moment) => {
    const name = moment.personaName || fallbackName;
    const existing = companionMap.get(name);
    const latestText = cleanArtifactText(moment.text).slice(0, 90);

    companionMap.set(name, {
      name,
      avatarPath: moment.avatarPath || existing?.avatarPath,
      count: (existing?.count || 0) + 1,
      world: existing?.world || moment.world,
      latestText: existing?.latestText || latestText,
    });
  });

  return Array.from(companionMap.values()).sort((a, b) => b.count - a.count).slice(0, 4);
}

function buildReflectionReel(savedMoments: SavedMoment[], journeySnapshots: JourneySnapshot[], language: "ar" | "en"): ReflectionReelItem[] {
  const snapshotItems = journeySnapshots.slice(0, 3).map((snapshot) => ({
    before: cleanArtifactText(snapshot.theme).slice(0, 130),
    after: cleanArtifactText(snapshot.nextStep).slice(0, 150),
    world: snapshot.world,
    createdAt: snapshot.createdAt,
  }));

  if (snapshotItems.length > 0) return snapshotItems;

  return savedMoments.slice(0, 2).map((moment) => ({
    before: language === "ar" ? "لحظة كانت تحتاج اسماً أهدأ." : "A moment that needed a calmer name.",
    after: cleanArtifactText(moment.text).slice(0, 150),
    world: moment.world,
    createdAt: moment.savedAt,
  }));
}

function buildCompanionRecommendations(dominantWorlds: JourneyInsight["dominantWorlds"], language: "ar" | "en"): CompanionRecommendation[] {
  const topWorld = dominantWorlds[0]?.world || "calm";
  const isArabic = language === "ar";
  const primary = topWorld === "story"
    ? { name: isArabic ? "راوية" : "Rawiya", reason: isArabic ? "لأن خيط الحكاية حاضر في رحلتك، جرّب تحويل الشعور إلى مشهد." : "Your story thread is active; try turning the feeling into a scene.", command: "/story" }
    : topWorld === "build" || topWorld === "learning"
      ? { name: isArabic ? "مالك" : "Malek", reason: isArabic ? "لأنك تجمع خطوات وخططاً، جرّب رفيقاً يحوّل الكلام إلى بناء." : "You are collecting steps and plans; try a companion who turns reflection into structure.", command: "/quest" }
      : { name: isArabic ? "عمر" : "Omar", reason: isArabic ? "لأن الخيط يحتاج هدوءاً أولاً، ابدأ بجلسة قصيرة ثم احفظ لقطة." : "The thread needs calm first; start with a short reflection, then save a snapshot.", command: "/judge" };

  const secondary = { name: isArabic ? "بطاقة إثبات" : "Proof Card", reason: isArabic ? "عندما يظهر أثر واضح، حوّله إلى بطاقة مشاركة لا تكشف خصوصيتك." : "When a useful outcome appears, turn it into a shareable proof card without exposing private text.", command: "/proof" };
  return [primary, secondary];
}

function buildMoodConstellation(artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] }) {
  const worldsList = [
    ...artifacts.savedMoments.map((item) => item.world),
    ...artifacts.tinyPlans.map((item) => item.world),
    ...artifacts.journeySnapshots.map((item) => item.world),
    ...artifacts.growthQuests.map((item) => item.world),
  ].slice(0, 48);

  return worldsList.map((world, index) => ({
    world,
    className: getConstellationColor(world),
    opacity: 0.42 + ((index % 5) * 0.12),
  }));
}

function buildJourneyWorldOptions(artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] }) {
  const entries = [
    ...artifacts.savedMoments.map((item) => item.world),
    ...artifacts.tinyPlans.map((item) => item.world),
    ...artifacts.journeySnapshots.map((item) => item.world),
    ...artifacts.growthQuests.map((item) => item.world),
  ].filter((world) => typeof world === "string" && world.trim().length > 0);

  return Array.from(new Set(entries));
}

function buildJourneyWorldTransitions(artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] }): JourneyWorldTransition[] {
  const entries = [
    ...artifacts.savedMoments.map((item) => ({ world: item.world, at: item.savedAt })),
    ...artifacts.tinyPlans.map((item) => ({ world: item.world, at: item.createdAt })),
    ...artifacts.journeySnapshots.map((item) => ({ world: item.world, at: item.createdAt })),
    ...artifacts.growthQuests.map((item) => ({ world: item.world, at: item.createdAt })),
  ]
    .filter((item) => typeof item.world === "string" && item.world.trim().length > 0)
    .map((item) => ({ ...item, timestamp: new Date(item.at).getTime() }))
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (entries.length < 2) return [];

  const transitionMap = new Map<string, JourneyWorldTransition>();
  for (let index = 1; index < entries.length; index += 1) {
    const from = entries[index - 1].world;
    const to = entries[index].world;
    if (!from || !to || from === to) continue;
    const id = `${from}->${to}`;
    const existing = transitionMap.get(id);
    if (existing) {
      existing.count += 1;
      if (entries[index].at > existing.lastSeenAt) existing.lastSeenAt = entries[index].at;
      continue;
    }
    transitionMap.set(id, { id, from, to, count: 1, lastSeenAt: entries[index].at });
  }

  return Array.from(transitionMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
}

function buildCapsuleLibraryItems(
  artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] },
  language: "ar" | "en"
): CapsuleLibraryItem[] {
  const momentItems: CapsuleLibraryItem[] = artifacts.savedMoments.map((moment) => ({
    id: `moment-${moment.id}`,
    type: "moment",
    title: moment.personaName || (language === "ar" ? "لحظة محفوظة" : "Saved moment"),
    summary: cleanArtifactText(moment.text).slice(0, 220),
    world: moment.world,
    createdAt: moment.savedAt,
  }));

  const planItems: CapsuleLibraryItem[] = artifacts.tinyPlans.map((plan) => ({
    id: `plan-${plan.id}`,
    type: "plan",
    title: cleanArtifactText(plan.title) || (language === "ar" ? "خطة صغيرة" : "Tiny plan"),
    summary: plan.steps.map((step) => cleanArtifactText(step)).join(" • ").slice(0, 240),
    world: plan.world,
    createdAt: plan.createdAt,
  }));

  const snapshotItems: CapsuleLibraryItem[] = artifacts.journeySnapshots.map((snapshot) => ({
    id: `snapshot-${snapshot.id}`,
    type: "snapshot",
    title: cleanArtifactText(snapshot.title) || (language === "ar" ? "لقطة رحلة" : "Journey snapshot"),
    summary: `${cleanArtifactText(snapshot.theme)} ${language === "ar" ? "•" : "•"} ${cleanArtifactText(snapshot.nextStep)}`.slice(0, 240),
    world: snapshot.world,
    createdAt: snapshot.createdAt,
  }));

  const questItems: CapsuleLibraryItem[] = artifacts.growthQuests.map((quest) => ({
    id: `quest-${quest.id}`,
    type: "quest",
    title: cleanArtifactText(quest.title) || (language === "ar" ? "تحدي فضفضة" : "FadFada quest"),
    summary: cleanArtifactText(quest.reason).slice(0, 220),
    world: quest.world,
    createdAt: quest.createdAt,
  }));

  return [...momentItems, ...planItems, ...snapshotItems, ...questItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function formatCapsuleTypeLabel(value: CapsuleLibraryItemType, language: "ar" | "en") {
  const labels: Record<CapsuleLibraryItemType, { ar: string; en: string }> = {
    moment: { ar: "لحظة", en: "Moment" },
    plan: { ar: "خطة", en: "Plan" },
    snapshot: { ar: "لقطة", en: "Snapshot" },
    quest: { ar: "تحدي", en: "Quest" },
  };

  return labels[value][language];
}

function getWorldMoodLabel(world: string) {
  if (world === "calm") return { ar: "هدوء", en: "Calm" };
  if (world === "story") return { ar: "تخيّل", en: "Imagination" };
  if (world === "faith") return { ar: "طمأنينة", en: "Reassurance" };
  if (world === "build") return { ar: "حركة", en: "Momentum" };
  if (world === "learning") return { ar: "وضوح", en: "Clarity" };
  if (world === "celebration") return { ar: "فرح", en: "Joy" };
  if (world === "grief") return { ar: "سكينة", en: "Stillness" };
  return { ar: "تحول", en: "Shift" };
}

function buildEmotionTimeline(artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] }): EmotionTimelineItem[] {
  const items: EmotionTimelineItem[] = [
    ...artifacts.savedMoments.map((item) => {
      const mood = getWorldMoodLabel(item.world);
      return {
        id: `moment-${item.id}`,
        world: item.world,
        moodLabelAr: mood.ar,
        moodLabelEn: mood.en,
        createdAt: item.savedAt,
        source: "moment" as const,
      };
    }),
    ...artifacts.tinyPlans.map((item) => {
      const mood = getWorldMoodLabel(item.world);
      return {
        id: `plan-${item.id}`,
        world: item.world,
        moodLabelAr: mood.ar,
        moodLabelEn: mood.en,
        createdAt: item.createdAt,
        source: "plan" as const,
      };
    }),
    ...artifacts.journeySnapshots.map((item) => {
      const mood = getWorldMoodLabel(item.world);
      return {
        id: `snapshot-${item.id}`,
        world: item.world,
        moodLabelAr: mood.ar,
        moodLabelEn: mood.en,
        createdAt: item.createdAt,
        source: "snapshot" as const,
      };
    }),
    ...artifacts.growthQuests.map((item) => {
      const mood = getWorldMoodLabel(item.world);
      return {
        id: `quest-${item.id}`,
        world: item.world,
        moodLabelAr: mood.ar,
        moodLabelEn: mood.en,
        createdAt: item.createdAt,
        source: "quest" as const,
      };
    }),
  ]
    .filter((item) => Number.isFinite(new Date(item.createdAt).getTime()))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return items.slice(-12);
}

function redactSensitiveDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g, "[redacted-phone]")
    .replace(/https?:\/\/\S+/gi, "[redacted-link]")
    .replace(/\b\d{6,}\b/g, "[redacted-number]")
    .replace(/@[\w._-]+/g, "[redacted-handle]")
    .replace(/\s+/g, " ")
    .trim();
}

function buildShareSafeCapsuleText(item: CapsuleLibraryItem, language: "ar" | "en") {
  const worldLabel = formatWorld(item.world, language);
  const typeLabel = formatCapsuleTypeLabel(item.type, language);
  const dateLabel = new Date(item.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US");
  const safeTitle = redactSensitiveDetail(item.title);
  const safeSummary = redactSensitiveDetail(item.summary);

  if (language === "ar") {
    return [
      "هذه كبسولة فضفضة آمنة للمشاركة.",
      `النوع: ${typeLabel}`,
      `المساحة: ${worldLabel}`,
      `التاريخ: ${dateLabel}`,
      `العنوان: ${safeTitle}`,
      `الخلاصة: ${safeSummary}`,
      "تمت إزالة أي تفاصيل شخصية حساسة تلقائياً.",
    ].join("\n");
  }

  return [
    "This is a share-safe FadFada capsule.",
    `Type: ${typeLabel}`,
    `World: ${worldLabel}`,
    `Date: ${dateLabel}`,
    `Title: ${safeTitle}`,
    `Summary: ${safeSummary}`,
    "Potentially sensitive personal details were automatically redacted.",
  ].join("\n");
}

function getConstellationColor(world: string) {
  if (world === "story") return "bg-gold";
  if (world === "build" || world === "learning") return "bg-emerald-300";
  if (world === "faith" || world === "grief") return "bg-cyan-200";
  if (world === "celebration") return "bg-dusk";
  return "bg-bone/70";
}

function buildStoryMirrorPreviewUrl(moment: SavedMoment) {
  const prompt = [
    "quiet symbolic emotional storyboard frame, not text, no words, no logos",
    formatWorld(moment.world, "en"),
    cleanArtifactText(moment.text).slice(0, 220),
  ].join(", ");

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=960&height=540&model=flux&nologo=true&seed=${encodeURIComponent(moment.id)}`;
}

function normalizeVoiceDialect(value: string | null): VoiceDialect {
  return voiceDialects.some((dialect) => dialect.value === value) ? value as VoiceDialect : "ar-EG";
}

function normalizeMemoryPreferences(rawValue: string | null): MemoryPreferences {
  if (!rawValue) return defaultMemoryPreferences;

  try {
    const parsed = JSON.parse(rawValue) as Partial<MemoryPreferences>;
    return {
      savedMoments: parsed.savedMoments !== false,
      tinyPlans: parsed.tinyPlans !== false,
      journeySnapshots: parsed.journeySnapshots !== false,
      growthQuests: parsed.growthQuests !== false,
    };
  } catch {
    return defaultMemoryPreferences;
  }
}

function formatTier(tier: string, language: "ar" | "en") {
  const normalizedTier = tier.toLowerCase();
  if (normalizedTier === "free") return language === "ar" ? "مجاني" : "Free";
  if (normalizedTier === "plus") return language === "ar" ? "بلس" : "Plus";
  if (normalizedTier === "premium") return language === "ar" ? "مدفوع" : "Premium";
  return tier;
}

function formatSubscriptionStatus(status: string, language: "ar" | "en") {
  const normalizedStatus = status.toLowerCase();
  const labels: Record<string, { ar: string; en: string }> = {
    active: { ar: "نشط", en: "Active" },
    cancelled: { ar: "ملغى", en: "Cancelled" },
    expired: { ar: "منتهي", en: "Expired" },
    past_due: { ar: "متأخر الدفع", en: "Past due" },
    unpaid: { ar: "غير مدفوع", en: "Unpaid" },
  };
  return labels[normalizedStatus]?.[language] || status;
}

function getCheckoutErrorMessage(data: { error?: string; message?: string; messageEn?: string; lemonMessage?: string; paddleMessage?: string } | null, language: "ar" | "en") {
  const isArabic = language === "ar";

  if (!data) {
    return isArabic ? "تعذر الاتصال ببوابة الدفع. تحقق من الاتصال وحاول مرة أخرى." : "Could not reach checkout. Check your connection and try again.";
  }

  if (data.error === "USER_ID_REQUIRED") {
    return isArabic ? "انتهت جلسة الحساب. سجّل الدخول مجددًا ثم حاول الترقية." : "Your account session expired. Sign in again, then try upgrading.";
  }

  if (data.error === "PREMIUM_PAUSED") {
    return isArabic ? data.message || "بوابة الدفع متوقفة مؤقتًا حتى يتم إعداد خطة بلس." : data.messageEn || data.message || "Checkout is paused until Plus billing is configured.";
  }

  if (data.error === "LEMONSQUEEZY_CHECKOUT_FAILED") {
    return isArabic ? `تعذر إنشاء دفع Lemon Squeezy: ${data.lemonMessage || "راجع إعدادات المتجر والمنتج."}` : `Lemon Squeezy checkout failed: ${data.lemonMessage || "Check store and variant settings."}`;
  }

  if (data.error === "PADDLE_CHECKOUT_FAILED" || data.error === "INVALID_PADDLE_PRICE_ID") {
    return isArabic ? `تعذر إنشاء دفع Paddle: ${data.paddleMessage || data.message || "راجع Price ID ومفاتيح Paddle."}` : `Paddle checkout failed: ${data.paddleMessage || data.messageEn || data.message || "Check Paddle price ID and API keys."}`;
  }

  return isArabic ? "تعذر فتح الدفع. راجع إعدادات بوابة الدفع ثم حاول مرة أخرى." : "Could not open checkout. Check payment gateway settings, then try again.";
}

function PlusUnlockedPanel({ language, activeTier }: { language: "ar" | "en"; activeTier: string }) {
  const isArabic = language === "ar";
  const isPlus = activeTier === "PLUS" || activeTier === "BUSINESS";
  const items = isArabic
    ? ["كل الرفقاء والشخصيات", "حفظ جلسات أوسع", "لوحات مشاهد بعد الردود", "بطاقات إثبات ومشاركة آمنة"]
    : ["All companions and personas", "More saved sessions", "Storyboards after replies", "Proof cards and safe sharing"];

  return (
    <div className={`mt-5 rounded-2xl border p-4 ${isPlus ? "border-gold/30 bg-gold/[0.07]" : "border-white/10 bg-black/16"}`}>
      <p className="ui-kicker text-gold">{isPlus ? (isArabic ? "مفتوح في حسابك" : "Unlocked in your account") : isArabic ? "ما يفتحه بلس" : "What Plus unlocks"}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <p key={item} className="rounded-xl border border-white/10 bg-black/14 px-3 py-2 font-arsans text-sm text-bone/62">{item}</p>
        ))}
      </div>
    </div>
  );
}

function formatWorld(world: string, language: "ar" | "en") {
  return worldLabels[world]?.[language] || world;
}

function cleanArtifactText(value: string) {
  return value
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/[ـ*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSnapshotTitle(snapshot: JourneySnapshot, language: "ar" | "en") {
  if (snapshot.language && snapshot.language !== language) {
    return language === "ar" ? "لقطة رحلة" : "Journey snapshot";
  }

  const cleanedTitle = cleanArtifactText(snapshot.title);
  return cleanedTitle || (language === "ar" ? "لقطة رحلة" : "Journey snapshot");
}

function formatQuestTitle(quest: GrowthQuest, language: "ar" | "en") {
  if (quest.language && quest.language !== language) {
    return language === "ar" ? "تحدي فضفضة لثلاثة أيام" : "3-Day FadFada Quest";
  }

  const cleanedTitle = cleanArtifactText(quest.title);
  return cleanedTitle || (language === "ar" ? "تحدي فضفضة لثلاثة أيام" : "3-Day FadFada Quest");
}

function formatQuestDayLabel(quest: GrowthQuest, index: number, language: "ar" | "en") {
  const label = cleanArtifactText(quest.days[index]?.label || "");

  if (quest.language && quest.language !== language) {
    const localizedDefaults = language === "ar"
      ? [
          "اختر خطوة صغيرة لا تتجاوز عشر دقائق.",
          "ارجع لفضفضة واكتب ماذا تغيّر بعد الخطوة.",
          "حوّل ما تعلمته إلى خطوة أصغر لليوم التالي.",
        ]
      : [
          "Choose one small step that takes under ten minutes.",
          "Return to FadFada and write what changed after the step.",
          "Turn what you learned into an even smaller step for the next day.",
        ];

    if (index > 0 || isLikelyGeneratedQuestStep(label)) return localizedDefaults[index] || label;
  }

  return label;
}

function formatTinyPlanTitle(plan: TinyPlan, language: "ar" | "en") {
  if (plan.language && plan.language !== language) {
    return language === "ar" ? "خطة صغيرة لهذا اليوم" : "Tiny plan for today";
  }

  const cleanedTitle = cleanArtifactText(plan.title);
  return cleanedTitle || (language === "ar" ? "خطة صغيرة لهذا اليوم" : "Tiny plan for today");
}

function isLikelyGeneratedQuestStep(value: string) {
  return /ارجع لفضفضة|حوّل ما تعلمته|اختر خطوة صغيرة|Return to FadFada|Turn what you learned|Choose one small step/i.test(value);
}

const socialLabels: Record<"ar" | "en", Record<"website" | "linkedin" | "x" | "instagram", string>> = {
  ar: {
    website: "الموقع الشخصي",
    linkedin: "لينكدإن",
    x: "إكس",
    instagram: "إنستغرام",
  },
  en: {
    website: "Website",
    linkedin: "LinkedIn",
    x: "X",
    instagram: "Instagram",
  },
};