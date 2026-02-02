import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // Optional: Add custom logic here if needed
        return NextResponse.next();
    },
    {
        pages: {
            signIn: "/login",
        },
    }
);

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
         */
        "/((?!api|_next/static|_next/image|favicon.ico|logo.svg|login|public|.*\\..*).*)",
    ],
};
