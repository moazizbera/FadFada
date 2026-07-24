"use client";

type Language = "ar" | "en";

type AppBottomNavTab = "home" | "chat" | "stories" | "breathe" | "settings";

type AppBottomNavProps = {
  language: Language;
  activeTab: AppBottomNavTab;
  isChildWorkspace: boolean;
  onSelect: (tab: AppBottomNavTab) => void;
};

type TabDef = {
  id: AppBottomNavTab;
  icon: string;
  labelAr: string;
  labelEn: string;
};

const adultTabs: TabDef[] = [
  { id: "home", icon: "home", labelAr: "الرئيسية", labelEn: "Home" },
  { id: "chat", icon: "chat_bubble", labelAr: "المحادثة", labelEn: "Chat" },
  { id: "stories", icon: "auto_stories", labelAr: "القصص", labelEn: "Stories" },
  { id: "breathe", icon: "spa", labelAr: "تنفس", labelEn: "Breathe" },
  { id: "settings", icon: "settings", labelAr: "الإعدادات", labelEn: "Settings" },
];

const childTabs: TabDef[] = [
  { id: "home", icon: "home", labelAr: "الرئيسية", labelEn: "Home" },
  { id: "chat", icon: "chat_bubble", labelAr: "المحادثة", labelEn: "Chat" },
  { id: "stories", icon: "auto_stories", labelAr: "القصص", labelEn: "Stories" },
  { id: "breathe", icon: "spa", labelAr: "تنفس", labelEn: "Breathe" },
  { id: "settings", icon: "settings", labelAr: "إعداداتي", labelEn: "My Settings" },
];

const iconSvgs: Record<string, string> = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  chat_bubble: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  auto_stories: "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
  spa: "M15.49 9.63c-.18-2.79-1.31-5.51-3.43-7.63a12.188 12.188 0 00-3.55 7.63c1.28.68 2.46 1.56 3.49 2.63 1.03-1.06 2.21-1.94 3.49-2.63zm-6.5 2.65c-.14-.1-.3-.19-.45-.29a9.762 9.762 0 00-2.81-2.07c-.16.56-.33 1.13-.51 1.72-.43 1.43-.87 2.89-.87 4.36 0 1.27.37 2.23 1.1 2.86.73-.63 1.1-1.59 1.1-2.86 0-.6-.14-1.22-.41-1.87-.25-.6-.55-1.18-.85-1.74l-.04-.07c.18-.1.37-.19.55-.29.55-.32 1.18-.67 1.88-1.13.71-.47 1.49-1.06 2.33-1.82.84.76 1.62 1.35 2.33 1.82.7.46 1.33.81 1.88 1.13.18.1.37.19.55.29l-.04.07c-.3.56-.6 1.14-.85 1.74-.27.65-.41 1.27-.41 1.87 0 1.27.37 2.23 1.1 2.86.73-.63 1.1-1.59 1.1-2.86 0-1.47-.44-2.93-.87-4.36-.18-.59-.35-1.16-.51-1.72a9.762 9.762 0 00-2.81-2.07c-.15.1-.31.19-.45.29z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z",
};

export function AppBottomNav({ language, activeTab, isChildWorkspace, onSelect }: AppBottomNavProps) {
  const isArabic = language === "ar";
  const tabs = isChildWorkspace ? childTabs : adultTabs;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0E0D10]/95 backdrop-blur-xl safe-area-bottom" dir={isArabic ? "rtl" : "ltr"}>
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const iconPath = iconSvgs[tab.icon] || iconSvgs.home;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`group flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-all duration-200 ${
                isActive
                  ? "text-amber-200"
                  : "text-bone/40 hover:text-bone/70"
              }`}
            >
              <span className="relative">
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                  fill="currentColor"
                >
                  <path d={iconPath} />
                </svg>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-200" />
                )}
              </span>
              <span className={`font-arsans text-[10px] leading-tight ${isActive ? "font-bold" : "font-medium"}`}>
                {isArabic ? tab.labelAr : tab.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
