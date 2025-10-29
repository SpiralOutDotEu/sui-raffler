"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

interface TurnstileContextType {
  isVerified: boolean;
  verifyToken: (token: string) => Promise<void>;
  resetVerification: () => void;
  token: string | null;
}

const TurnstileContext = createContext<TurnstileContextType | undefined>(
  undefined
);

export function TurnstileProvider({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Check if user is already verified (from sessionStorage)
  useEffect(() => {
    const checkStoredToken = () => {
      try {
        const storedToken = sessionStorage.getItem("turnstile-token");
        const storedVerified = sessionStorage.getItem("turnstile-verified");
        const storedTimestamp = sessionStorage.getItem("turnstile-timestamp");

        if (storedToken && storedVerified === "true" && storedTimestamp) {
          // Check if token is still valid (tokens expire after 5 minutes = 300000ms)
          const tokenAge = Date.now() - parseInt(storedTimestamp, 10);
          if (tokenAge < 300000) {
            // Token is still valid (less than 5 minutes old)
            setToken(storedToken);
            setIsVerified(true);
          } else {
            // Token expired, clear it
            setIsVerified(false);
            setToken(null);
            sessionStorage.removeItem("turnstile-token");
            sessionStorage.removeItem("turnstile-verified");
            sessionStorage.removeItem("turnstile-timestamp");
          }
        } else {
          // No valid stored token, ensure we start unverified
          setIsVerified(false);
          setToken(null);
        }
      } catch (error) {
        console.error("Error checking stored Turnstile token:", error);
        setIsVerified(false);
        setToken(null);
      } finally {
        setInitialized(true);
      }
    };

    // Check immediately
    checkStoredToken();

    // Check every 30 seconds to catch expired tokens
    const interval = setInterval(checkStoredToken, 30000);

    return () => clearInterval(interval);
  }, []);

  const verifyToken = useCallback(async (token: string) => {
    try {
      // Verify token with backend
      const response = await fetch("/api/v1/turnstile/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          setToken(token);
          setIsVerified(true);
          // Store in sessionStorage with timestamp (tokens expire after 5 minutes)
          try {
            sessionStorage.setItem("turnstile-token", token);
            sessionStorage.setItem("turnstile-verified", "true");
            sessionStorage.setItem(
              "turnstile-timestamp",
              Date.now().toString()
            );
          } catch (storageError) {
            console.error(
              "Error storing token in sessionStorage:",
              storageError
            );
          }
        } else {
          console.error("Turnstile verification failed:", data["error-codes"]);
          setIsVerified(false);
          setToken(null);
          sessionStorage.removeItem("turnstile-token");
          sessionStorage.removeItem("turnstile-verified");
          sessionStorage.removeItem("turnstile-timestamp");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Turnstile verification request failed:",
          response.status,
          errorData
        );
        setIsVerified(false);
        setToken(null);
        sessionStorage.removeItem("turnstile-token");
        sessionStorage.removeItem("turnstile-verified");
        sessionStorage.removeItem("turnstile-timestamp");
      }
    } catch (error) {
      console.error("Turnstile verification error:", error);
      setIsVerified(false);
      setToken(null);
    }
  }, []);

  const resetVerification = useCallback(() => {
    setIsVerified(false);
    setToken(null);
    sessionStorage.removeItem("turnstile-token");
    sessionStorage.removeItem("turnstile-verified");
    sessionStorage.removeItem("turnstile-timestamp");
  }, []);

  // Don't render children until initialized to prevent flash of unverified content
  if (!initialized) {
    return null;
  }

  return (
    <TurnstileContext.Provider
      value={{
        isVerified,
        verifyToken,
        resetVerification,
        token,
      }}
    >
      {children}
    </TurnstileContext.Provider>
  );
}

export function useTurnstile() {
  const context = useContext(TurnstileContext);
  if (context === undefined) {
    throw new Error("useTurnstile must be used within a TurnstileProvider");
  }
  return context;
}
