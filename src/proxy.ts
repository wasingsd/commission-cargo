import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Next.js 16 Proxy / Middleware
 * This handles global authentication and request interception.
 */
const authProxy = withAuth(
    function proxy(req) {
        // Optional: Add custom logic here if needed
        return NextResponse.next();
    },
    {
        pages: {
            signIn: "/login",
        },
        secret: process.env.NEXTAUTH_SECRET || "dev_secret_key_12345",
    }
);

export default authProxy;

// Next.js 16 compatibility export
export const proxy = authProxy;

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes, NextAuth handles its own under /api/auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - logo.svg (logo file)
         * - login (login page)
         * - public (public folder assets)
         * - any file with extension (e.g. .png, .jpg)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|logo.svg|login|public|.*\\..*).*)",
    ],
};
