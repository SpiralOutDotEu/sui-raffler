"use client";

import { useEffect, useRef, useState } from "react";
import { useTurnstile } from "@/lib/context/TurnstileContext";

declare global {
  interface Window {
    turnstile: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (error: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileModalProps {
  sitekey: string;
}

export default function TurnstileModal({ sitekey }: TurnstileModalProps) {
  const { isVerified, verifyToken, resetVerification, token } = useTurnstile();
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Check if Turnstile script is loaded
  useEffect(() => {
    const checkScript = () => {
      if (typeof window !== "undefined" && window.turnstile) {
        setScriptLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkScript()) return;

    // Poll for script to load
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait
    const interval = setInterval(() => {
      attempts++;
      if (checkScript()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.error("Turnstile script failed to load after 10 seconds");
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Clean up widget when verified
    if (isVerified && widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      return;
    }

    // Render widget if not verified
    if (
      !isVerified &&
      scriptLoaded &&
      widgetRef.current &&
      !widgetIdRef.current
    ) {
      // Render Turnstile widget
      const widgetId = window.turnstile.render(widgetRef.current, {
        sitekey,
        theme: "auto",
        size: "normal",
        callback: async (token: string) => {
          try {
            await verifyToken(token);
          } catch (error) {
            console.error("Error in verifyToken callback:", error);
          }
        },
        "error-callback": (error: string) => {
          console.error("Turnstile error occurred:", error);
        },
        "expired-callback": () => {
          resetVerification();
        },
      });

      widgetIdRef.current = widgetId;

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }
  }, [isVerified, scriptLoaded, sitekey, verifyToken, resetVerification]);

  // Show loading state while script is loading
  if (!scriptLoaded) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verify You&apos;re Human
            </h2>
            <p className="text-gray-600">Loading verification...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isVerified && token) {
    return null;
  }

  // Show modal if not verified or no token
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify You&apos;re Human
          </h2>
          <p className="text-gray-600">
            Please complete the verification to continue
          </p>
        </div>
        <div className="flex justify-center" ref={widgetRef} />
      </div>
    </div>
  );
}
