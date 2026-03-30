import { PrismaClient } from '@prisma/client'

// 开发环境复用 Prisma 单例，避免热更新反复创建连接。
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
