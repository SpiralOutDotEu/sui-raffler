import { NextRequest, NextResponse } from "next/server";
import { TurnstileService } from "@/lib/services/turnstile";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip Turnstile validation for healthz and turnstile verify endpoints
    if (pathname === "/api/v1/healthz" || pathname === "/api/v1/turnstile/verify") {
        return NextResponse.next();
    }

    // Only protect API routes under /api/v1 (excluding healthz)
    if (pathname.startsWith("/api/v1/")) {
        // Get token from headers
        const token =
            request.headers.get("x-turnstile-token") ||
            request.headers.get("cf-turnstile-response");

        // For GET requests, validate in middleware
        if (request.method === "GET") {
            if (!token) {
                return NextResponse.json(
                    { error: "Turnstile token required" },
                    { status: 403 }
                );
            }

            const remoteip = TurnstileService.getClientIP(request);
            const validation = await TurnstileService.validateToken(token, remoteip);

            if (!validation.success) {
                return NextResponse.json(
                    {
                        error: "Invalid Turnstile token",
                        "error-codes": validation["error-codes"] || ["unknown-error"],
                    },
                    { status: 403 }
                );
            }

            // Optionally validate hostname in middleware (same logic as in validator)
            // For simplicity, we'll rely on route handler validation for hostname
        }

        // For POST/PUT/DELETE requests, validation happens in route handlers
        // (route handlers call validateTurnstileRequest)
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/v1/:path*"],
};

