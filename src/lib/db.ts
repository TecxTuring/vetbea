import { PrismaClient } from "@prisma/client";

// garante o fuso da clínica mesmo onde TZ é reservado (ex.: Vercel, que roda em UTC)
process.env.TZ = process.env.APP_TZ || "America/Sao_Paulo";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
