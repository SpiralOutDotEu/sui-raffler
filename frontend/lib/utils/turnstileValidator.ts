import { NextRequest, NextResponse } from "next/server";
import { TurnstileService } from "@/lib/services/turnstile";

/**
 * Validates Turnstile token from request headers
 * Returns null if valid, or a NextResponse with error if invalid
 * Note: Token should be sent in headers (x-turnstile-token) to avoid consuming request body
 */
/**
 * Get allowed hostnames from environment variable
 * Format: "domain1.com,domain2.com" or single domain
 */
function getAllowedHostnames(): string[] {
    const allowed = process.env.TURNSTILE_ALLOWED_HOSTNAMES;
    if (!allowed) return [];

    return allowed.split(",").map(h => h.trim().toLowerCase());
}

export async function validateTurnstileRequest(
    request: NextRequest
): Promise<NextResponse | null> {
    // Skip validation for healthz and turnstile verify endpoints
    const url = new URL(request.url);
    if (url.pathname === "/api/v1/healthz" || url.pathname === "/api/v1/turnstile/verify") {
        return null;
    }

    // Get token from headers (frontend should send it in headers)
    const token =
        request.headers.get("x-turnstile-token") ||
        request.headers.get("cf-turnstile-response") ||
        undefined;

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

    // Optionally validate hostname matches expected domains
    const allowedHostnames = getAllowedHostnames();
    if (allowedHostnames.length > 0 && validation.hostname) {
        const tokenHostname = validation.hostname.toLowerCase();
        const isValidHostname = allowedHostnames.some(allowed => {
            // Allow exact match or subdomain match
            return tokenHostname === allowed || tokenHostname.endsWith(`.${allowed}`);
        });

        if (!isValidHostname) {
            console.warn(`Turnstile hostname mismatch: ${validation.hostname} not in allowed list: ${allowedHostnames.join(", ")}`);
            // In development, allow any hostname; in production, enforce it
            if (process.env.NODE_ENV === "production") {
                return NextResponse.json(
                    {
                        error: "Invalid Turnstile hostname",
                        "error-codes": ["hostname-mismatch"],
                    },
                    { status: 403 }
                );
            }
        }
    }

    return null; // Validation passed
}

