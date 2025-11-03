"use client";

import { useEffect, useRef } from "react";

interface TestnetBannerProps {
  isVisible?: boolean;
  network?: string;
}

export function TestnetBanner({ isVisible = true, network }: TestnetBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !bannerRef.current) {
      // When banner is hidden, set to 0 so header uses original spacing
      document.documentElement.style.setProperty("--testnet-banner-height", "0px");
      return;
    }

    const updateBannerHeight = () => {
      if (bannerRef.current) {
        const height = bannerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--testnet-banner-height",
          `${height}px`
        );
      }
    };

    // Set initial height
    updateBannerHeight();

    // Update on window resize (in case text wraps)
    window.addEventListener("resize", updateBannerHeight);

    // Also use ResizeObserver for more accurate tracking
    const resizeObserver = new ResizeObserver(updateBannerHeight);
    if (bannerRef.current) {
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateBannerHeight);
      resizeObserver.disconnect();
      document.documentElement.style.setProperty("--testnet-banner-height", "0px");
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed top-0 left-0 w-full bg-gradient-to-r from-indigo-100 via-purple-100 to-indigo-100 dark:from-indigo-900 dark:via-purple-900 dark:to-indigo-900 border-b border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-200 text-center text-sm font-semibold py-1 px-2 shadow z-60 transition-colors duration-200"
    >
      ⚠️ This is the <span className="font-bold">{network || "testnet"}</span> version.
      Everything might break or be reset at any time. ⚠️
    </div>
  );
}

