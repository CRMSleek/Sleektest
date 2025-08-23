import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const publicRoutes = ["/", "/login", "/register", "/features", "/pricing", "/about"]
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith("/survey/")
  
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const payload = await verifyToken(token)
    console.log("Middleware - Token payload:", payload)
    
    if (!payload) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
