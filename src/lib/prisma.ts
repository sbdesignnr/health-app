import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Singleton – zabráni vyčerpaniu spojení pri hot-reloade v dev režime.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 sa pripája cez driver adapter; pooled URL (DATABASE_URL) z .env.local.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
