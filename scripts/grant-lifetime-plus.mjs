import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(JSON.stringify({ ok: false, error: "VALID_EMAIL_REQUIRED" }));
  process.exit(1);
}

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      activeTier: true,
      tokenBalance: true,
      lemonSubscriptionStatus: true,
    },
  });

  if (!user) {
    console.log(JSON.stringify({ ok: false, reason: "USER_NOT_FOUND", email }));
    process.exit(0);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      activeTier: "PLUS",
      tokenBalance: { set: 9999 },
      lemonSubscriptionStatus: "lifetime",
    },
    select: {
      id: true,
      email: true,
      activeTier: true,
      tokenBalance: true,
      lemonSubscriptionStatus: true,
    },
  });

  console.log(JSON.stringify({ ok: true, updated }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "UNKNOWN_ERROR" }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}