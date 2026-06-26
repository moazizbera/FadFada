import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

type SocialLinks = {
  website?: string;
  linkedin?: string;
  x?: string;
  instagram?: string;
};

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : null;

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      nickname: true,
      email: true,
      image: true,
      socialLinksJson: true,
      role: true,
      activeTier: true,
      lemonSubscriptionStatus: true,
      lemonCustomerPortalUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ profile: { ...user, socialLinks: parseSocialLinks(user.socialLinksJson) } });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : null;

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as {
    fullName?: string;
    nickname?: string;
    image?: string;
    socialLinks?: SocialLinks;
  };

  const fullName = cleanText(body.fullName, 80);
  const nickname = cleanText(body.nickname, 40);
  const image = cleanImage(body.image);
  const socialLinks = cleanSocialLinks(body.socialLinks);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: fullName,
      nickname,
      image,
      socialLinksJson: JSON.stringify(socialLinks),
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      email: true,
      image: true,
      socialLinksJson: true,
      role: true,
      activeTier: true,
      lemonSubscriptionStatus: true,
      lemonCustomerPortalUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ profile: { ...user, socialLinks } });
}

function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  return text ? text.slice(0, maxLength) : null;
}

function cleanImage(value: string | undefined) {
  const image = value?.trim() || null;
  if (!image) return null;
  if (image.startsWith("/profile-logos/")) return image.slice(0, 120);

  try {
    const url = new URL(image);
    return url.protocol === "https:" ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

function cleanSocialLinks(value: SocialLinks | undefined): SocialLinks {
  return {
    website: cleanUrl(value?.website),
    linkedin: cleanUrl(value?.linkedin),
    x: cleanUrl(value?.x),
    instagram: cleanUrl(value?.instagram),
  };
}

function cleanUrl(value: string | undefined) {
  const text = value?.trim();
  if (!text) return undefined;

  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString().slice(0, 240) : undefined;
  } catch {
    return undefined;
  }
}

function parseSocialLinks(value: string | null): SocialLinks {
  if (!value) return {};

  try {
    return JSON.parse(value) as SocialLinks;
  } catch {
    return {};
  }
}