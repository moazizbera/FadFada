import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

type GlobalPrisma = typeof globalThis & {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

const globalForPrisma = globalThis as GlobalPrisma;

neonConfig.webSocketConstructor = ws;

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

const pool =
  globalForPrisma.prismaPool ??
  new Pool(poolConfig);

const adapter = new PrismaNeon(poolConfig);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}

export type PrismaEdgeClient = typeof prisma;
