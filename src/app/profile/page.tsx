import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : null;

  if (!userId) {
    redirect("/auth/signin?callbackUrl=/profile");
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
    redirect("/auth/signin?callbackUrl=/profile");
  }

  return <ProfileClient initialProfile={{ ...user, socialLinks: parseSocialLinks(user.socialLinksJson), createdAt: user.createdAt.toISOString() }} />;
}

function parseSocialLinks(value: string | null) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}