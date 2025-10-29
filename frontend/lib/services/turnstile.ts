/**
 * Server-side Turnstile validation service
 */

interface TurnstileVerifyResponse {
    success: boolean;
    "error-codes"?: string[];
    challenge_ts?: string;
    hostname?: string;
}

export class TurnstileService {
    private static readonly SITEVERIFY_URL =
        "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    /**
     * Validate a Turnstile token with Cloudflare's Siteverify API
     */
    static async validateToken(
        token: string,
        remoteip?: string
    ): Promise<TurnstileVerifyResponse> {
        const secretKey = process.env.TURNSTILE_SECRET_KEY;

        if (!secretKey) {
            console.error("TURNSTILE_SECRET_KEY is not configured in environment variables");
            return {
                success: false,
                "error-codes": ["missing-input-secret"],
            };
        }

        if (!token || typeof token !== "string") {
            console.error("TurnstileService: Invalid token provided");
            return {
                success: false,
                "error-codes": ["missing-input-response"],
            };
        }

        if (token.length > 2048) {
            console.error("TurnstileService: Token too long:", token.length);
            return {
                success: false,
                "error-codes": ["invalid-input-response"],
            };
        }

        try {
            // Use URLSearchParams instead of FormData for better compatibility
            const params = new URLSearchParams();
            params.append("secret", secretKey);
            params.append("response", token);

            if (remoteip) {
                params.append("remoteip", remoteip);
            }

            const response = await fetch(this.SITEVERIFY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error");
                console.error("TurnstileService: Cloudflare API error:", response.status, errorText);
                return {
                    success: false,
                    "error-codes": ["internal-error"],
                };
            }

            const result: TurnstileVerifyResponse = await response.json();
            return result;
        } catch (error) {
            console.error("Turnstile validation error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error("TurnstileService error details:", { errorMessage, errorStack });

            return {
                success: false,
                "error-codes": ["internal-error"],
            };
        }
    }

    /**
     * Get client IP address from request headers
     */
    static getClientIP(request: Request): string | undefined {
        // Try Cloudflare header first
        const cfIP = request.headers.get("CF-Connecting-IP");
        if (cfIP) return cfIP;

        // Try X-Forwarded-For header
        const xForwardedFor = request.headers.get("X-Forwarded-For");
        if (xForwardedFor) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return xForwardedFor.split(",")[0].trim();
        }

        return undefined;
    }
}

