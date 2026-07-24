import { PrismaAdapter } from "@next-auth/prisma-adapter";
import crypto from "crypto";
import { headers } from "next/headers";
import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { applyLifetimePlus, hasLifetimePlusAccess } from "./lifetimeAccess";
import { prisma } from "./prisma";

const complimentaryTokenBalance = 15;

type AuthUserWithFadFadaState = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "USER" | "ADMIN";
  activeTier?: "FREE" | "PLUS" | "BUSINESS";
  tokenBalance?: number;
  currentLanguage?: string;
  childProfileId?: string | null;
  childNickname?: string | null;
  childBirthYear?: number | null;
  childAgeBand?: ChildAgeBand | null;
  workspaceMode?: WorkspaceMode;
};

export type WorkspaceMode = "parent" | "child";
export type ChildAgeBand = "under_8" | "8_to_10" | "11_to_12" | "13_plus";

export type FadFadaSessionUser = {
  id?: string | null;
  role?: "USER" | "ADMIN";
  activeTier?: "FREE" | "PLUS" | "BUSINESS";
  tokenBalance?: number;
  currentLanguage?: string;
  childProfileId?: string | null;
  childNickname?: string | null;
  childBirthYear?: number | null;
  childAgeBand?: ChildAgeBand | null;
  workspaceMode?: WorkspaceMode;
};

type ChildWorkspaceSessionUpdate = {
  childProfileId?: unknown;
  activeChildProfileId?: unknown;
  clearChildProfile?: unknown;
  parentReturnCode?: unknown;
};

function getConfiguredProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      id: "email-signup",
      name: "Email sign up",
      credentials: {
        name: { label: "Name", type: "text", placeholder: "Mo Aziz" },
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return null;
        }

        return {
          id: `email:${email}`,
          name: credentials?.name?.trim() || email.split("@")[0],
          email,
        };
      },
    }),
    CredentialsProvider({
      id: "admin-login",
      name: "Admin login",
      credentials: {
        email: { label: "Admin email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password || "";

        if (!email || !normalizeAdminEmails().includes(email) || !verifyAdminPassword(password)) {
          return null;
        }

        return {
          id: `admin:${email}`,
          name: email.split("@")[0],
          email,
        };
      },
    }),
  ];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET,
      })
    );
  }

  if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
    providers.push(
      EmailProvider({
        server: process.env.EMAIL_SERVER,
        from: process.env.EMAIL_FROM,
      })
    );
  }

  return providers;
}

function normalizeAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function inferEmailDomain(email: string) {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain || null;
}

export function readAuthenticatedUserId(sessionUser: unknown) {
  const user = sessionUser as FadFadaSessionUser | undefined;
  const userId = typeof user?.id === "string" ? user.id.trim() : "";
  return userId || null;
}

export function getChildWorkspaceContext(sessionUser: unknown) {
  const user = sessionUser as FadFadaSessionUser | undefined;
  const childProfileId = typeof user?.childProfileId === "string" ? user.childProfileId.trim() : "";

  if (user?.workspaceMode !== "child" || !childProfileId || typeof user.childBirthYear !== "number") {
    return null;
  }

  return {
    childProfileId,
    birthYear: user.childBirthYear,
    ageBand: user.childAgeBand ?? inferChildAgeBand(user.childBirthYear),
  };
}

export function requireParentWorkspace(sessionUser: unknown) {
  const userId = readAuthenticatedUserId(sessionUser);

  if (!userId) {
    return { ok: false as const, status: 401, error: "UNAUTHORIZED" };
  }

  if (getChildWorkspaceContext(sessionUser)) {
    return { ok: false as const, status: 403, error: "PARENT_WORKSPACE_REQUIRED" };
  }

  return { ok: true as const, userId };
}

export function inferChildAgeBand(birthYear: number, referenceDate = new Date()): ChildAgeBand {
  const age = referenceDate.getUTCFullYear() - birthYear;

  if (age < 8) return "under_8";
  if (age <= 10) return "8_to_10";
  if (age <= 12) return "11_to_12";
  return "13_plus";
}

function getUtcDateKey(referenceDate: Date) {
  const year = referenceDate.getUTCFullYear();
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveParentReturnCodeFromDateKey(userId: string, dateKey: string) {
  const seed = `${userId}:${dateKey}:${process.env.NEXTAUTH_SECRET || "fadfada-parent-return"}`;
  const digest = crypto.createHash("sha256").update(seed).digest("hex");
  const numericWindow = parseInt(digest.slice(0, 8), 16);
  return String((numericWindow % 9000) + 1000);
}

export function buildParentReturnCode(userId: string, referenceDate = new Date()) {
  const dateKey = getUtcDateKey(referenceDate);
  const code = deriveParentReturnCodeFromDateKey(userId, dateKey);
  const expiresAt = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate() + 1, 0, 0, 0, 0));
  return { code, expiresAt: expiresAt.toISOString() };
}

export function verifyParentReturnCode(userId: string, inputCode: string, referenceDate = new Date()) {
  const normalizedInput = (inputCode || "").replace(/\D/g, "").slice(0, 4);
  if (normalizedInput.length !== 4) return false;

  const currentDateKey = getUtcDateKey(referenceDate);
  const previousDate = new Date(referenceDate);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const previousDateKey = getUtcDateKey(previousDate);

  const currentCode = deriveParentReturnCodeFromDateKey(userId, currentDateKey);
  const previousCode = deriveParentReturnCodeFromDateKey(userId, previousDateKey);
  return timingSafeEqual(normalizedInput, currentCode) || timingSafeEqual(normalizedInput, previousCode);
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyAdminPassword(password: string) {
  const configuredHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim();

  if (configuredHash) {
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    return timingSafeEqual(passwordHash, configuredHash);
  }

  if (configuredPassword) {
    return timingSafeEqual(password, configuredPassword);
  }

  return false;
}

async function determineUserRole(email: string): Promise<"USER" | "ADMIN"> {
  const adminEmails = normalizeAdminEmails();

  if (adminEmails.includes(email)) {
    return "ADMIN";
  }

  if (adminEmails.length === 0) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

    if (adminCount === 0) {
      return "ADMIN";
    }
  }

  return "USER";
}

export function buildGeographicRegionFromHeaders(headerStore: Headers) {
  const city = headerStore.get("x-vercel-ip-city") || headerStore.get("cf-ipcity") || headerStore.get("x-city") || "";
  const region =
    headerStore.get("x-vercel-ip-country-region") ||
    headerStore.get("cf-region") ||
    headerStore.get("cf-region-code") ||
    headerStore.get("x-region") ||
    "";
  const country =
    headerStore.get("x-vercel-ip-country") ||
    headerStore.get("cf-ipcountry") ||
    headerStore.get("cloudfront-viewer-country") ||
    headerStore.get("x-country-code") ||
    "";
  const location = [city, region, country]
    .map((value) => normalizeLocationPart(value))
    .filter(Boolean)
    .join(", ");

  return location || "unknown";
}

function normalizeLocationPart(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

async function readRegistrationRequestMetadata() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") || "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || headerStore.get("x-real-ip") || headerStore.get("cf-connecting-ip") || "unknown";
  const geographicRegion = buildGeographicRegionFromHeaders(headerStore);
  const userAgent = headerStore.get("user-agent") || "unknown";
  const referralSource = headerStore.get("referer") || headerStore.get("referrer") || null;

  return {
    ipAddress,
    geographicRegion,
    userAgent,
    referralSource,
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: getConfiguredProviders(),
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();

      if (!email) {
        return true;
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      const metadata = await readRegistrationRequestMetadata();
      const role = await determineUserRole(email);
      const firstEmailDomain = inferEmailDomain(email);

      if (!existingUser) {
        await prisma.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            name: user.name,
            email,
            image: user.image,
            currentLanguage: "ar",
            activeTier: hasLifetimePlusAccess(email) ? "PLUS" : "FREE",
            tokenBalance: hasLifetimePlusAccess(email) ? 9999 : complimentaryTokenBalance,
            role,
            firstEmailDomain,
            registrationRegion: metadata.geographicRegion,
            referralSource: metadata.referralSource,
          },
          update: {
            name: user.name,
            image: user.image,
            role,
            firstEmailDomain,
            registrationRegion: metadata.geographicRegion,
            referralSource: metadata.referralSource,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: user.name ?? existingUser.name,
            image: user.image ?? existingUser.image,
            role,
            ...(hasLifetimePlusAccess(email) ? { activeTier: "PLUS" as const, tokenBalance: { set: Math.max(existingUser.tokenBalance, 9999) }, lemonSubscriptionStatus: "lifetime" } : {}),
          },
        });
      }

      const trackedUser = existingUser ?? (await prisma.user.findUnique({ where: { email } }));

      await prisma.visitorLog.create({
        data: {
          userId: trackedUser?.id,
          ipAddress: metadata.ipAddress,
          geographicRegion: metadata.geographicRegion,
          userAgent: metadata.userAgent,
          referralSource: metadata.referralSource,
        },
      });

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      const email = (user?.email || token.email)?.trim().toLowerCase();

      if (email) {
        const fadfadaUser = await prisma.user.findUnique({ where: { email } });

        if (fadfadaUser) {
          const effectiveUser = applyLifetimePlus(fadfadaUser);
          token.sub = fadfadaUser.id;
          token.name = effectiveUser.name;
          token.email = effectiveUser.email;
          token.picture = effectiveUser.image;
          token.role = effectiveUser.role;
          token.activeTier = effectiveUser.activeTier;
          token.tokenBalance = effectiveUser.tokenBalance;
          token.currentLanguage = effectiveUser.currentLanguage;
        }
      }

      if (trigger === "update") {
        const childUpdate = session as ChildWorkspaceSessionUpdate | undefined;
        const requestedChildProfileId = typeof childUpdate?.childProfileId === "string"
          ? childUpdate.childProfileId.trim()
          : typeof childUpdate?.activeChildProfileId === "string"
            ? childUpdate.activeChildProfileId.trim()
            : "";
        const submittedParentReturnCode = typeof childUpdate?.parentReturnCode === "string" ? childUpdate.parentReturnCode.trim() : "";

        if (childUpdate?.clearChildProfile === true || childUpdate?.childProfileId === null || childUpdate?.activeChildProfileId === null) {
          const activeChildProfileId = typeof token.childProfileId === "string" ? token.childProfileId.trim() : "";
          const canExitChildWorkspace = !activeChildProfileId || (token.sub && verifyParentReturnCode(String(token.sub), submittedParentReturnCode));

          if (canExitChildWorkspace) {
            token.childProfileId = null;
            token.childNickname = null;
            token.childBirthYear = null;
            token.childAgeBand = null;
            token.workspaceMode = "parent";
          }
        } else if (requestedChildProfileId && token.sub) {
          const childProfile = await prisma.childProfile.findFirst({
            where: { id: requestedChildProfileId, parentId: String(token.sub) },
            select: { id: true, nickname: true, birthYear: true },
          });

          if (childProfile) {
            token.childProfileId = childProfile.id;
            token.childNickname = childProfile.nickname;
            token.childBirthYear = childProfile.birthYear;
            token.childAgeBand = inferChildAgeBand(childProfile.birthYear);
            token.workspaceMode = "child";
          }
        }
      }

      const activeChildProfileId = typeof token.childProfileId === "string" ? token.childProfileId.trim() : "";

      if (activeChildProfileId && token.sub) {
        const childProfile = await prisma.childProfile.findFirst({
          where: { id: activeChildProfileId, parentId: String(token.sub) },
          select: { id: true, nickname: true, birthYear: true },
        });

        if (childProfile) {
          token.childProfileId = childProfile.id;
          token.childNickname = childProfile.nickname;
          token.childBirthYear = childProfile.birthYear;
          token.childAgeBand = inferChildAgeBand(childProfile.birthYear);
          token.workspaceMode = "child";
        } else {
          token.childProfileId = null;
          token.childNickname = null;
          token.childBirthYear = null;
          token.childAgeBand = null;
          token.workspaceMode = "parent";
        }
      } else {
        token.workspaceMode = "parent";
      }

      return token;
    },
    async session({ session, token }) {
      const fadfadaUser = token as AuthUserWithFadFadaState;

      if (session.user) {
        session.user.name = fadfadaUser.name;
        session.user.email = fadfadaUser.email;
        session.user.image = fadfadaUser.image || null;
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: fadfadaUser.id || token.sub,
          role: fadfadaUser.role ?? "USER",
          activeTier: fadfadaUser.activeTier ?? "FREE",
          tokenBalance: fadfadaUser.tokenBalance ?? complimentaryTokenBalance,
          currentLanguage: fadfadaUser.currentLanguage ?? "ar",
          childProfileId: fadfadaUser.childProfileId ?? null,
          childNickname: fadfadaUser.childNickname ?? null,
          childBirthYear: fadfadaUser.childBirthYear ?? null,
          childAgeBand: fadfadaUser.childAgeBand ?? null,
          workspaceMode: fadfadaUser.workspaceMode ?? "parent",
        },
      };
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/?onboarding=conversation`;
    },
  },
};
