import { NextResponse } from "next/server";

export async function middleware(request) {
  console.log("Middleware running for:", request.nextUrl.pathname);
  const token = request.cookies.get("token")?.value;
  console.log("Token:", token);

  const currentPath = request.nextUrl.pathname;
  const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

  // If user is authenticated and has guest data to save
  if (token && currentPath !== "/login" && currentPath !== "/addUser") {
    // Check if this is the first request after login by looking for a flag
    const hasGuestDataSaved = request.cookies.get("guestDataSaved")?.value;

    if (!hasGuestDataSaved) {
      // Assume guest data was sent in a previous request or needs to be fetched
      // We'll simulate fetching it from a client-side redirect with a header
      const guestDataHeader = request.headers.get("x-guest-game-data");
      if (guestDataHeader) {
        try {
          const guestData = JSON.parse(guestDataHeader);
          const response = await fetch(`${apiEndpoint}/game`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(guestData),
          });

          if (!response.ok) {
            console.error("Failed to save guest data:", response.statusText);
          } else {
            console.log("Guest data saved successfully");
            // Set a cookie to mark that guest data has been saved
            const responseWithCookie = NextResponse.next();
            responseWithCookie.cookies.set("guestDataSaved", "true", { path: "/", maxAge: 60 * 60 * 24 }); // 1 day
            return responseWithCookie;
          }
        } catch (error) {
          console.error("Error saving guest data in middleware:", error);
        }
      }
    }
  }

  // Redirect logged-in users trying to access /login or /addUser to the main homepage
  if (token && (currentPath === "/login" || currentPath === "/addUser")) {
    console.log("Logged-in user attempted to access /login or /addUser, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow unauthenticated users to access "/" or any "/guest/*" paths
  if (!token && (currentPath === "/" || currentPath.startsWith("/guest"))) {
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