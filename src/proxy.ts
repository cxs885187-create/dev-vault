// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// 1. 创建一个路由匹配器：这里使用 '(.*)' 表示匹配全站所有页面
const isProtectedRoute = createRouteMatcher(['(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // 2. 核心拦截逻辑：如果当前访问的是受保护路由，强制要求身份验证
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  // 这是 Next.js 推荐的 matcher，忽略静态文件和内部路由
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}