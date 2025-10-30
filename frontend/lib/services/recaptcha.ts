export type RecaptchaVerificationResult = {
    success: boolean;
    score?: number;
    action?: string;
    hostname?: string;
    errorCodes?: string[];
};

export async function verifyRecaptchaToken(
    token: string | null | undefined,
    expectedAction: string,
    scoreThreshold: number = 0.5
): Promise<RecaptchaVerificationResult> {
    if (!token) {
        return { success: false, errorCodes: ["missing-token"] };
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
        // Fail closed if secret missing in server environment
        return { success: false, errorCodes: ["missing-secret"] };
    }

    try {
        const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ secret, response: token }).toString(),
            // Avoid leaking credentials or proxies
            cache: "no-store",
        });

        type GoogleSiteVerifyResponse = {
            success: boolean;
            score?: number;
            action?: string;
            hostname?: string;
            challenge_ts?: string;
            /** per Google API */
            "error-codes"?: string[];
        };

        const data = (await resp.json()) as GoogleSiteVerifyResponse;

        const result: RecaptchaVerificationResult = {
            success: Boolean(data.success),
            score: data.score,
            action: data.action,
            hostname: data.hostname,
            errorCodes: data["error-codes"],
        };

        if (!result.success) return result;

        // Validate expected action
        if (result.action !== expectedAction) {
            return { success: false, score: result.score, action: result.action, hostname: result.hostname, errorCodes: ["unexpected-action"] };
        }

        // Validate score threshold
        if (typeof result.score === "number" && result.score < scoreThreshold) {
            return { success: false, score: result.score, action: result.action, hostname: result.hostname, errorCodes: ["low-score"] };
        }

        return result;
    } catch {
        return { success: false, errorCodes: ["verification-failed"] };
    }
}


