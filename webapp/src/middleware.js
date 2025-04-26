import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("token")?.value;

  const currentPath = request.nextUrl.pathname;
  const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

  // Redirect logged-in users trying to access /login or /addUser to the main homepage
  if (token && (currentPath === "/login" || currentPath === "/addUser")) {
    console.log("Logged-in user attempted to access /login or /addUser, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated that access "/wihoot/create" to "/"
  if (!token && (currentPath.startsWith("/wihoot/create") )) {
    console.log("No token, redirecting to /login from:", currentPath);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Allow unauthenticated users to access "/" or any "/guest/*" paths
  if (!token && (currentPath === "/" || currentPath.startsWith("/guest") || currentPath.startsWith("/wihoot") )) {
    console.log("No token, allowing access to:", currentPath);
    return NextResponse.next();
  }

  // Redirect unauthenticated users trying to access protected routes to /login
  if (!token && currentPath !== "/login" && currentPath !== "/addUser") {
    console.log("No token, redirecting to /login from:", currentPath);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"], // Exclude static assets and API routes
};