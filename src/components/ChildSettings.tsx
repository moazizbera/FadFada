"use client";

type Language = "ar" | "en";

type ChildSettingsProps = {
  language: Language;
  childName: string;
  avatarPath: string;
  dailyTimeMinutes: number;
  hasPassword: boolean;
  onUpdateName: (name: string) => void;
  onUpdateAvatar: (avatarPath: string) => void;
  onUpdateTimeLimit: (minutes: number) => void;
  onSetPassword: (password: string) => void;
  onBack: () => void;
};

const avatarOptions = [
  "/avatars/child-1.svg",
  "/avatars/child-2.svg",
  "/avatars/child-3.svg",
  "/avatars/child-4.svg",
  "/avatars/child-5.svg",
  "/avatars/child-6.svg",
  "/avatars/child-7.svg",
  "/avatars/child-8.svg",
];

export function ChildSettings({
  language,
  childName,
  avatarPath,
  dailyTimeMinutes,
  hasPassword,
  onUpdateName,
  onUpdateAvatar,
  onUpdateTimeLimit,
  onSetPassword,
  onBack,
}: ChildSettingsProps) {
  const isArabic = language === "ar";

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 font-arsans text-sm text-bone/60 transition-colors hover:text-bone"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <span>{isArabic ? "→" : "←"}</span>
        <span>{isArabic ? "رجوع" : "Back"}</span>
      </button>

      {/* Header */}
      <h2 className="font-arsans text-xl font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
        {isArabic ? "إعداداتي" : "My Settings"}
      </h2>

      {/* Avatar selection */}
      <div className="space-y-3">
        <label className="font-arsans text-sm font-semibold text-bone/70" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic ? "اختر صورتك" : "Choose your avatar"}
        </label>
        <div className="flex flex-wrap gap-3">
          {avatarOptions.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => onUpdateAvatar(avatar)}
              className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition-all ${
                avatar === avatarPath
                  ? "border-amber-200 bg-amber-200/20 scale-110"
                  : "border-white/15 bg-white/[0.04] hover:border-white/30"
              }`}
            >
              <img
                src={avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="font-arsans text-sm font-semibold text-bone/70" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic ? "اسمك" : "Your name"}
        </label>
        <input
          type="text"
          value={childName}
          onChange={(e) => onUpdateName(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-arsans text-sm text-bone/90 outline-none transition-all focus:border-amber-200/40 focus:bg-white/[0.06]"
          dir={isArabic ? "rtl" : "ltr"}
        />
      </div>

      {/* Time limit */}
      <div className="space-y-2">
        <label className="font-arsans text-sm font-semibold text-bone/70" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic ? "وقت الاستخدام اليومي" : "Daily time limit"}
        </label>
        <div className="flex items-center gap-3">
          {[15, 30, 45, 60].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => onUpdateTimeLimit(minutes)}
              className={`flex-1 rounded-xl border py-2.5 font-arsans text-sm transition-all ${
                minutes === dailyTimeMinutes
                  ? "border-amber-200/40 bg-amber-200/15 text-amber-100 font-bold"
                  : "border-white/10 bg-white/[0.03] text-bone/50 hover:bg-white/[0.06]"
              }`}
            >
              {minutes}
            </button>
          ))}
        </div>
        <p className="font-arsans text-[11px] text-bone/35" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic ? "دقيقة يومياً" : "minutes per day"}
        </p>
      </div>

      {/* Set/Change password */}
      <div className="space-y-2">
        <label className="font-arsans text-sm font-semibold text-bone/70" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic ? "كلمة مرور العودة" : "Return password"}
        </label>
        <p className="font-arsans text-xs text-bone/40" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic
            ? "كلمة مرور أرقام لحماية حسابك"
            : "A numeric password to protect your account"}
        </p>
        <button
          type="button"
          onClick={() => {
            const pw = prompt(isArabic ? "أدخل كلمة مرور أرقام (4-6 أرقام):" : "Enter a numeric password (4-6 digits):");
            if (pw && /^\d{4,6}$/.test(pw)) {
              onSetPassword(pw);
            }
          }}
          className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-arsans text-sm text-bone/70 transition-all hover:bg-white/[0.08]"
        >
          {hasPassword
            ? isArabic
              ? "تغيير كلمة المرور"
              : "Change password"
            : isArabic
            ? "تعيين كلمة مرور"
            : "Set password"}
        </button>
      </div>
    </div>
  );
}
