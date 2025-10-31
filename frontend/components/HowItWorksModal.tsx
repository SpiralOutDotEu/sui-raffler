"use client";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-white/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
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

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          How SUI-Raffler Works
        </h2>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Create or Join
              </h3>
              <p className="text-gray-600">
                Create your own raffle with custom settings or join existing
                ones. Set ticket prices, duration, and maximum tickets per
                purchase.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Buy Tickets
              </h3>
              <p className="text-gray-600">
                Purchase tickets using SUI tokens. The more tickets you buy, the
                higher your chances of winning!
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Wait for Results
              </h3>
              <p className="text-gray-600">
                Once the raffle ends, winners are automatically selected using
                Sui&apos;s on-chain randomness. The selection is performed by
                smart contracts, ensuring complete transparency and fairness. No
                human intervention is possible!
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">
              4
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Claim Prizes
              </h3>
              <p className="text-gray-600">
                Winners can claim their prizes directly through smart contracts.
                The prize distribution is automatic and transparent:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600">
                <li>1st Place: 50% of the prize pool</li>
                <li>2nd Place: 25% of the prize pool</li>
                <li>3rd Place: 10% of the prize pool</li>
                <li>Organizer: 10% of the prize pool</li>
                <li>Protocol Fee: 5% of the prize pool</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
