// webapp/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  console.log("Middleware running for:", request.nextUrl.pathname);
  const token = request.cookies.get("token")?.value;
  console.log("Token:", token);

  // Redirect to /login if no token, for any matched route
  if (!token) {
    console.log("Redirecting to /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};