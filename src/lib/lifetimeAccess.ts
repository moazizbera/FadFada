const builtInLifetimePlusEmails = ["maziz.abdelrahman@gmail.com"];

export function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

export function getLifetimePlusEmails() {
  const configuredEmails = (process.env.FADFADA_LIFETIME_PLUS_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);

  return Array.from(new Set([...builtInLifetimePlusEmails, ...configuredEmails]));
}

export function hasLifetimePlusAccess(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail && getLifetimePlusEmails().includes(normalizedEmail));
}

export function applyLifetimePlus<T extends { email?: string | null; activeTier?: "FREE" | "PLUS" | "BUSINESS"; tokenBalance?: number | null; lemonSubscriptionStatus?: string | null }>(user: T): T {
  if (!hasLifetimePlusAccess(user.email)) return user;

  return {
    ...user,
    activeTier: "PLUS",
    tokenBalance: Math.max(user.tokenBalance ?? 0, 9999),
    lemonSubscriptionStatus: user.lemonSubscriptionStatus || "lifetime",
  };
}