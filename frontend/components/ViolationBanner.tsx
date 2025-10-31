"use client";

interface ViolationBannerProps {
  isVisible: boolean;
}

export function ViolationBanner({ isVisible }: ViolationBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-6 mb-8 shadow-lg">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-8 w-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-red-800">
            Raffle Hidden Due to Terms Violation
          </h3>
          <p className="text-red-700 mt-1">
            This raffle has been hidden by administrators due to violation of
            terms and conditions. The raffle data and functionality remain
            accessible for transparency purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
