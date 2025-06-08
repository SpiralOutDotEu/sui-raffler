"use client";

import {
  useSuiClient,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  ConnectButton,
} from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PACKAGE_ID, MODULE, CONFIG_OBJECT_ID } from "../../constants";
import { Transaction } from "@mysten/sui/transactions";

// Helper function to format relative time
function formatRelativeTime(target: number, currentTime: number) {
  const diff = target - currentTime;
  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  const units = [
    { label: "year", ms: 1000 * 60 * 60 * 24 * 365 },
    { label: "month", ms: 1000 * 60 * 60 * 24 * 30 },
    { label: "day", ms: 1000 * 60 * 60 * 24 },
    { label: "hour", ms: 1000 * 60 * 60 },
    { label: "minute", ms: 1000 * 60 },
  ];

  for (const unit of units) {
    const value = Math.floor(absDiff / unit.ms);
    if (value > 0) {
      return isFuture
        ? `in ${value} ${unit.label}${value > 1 ? "s" : ""}`
        : `${value} ${unit.label}${value > 1 ? "s" : ""} ago`;
    }
  }
  return isFuture ? "in a moment" : "just now";
}

// Helper function to format duration
function formatDuration(start: number, end: number) {
  const duration = end - start;
  const units = [
    { label: "year", ms: 1000 * 60 * 60 * 24 * 365 },
    { label: "month", ms: 1000 * 60 * 60 * 24 * 30 },
    { label: "day", ms: 1000 * 60 * 60 * 24 },
    { label: "hour", ms: 1000 * 60 * 60 },
    { label: "minute", ms: 1000 * 60 },
  ];

  for (const unit of units) {
    const value = Math.floor(duration / unit.ms);
    if (value > 0) {
      return `${value} ${unit.label}${value > 1 ? "s" : ""}`;
    }
  }
  return "less than a minute";
}

// Helper function to format time for display - using blockchain time directly
function formatTimeForDisplay(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes} UTC`;
}

// Helper function to convert blockchain timestamp to ISO string for input
function blockchainTimeToISOString(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper function to convert ISO string to blockchain timestamp
function isoStringToBlockchainTime(isoString: string) {
  const [datePart, timePart] = isoString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes);
}

// Quick time options
const quickStartOptions = [
  { label: "Now", value: 0 },
  { label: "In 1 hour", value: 60 * 60 * 1000 },
  { label: "In 3 hours", value: 3 * 60 * 60 * 1000 },
  { label: "Tomorrow", value: 24 * 60 * 60 * 1000 },
  { label: "In 3 days", value: 3 * 24 * 60 * 60 * 1000 },
];

const quickDurationOptions = [
  { label: "1 hour", value: 60 * 60 * 1000 },
  { label: "3 hours", value: 3 * 60 * 60 * 1000 },
  { label: "6 hours", value: 6 * 60 * 60 * 1000 },
  { label: "1 day", value: 24 * 60 * 60 * 1000 },
  { label: "3 days", value: 3 * 24 * 60 * 60 * 1000 },
  { label: "1 week", value: 7 * 24 * 60 * 60 * 1000 },
];

export default function CreateRaffle() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(
    null
  );
  const [currentBlockchainTime, setCurrentBlockchainTime] = useState<number>(0);

  // Form state
  const [formData, setFormData] = useState({
    startTime: "",
    endTime: "",
    ticketPrice: "",
    maxTicketsPerPurchase: "",
  });

  // Update blockchain time every minute
  useEffect(() => {
    const updateBlockchainTime = async () => {
      try {
        const clock = await suiClient.getObject({
          id: "0x6",
          options: { showContent: true },
        });
        if (clock.data?.content?.dataType === "moveObject") {
          const fields = clock.data.content.fields as {
            id: { id: string };
            timestamp_ms: string;
          };
          const timestamp = Number(fields.timestamp_ms);
          setCurrentBlockchainTime(timestamp);
        }
      } catch (err) {
        console.error("Failed to fetch blockchain time:", err);
      }
    };

    updateBlockchainTime();
    const interval = setInterval(updateBlockchainTime, 60000);
    return () => clearInterval(interval);
  }, [suiClient]);

  const handleQuickStart = (offset: number) => {
    const startTime = currentBlockchainTime + offset;
    setFormData((prev) => ({
      ...prev,
      startTime: blockchainTimeToISOString(startTime),
    }));
  };

  const handleQuickDuration = (duration: number) => {
    if (!formData.startTime) return;
    const startTime = isoStringToBlockchainTime(formData.startTime);
    const endTime = startTime + duration;
    setFormData((prev) => ({
      ...prev,
      endTime: blockchainTimeToISOString(endTime),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.address) return;

    setIsCreating(true);
    setError(null);
    setTransactionDigest(null);

    try {
      // Convert form data to required format using blockchain time
      const startTime = isoStringToBlockchainTime(formData.startTime);
      const endTime = isoStringToBlockchainTime(formData.endTime);
      const ticketPrice = Math.floor(Number(formData.ticketPrice) * 1e9); // Convert SUI to MIST
      const maxTicketsPerPurchase = Number(formData.maxTicketsPerPurchase);

      // Validate times against blockchain time
      if (startTime < currentBlockchainTime) {
        throw new Error(
          "Start time must be in the future relative to blockchain time"
        );
      }
      if (endTime <= startTime) {
        throw new Error("End time must be after start time");
      }

      // Ensure minimum duration of 1 minute
      if (endTime - startTime < 60 * 1000) {
        throw new Error("Raffle must last at least 1 minute");
      }

      const tx = new Transaction();

      // Add the create_raffle call
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::create_raffle`,
        arguments: [
          tx.object(CONFIG_OBJECT_ID),
          tx.pure.u64(startTime),
          tx.pure.u64(endTime),
          tx.pure.u64(ticketPrice),
          tx.pure.u64(maxTicketsPerPurchase),
          tx.pure.address(currentAccount.address),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      setTransactionDigest(result.digest);

      // Wait a bit for the transaction to be processed
      setTimeout(() => {
        router.push("/explore");
      }, 2000);
    } catch (err) {
      let errorMessage = "Failed to create raffle";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                🎲
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Create New Raffle
                </h1>
                <p className="text-gray-500 mt-1">
                  Set up your raffle parameters below
                </p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Current Blockchain Time */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-500">⏰</span>
                Current Blockchain Time
              </h2>
              <p className="text-blue-800 font-mono">
                {formatTimeForDisplay(currentBlockchainTime)}
              </p>
              <p className="mt-2 text-sm text-blue-600">
                ⚠️ All times are in blockchain time (UTC)
              </p>
            </div>

            {/* Time Settings */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-500">⏰</span>
                Time Settings
              </h2>

              {/* Start Time Section */}
              <div className="bg-purple-50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <label
                    htmlFor="startTime"
                    className="block text-purple-600 text-sm font-medium"
                  >
                    Start Time
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {quickStartOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleQuickStart(option.value)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  id="startTime"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  min={blockchainTimeToISOString(currentBlockchainTime)}
                  className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg bg-white"
                />
                {formData.startTime && (
                  <p className="mt-2 text-sm text-purple-600">
                    Raffle will start{" "}
                    {formatRelativeTime(
                      isoStringToBlockchainTime(formData.startTime),
                      currentBlockchainTime
                    )}{" "}
                    (
                    {formatTimeForDisplay(
                      isoStringToBlockchainTime(formData.startTime)
                    )}
                    )
                  </p>
                )}
              </div>

              {/* End Time Section */}
              <div className="bg-purple-50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <label
                    htmlFor="endTime"
                    className="block text-purple-600 text-sm font-medium"
                  >
                    End Time
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {quickDurationOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleQuickDuration(option.value)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  id="endTime"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  min={
                    formData.startTime ||
                    blockchainTimeToISOString(currentBlockchainTime)
                  }
                  className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg bg-white"
                />
                {formData.startTime && formData.endTime && (
                  <p className="mt-2 text-sm text-purple-600">
                    Raffle will last for{" "}
                    {formatDuration(
                      isoStringToBlockchainTime(formData.startTime),
                      isoStringToBlockchainTime(formData.endTime)
                    )}{" "}
                    (Ends at{" "}
                    {formatTimeForDisplay(
                      isoStringToBlockchainTime(formData.endTime)
                    )}
                    )
                  </p>
                )}
              </div>
            </div>

            {/* Ticket Settings */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-indigo-500">🎫</span>
                Ticket Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-50 rounded-xl p-6">
                  <label
                    htmlFor="ticketPrice"
                    className="block text-indigo-600 text-sm font-medium mb-2"
                  >
                    Ticket Price (SUI)
                  </label>
                  <input
                    type="number"
                    id="ticketPrice"
                    required
                    min="0.001"
                    step="0.001"
                    value={formData.ticketPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, ticketPrice: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-white"
                  />
                  <p className="mt-2 text-sm text-indigo-600">
                    Minimum price: 0.001 SUI
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-6">
                  <label
                    htmlFor="maxTicketsPerPurchase"
                    className="block text-indigo-600 text-sm font-medium mb-2"
                  >
                    Max Tickets Per Purchase
                  </label>
                  <input
                    type="number"
                    id="maxTicketsPerPurchase"
                    required
                    min="1"
                    value={formData.maxTicketsPerPurchase}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxTicketsPerPurchase: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Prize Distribution Info */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-yellow-500">🏆</span>
                Prize Distribution
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-800">1st Place</span>
                  <span className="font-semibold text-yellow-800">50%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-800">2nd Place</span>
                  <span className="font-semibold text-yellow-800">25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-800">3rd Place</span>
                  <span className="font-semibold text-yellow-800">10%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-800">Organizer</span>
                  <span className="font-semibold text-yellow-800">10%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-800">Protocol Fee</span>
                  <span className="font-semibold text-yellow-800">5%</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreating || !currentAccount}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-lg"
            >
              {isCreating ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Raffle...
                </span>
              ) : (
                "Create Raffle"
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {transactionDigest && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 font-medium mb-2">
                  🎉 Raffle created successfully!
                </p>
                <p className="text-green-600 mb-2">
                  Redirecting to explore page...
                </p>
                <a
                  href={`https://suiexplorer.com/txblock/${transactionDigest}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center"
                >
                  View on Sui Explorer
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
