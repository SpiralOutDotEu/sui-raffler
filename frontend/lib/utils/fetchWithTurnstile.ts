/**
 * Utility function to add Turnstile token to fetch requests
 * Can be used in both React components and services
 */
export function getTurnstileToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("turnstile-token");
}

/**
 * Fetch wrapper that automatically adds Turnstile token to protected API requests
 */
export async function fetchWithTurnstile(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = getTurnstileToken();
    const headers = new Headers(options.headers);

    // Add Turnstile token to headers if available and endpoint is protected
    if (token && url.startsWith("/api/v1/") && !url.includes("/healthz")) {
        headers.set("x-turnstile-token", token);
    }

    return fetch(url, {
        ...options,
        headers,
    });
}


