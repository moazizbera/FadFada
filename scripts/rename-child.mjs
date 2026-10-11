import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Parse .env.vercel ourselves (dotenv/Prisma may silently pick up the local
// placeholder .env instead) and expand any ${VAR} references.
function loadEnvFile(path) {
  const map = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    map[k] = v;
  }
  for (const k of Object.keys(map)) {
    map[k] = map[k].replace(/\$\{\{?(\w+)\}?\}/g, (_, name) => map[name] ?? "");
  }
  return map;
}

const env = loadEnvFile(".env.vercel");
const url = env.DATABASE_URL || env.POSTGRES_PRISMA_URL;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const CHILD_ID = "c4b62424-4246-4acd-9ad4-acfc5f4b6d8f";
const NEW_NAME = process.argv[2]?.trim() || "Medo";

try {
  const before = await prisma.childProfile.findUnique({
    where: { id: CHILD_ID },
    select: { id: true, nickname: true, parentId: true, parent: { select: { email: true } } },
  });
  if (!before) {
    console.log(JSON.stringify({ ok: false, reason: "CHILD_NOT_FOUND", CHILD_ID }));
  } else {
    const updated = await prisma.childProfile.update({
      where: { id: CHILD_ID },
      data: { nickname: NEW_NAME },
      select: { id: true, nickname: true },
    });
    console.log(JSON.stringify({ ok: true, parentEmail: before.parent.email, from: before.nickname, to: updated.nickname }));
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "UNKNOWN_ERROR" }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}