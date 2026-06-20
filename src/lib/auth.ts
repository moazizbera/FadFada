import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { headers } from "next/headers";
import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

const complimentaryTokenBalance = 3;

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
  const providers: NextAuthOptions["providers"] = [];

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

async function readRegistrationRequestMetadata() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") || "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || headerStore.get("x-real-ip") || headerStore.get("cf-connecting-ip") || "unknown";
  const geographicRegion =
    [
      headerStore.get("x-vercel-ip-country-region"),
      headerStore.get("x-vercel-ip-country"),
      headerStore.get("cloudfront-viewer-country"),
      headerStore.get("cf-ipcountry"),
      headerStore.get("x-country-code"),
    ].find((value) => value && value.trim().length > 0) || "unknown";
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
    strategy: "database",
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
      const adminEmails = normalizeAdminEmails();
      const role = adminEmails.includes(email) ? "ADMIN" : "USER";
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
            activeTier: "FREE",
            tokenBalance: complimentaryTokenBalance,
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
    async session({ session, user }) {
      const fadfadaUser = user as AuthUserWithFadFadaState;

      if (session.user) {
        session.user.name = fadfadaUser.name;
        session.user.email = fadfadaUser.email;
        session.user.image = fadfadaUser.image;
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: fadfadaUser.id,
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
