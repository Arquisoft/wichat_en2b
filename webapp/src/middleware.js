// webapp/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("token")?.value;

  // If user is logged in (has token) and trying to access /login, redirect to home
  if (token && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/addUser")) {
    console.log("Logged-in user attempted to access /login, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If no token and trying to access protected routes, redirect to /login
  if (!token && request.nextUrl.pathname !== "/login" && request.nextUrl.pathname !== "/addUser") {
    console.log("No token, redirecting to /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};