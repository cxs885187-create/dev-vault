// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// 缓存 Prisma 实例，防止开发环境热更新导致连接数耗尽
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma