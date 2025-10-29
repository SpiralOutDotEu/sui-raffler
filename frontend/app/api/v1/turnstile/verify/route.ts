import { NextRequest, NextResponse } from "next/server";
import { TurnstileService } from "@/lib/services/turnstile";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const token = body.token;

        if (!token || typeof token !== "string") {
            console.error("Turnstile verify: Missing or invalid token");
            return NextResponse.json(
                { success: false, error: "Missing or invalid token" },
                { status: 400 }
            );
        }

        const remoteip = TurnstileService.getClientIP(request);
        const validation = await TurnstileService.validateToken(token, remoteip);

        if (validation.success) {
            return NextResponse.json({
                success: true,
                hostname: validation.hostname,
                challenge_ts: validation.challenge_ts,
            });
        } else {
            console.error("Turnstile verify: Validation failed:", validation["error-codes"]);
            return NextResponse.json(
                {
                    success: false,
                    "error-codes": validation["error-codes"] || ["unknown-error"],
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Turnstile verify endpoint error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("Error details:", { errorMessage, errorStack });

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

