"use client";

import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { PACKAGE_ID, MODULE, CONFIG_OBJECT_ID } from "../../constants";
import { Transaction } from "@mysten/sui/transactions";
import { useWallet } from "../context/WalletContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import Image from "next/image";

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

// Quick ticket price options
const quickTicketPriceOptions = [
  { label: "0.1 SUI", value: "0.1" },
  { label: "1 SUI", value: "1" },
  { label: "5 SUI", value: "5" },
  { label: "10 SUI", value: "10" },
];

// Quick max tickets options
const quickMaxTicketsOptions = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "5", value: "5" },
  { label: "10", value: "10" },
  { label: "20", value: "20" },
  { label: "50", value: "50" },
];

// Add validation helper function
function validateEndTime(
  startTime: number,
  endTime: number,
  currentBlockchainTime: number
): string | null {
  if (endTime <= startTime) {
    return "End time must be after start time";
  }
  if (endTime <= currentBlockchainTime) {
    return "End time must be in the future";
  }
  return null;
}

// Image Upload Component
function ImageUpload({
  onImageUpload,
}: {
  onImageUpload: (cid: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setError("Image size must be less than 2MB");
        return;
      }

      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/v1/ipfs/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload image");
        }

        const result = await response.json();
        onImageUpload(result.cid);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [onImageUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      uploadFile(file);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      setError(null);

      const file = event.dataTransfer.files[0];
      if (!file) return;

      uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
          isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
        } transition-colors`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <svg
              className="animate-spin h-8 w-8 text-indigo-500"
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
            <p className="text-indigo-600">Uploading...</p>
          </div>
        ) : preview ? (
          <div className="space-y-2">
            <Image
              src={preview}
              alt="Preview"
              width={300}
              height={300}
              className="max-w-full h-auto"
            />
            <p className="text-sm text-gray-500">
              Click or drag to change image
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-500">
              Drag and drop an image here, or click to select
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, GIF up to 2MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function CreateRaffle() {
  const router = useRouter();
  const { address: currentAccount, isConnected } = useWallet();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(
    null
  );
  const [currentBlockchainTime, setCurrentBlockchainTime] = useState<number>(0);
  const [isPriceUpdating, setIsPriceUpdating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageCid: "",
    startTime: "",
    endTime: "",
    ticketPrice: "",
    maxTicketsPerPurchase: "",
  });

  // Debounced price update handler
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPriceUpdating(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [formData.ticketPrice]);

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
    if (!isConnected || !currentAccount) return;

    // Validate required fields
    if (!formData.name.trim()) {
      setError("Please enter a raffle name");
      return;
    }
    if (!formData.description.trim()) {
      setError("Please enter a raffle description");
      return;
    }
    if (!formData.imageCid) {
      setError("Please upload a raffle image");
      return;
    }

    setIsCreating(true);
    setError(null);
    setTransactionDigest(null);

    try {
      // Convert form data to required format using blockchain time
      const startTime = isoStringToBlockchainTime(formData.startTime);
      const endTime = isoStringToBlockchainTime(formData.endTime);
      const ticketPrice = Math.floor(Number(formData.ticketPrice) * 1e9); // Convert SUI to MIST
      const maxTicketsPerPurchase = Number(formData.maxTicketsPerPurchase);

      // Validate times
      const error = validateEndTime(startTime, endTime, currentBlockchainTime);
      if (error) {
        throw new Error(error);
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
          tx.pure.string(formData.name),
          tx.pure.string(formData.description),
          tx.pure.string(formData.imageCid),
          tx.pure.u64(startTime),
          tx.pure.u64(endTime),
          tx.pure.u64(ticketPrice),
          tx.pure.u64(maxTicketsPerPurchase),
          tx.pure.address(currentAccount),
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
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Information Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-green-500">📝</span>
                General Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Raffle Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    placeholder="Enter raffle name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    placeholder="Describe your raffle..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raffle Image
                  </label>
                  <ImageUpload
                    onImageUpload={(cid) =>
                      setFormData({ ...formData, imageCid: cid })
                    }
                  />
                </div>
              </div>
            </div>

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
                <h3 className="text-lg font-semibold text-purple-800 mb-4">
                  Start Time
                </h3>
                <div className="flex justify-between items-center mb-4">
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
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Select Start Time"
                    value={
                      formData.startTime
                        ? new Date(
                            isoStringToBlockchainTime(formData.startTime)
                          )
                        : null
                    }
                    onChange={(newValue) => {
                      if (newValue) {
                        setFormData({
                          ...formData,
                          startTime: blockchainTimeToISOString(
                            newValue.getTime()
                          ),
                        });
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        className: "bg-white",
                      },
                    }}
                  />
                </LocalizationProvider>
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
                <h3 className="text-lg font-semibold text-purple-800 mb-4">
                  End Time
                </h3>
                <div className="flex justify-between items-center mb-4">
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
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Select End Time"
                    value={
                      formData.endTime
                        ? new Date(isoStringToBlockchainTime(formData.endTime))
                        : null
                    }
                    onChange={(newValue) => {
                      if (newValue) {
                        const newEndTime = newValue.getTime();
                        const startTime = formData.startTime
                          ? isoStringToBlockchainTime(formData.startTime)
                          : currentBlockchainTime;
                        const error = validateEndTime(
                          startTime,
                          newEndTime,
                          currentBlockchainTime
                        );

                        if (error) {
                          setError(error);
                          return;
                        }

                        setFormData({
                          ...formData,
                          endTime: blockchainTimeToISOString(newEndTime),
                        });
                        setError(null);
                      }
                    }}
                    minDateTime={
                      formData.startTime
                        ? new Date(
                            isoStringToBlockchainTime(formData.startTime)
                          )
                        : new Date(currentBlockchainTime)
                    }
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        className: "bg-white",
                        error: !!error && error.includes("End time"),
                        helperText:
                          error && error.includes("End time")
                            ? error
                            : undefined,
                      },
                    }}
                  />
                </LocalizationProvider>
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
                  <div className="relative">
                    <input
                      type="number"
                      id="ticketPrice"
                      required
                      min="0.001"
                      step="0.001"
                      value={formData.ticketPrice}
                      onChange={(e) => {
                        setIsPriceUpdating(true);
                        setFormData({
                          ...formData,
                          ticketPrice: e.target.value,
                        });
                      }}
                      className="w-full px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-white"
                    />
                    {isPriceUpdating && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg
                          className="animate-spin h-5 w-5 text-indigo-500"
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
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-indigo-600 mb-4">
                    Minimum price: 0.001 SUI
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {quickTicketPriceOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          setIsPriceUpdating(true);
                          setFormData({
                            ...formData,
                            ticketPrice: option.value,
                          });
                        }}
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
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
                    max="50"
                    value={formData.maxTicketsPerPurchase}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxTicketsPerPurchase: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-white"
                  />
                  <p className="mt-2 text-sm text-indigo-600 mb-4">
                    Maximum possible: 50
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {quickMaxTicketsOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            maxTicketsPerPurchase: option.value,
                          })
                        }
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Prize Distribution Info */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-yellow-500">🏆</span>
                Prize Distribution
              </h2>
              {!formData.ticketPrice ? (
                <div className="space-y-3">
                  {[
                    { position: "1st Place", percentage: 50 },
                    { position: "2nd Place", percentage: 25 },
                    { position: "3rd Place", percentage: 10 },
                    { position: "Organizer", percentage: 10 },
                    { position: "Protocol Fee", percentage: 5 },
                  ].map((row) => (
                    <div
                      key={row.position}
                      className="flex justify-between items-center"
                    >
                      <span className="text-yellow-800">{row.position}</span>
                      <span className="font-semibold text-yellow-800">
                        {row.percentage}%
                      </span>
                    </div>
                  ))}
                  <p className="mt-4 text-sm text-yellow-700">
                    * Enter a ticket price to see estimated prize distributions
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-yellow-200">
                        <th className="text-left py-3 px-4 text-yellow-800 font-semibold">
                          Position
                        </th>
                        <th className="text-right py-3 px-4 text-yellow-800 font-semibold">
                          Percentage
                        </th>
                        <th className="text-right py-3 px-4 text-yellow-800 font-semibold">
                          100 Tickets
                        </th>
                        <th className="text-right py-3 px-4 text-yellow-800 font-semibold">
                          500 Tickets
                        </th>
                        <th className="text-right py-3 px-4 text-yellow-800 font-semibold">
                          1000 Tickets
                        </th>
                        <th className="text-right py-3 px-4 text-yellow-800 font-semibold">
                          5000 Tickets
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { position: "1st Place", percentage: 50 },
                        { position: "2nd Place", percentage: 25 },
                        { position: "3rd Place", percentage: 10 },
                        { position: "Organizer", percentage: 10 },
                        { position: "Protocol Fee", percentage: 5 },
                      ].map((row) => (
                        <tr
                          key={row.position}
                          className="border-b border-yellow-100"
                        >
                          <td className="py-3 px-4 text-yellow-800">
                            {row.position}
                          </td>
                          <td className="py-3 px-4 text-right text-yellow-800 font-semibold">
                            {row.percentage}%
                          </td>
                          {[100, 500, 1000, 5000].map((tickets) => {
                            const ticketPrice =
                              Number(formData.ticketPrice) || 0;
                            const totalPrize = tickets * ticketPrice;
                            const amount = (totalPrize * row.percentage) / 100;
                            return (
                              <td
                                key={tickets}
                                className="py-3 px-4 text-right text-yellow-800"
                              >
                                {amount.toFixed(2)} SUI
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="bg-yellow-100/50">
                        <td className="py-3 px-4 text-yellow-800 font-semibold">
                          Total Prize Pool
                        </td>
                        <td className="py-3 px-4 text-right text-yellow-800 font-semibold">
                          100%
                        </td>
                        {[100, 500, 1000, 5000].map((tickets) => {
                          const ticketPrice = Number(formData.ticketPrice) || 0;
                          const totalPrize = tickets * ticketPrice;
                          return (
                            <td
                              key={tickets}
                              className="py-3 px-4 text-right text-yellow-800 font-semibold"
                            >
                              {totalPrize.toFixed(2)} SUI
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-4 text-sm text-yellow-700">
                    * Estimated distributions are calculated based on the
                    current ticket price of {formData.ticketPrice} SUI
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreating || !isConnected}
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
