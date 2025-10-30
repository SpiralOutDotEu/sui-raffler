declare global {
    interface Window {
        grecaptcha?: {
            ready: (cb: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

export async function executeRecaptcha(action: string): Promise<string> {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string | undefined;
    if (!siteKey) {
        throw new Error("Missing reCAPTCHA site key");
    }
    const grecaptcha = typeof window !== "undefined" ? window.grecaptcha : undefined;
    if (!grecaptcha) {
        throw new Error("reCAPTCHA not loaded");
    }
    return await new Promise<string>((resolve, reject) => {
        grecaptcha.ready(() => {
            grecaptcha
                .execute(siteKey, { action })
                .then((token: string) => resolve(token))
                .catch(reject);
        });
    });
}


