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
    async jwt({ token, user }) {
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
        },
      };
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/?onboarding=conversation`;
    },
  },
};
