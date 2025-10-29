import { useCallback } from "react";
import { useTurnstile } from "@/lib/context/TurnstileContext";

/**
 * Custom hook that wraps fetch to automatically include Turnstile token
 * in API requests to protected endpoints
 */
export function useApiFetch() {
    const { token, resetVerification } = useTurnstile();

    const apiFetch = useCallback(
        async (
            url: string,
            options: RequestInit = {}
        ): Promise<Response> => {
            const headers = new Headers(options.headers);

            // Add Turnstile token to headers if available and endpoint is protected
            if (url.startsWith("/api/v1/") && !url.includes("/healthz")) {
                if (!token) {
                    console.warn("Turnstile token missing for API request:", url);
                    // Reset verification to show modal
                    resetVerification();
                    return new Response(
                        JSON.stringify({ error: "Turnstile verification required" }),
                        {
                            status: 403,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                }
                headers.set("x-turnstile-token", token);
            }

            const response = await fetch(url, {
                ...options,
                headers,
            });

            // If we get a 403, the token might have expired
            if (response.status === 403) {
                try {
                    const error = await response.clone().json().catch(() => ({}));
                    if (
                        error.error === "Turnstile token required" ||
                        error.error === "Invalid Turnstile token" ||
                        error.error === "Turnstile verification required"
                    ) {
                        // Token expired or invalid - reset verification to trigger re-verification
                        resetVerification();
                    }
                } catch {
                    // If parsing fails, just reset anyway
                    resetVerification();
                }
            }

            return response;
        },
        [token, resetVerification]
    );

    return apiFetch;
}

