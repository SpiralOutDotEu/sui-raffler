"use client";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/50 z-50 flex items-center justify-center p-4 transition-colors duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-[#2d3748] rounded-2xl max-w-2xl w-full p-4 sm:p-6 md:p-8 relative shadow-xl dark:shadow-black/30 border border-gray-200 dark:border-[#4a5568] transition-colors duration-200 my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 bg-white dark:bg-[#2d3748] rounded-full p-1 shadow-sm"
          aria-label="Close modal"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 pr-10 transition-colors duration-200">
          How SUI-Raffler Works
        </h2>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold flex-shrink-0 transition-colors duration-200">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                Create or Join
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Create your own raffle with custom settings or join existing
                ones. Set ticket prices, duration, and maximum tickets per
                purchase.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold flex-shrink-0 transition-colors duration-200">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                Buy Tickets
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Purchase tickets using SUI tokens. The more tickets you buy, the
                higher your chances of winning!
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold flex-shrink-0 transition-colors duration-200">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                Wait for Results
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Once the raffle ends, winners are automatically selected using
                Sui&apos;s on-chain randomness. The selection is performed by
                smart contracts, ensuring complete transparency and fairness. No
                human intervention is possible!
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold flex-shrink-0 transition-colors duration-200">
              4
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                Claim Prizes
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                Winners can claim their prizes directly through smart contracts.
                The prize distribution is automatic and transparent:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">
                <li>1st Place: 50% of the prize pool</li>
                <li>2nd Place: 25% of the prize pool</li>
                <li>3rd Place: 10% of the prize pool</li>
                <li>Organizer: 10% of the prize pool</li>
                <li>Protocol Fee: 5% of the prize pool</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex justify-end sticky bottom-0 bg-white dark:bg-[#2d3748] pt-4 pb-2 -mb-2">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-500 dark:hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 w-full sm:w-auto"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
