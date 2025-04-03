import { NextResponse } from "next/server";

export function middleware(request) {
  console.log("Middleware running for:", request.nextUrl.pathname);
  const token = request.cookies.get("token")?.value;
  console.log("Token:", token);

  const currentPath = request.nextUrl.pathname;

  // Redirect logged-in users trying to access /login or /addUser to the main homepage
  if (token && (currentPath === "/login" || currentPath === "/addUser")) {
    console.log("Logged-in user attempted to access /login or /addUser, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow unauthenticated users to access "/" (default homepage)
  if (!token && currentPath === "/") {
    console.log("No token, allowing access to /");
    return NextResponse.next();
  }

  // Redirect unauthenticated users trying to access protected routes to /login
  if (!token && currentPath !== "/login" && currentPath !== "/addUser") {
    console.log("No token, redirecting to /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"], // Exclude static assets and API routes
};
