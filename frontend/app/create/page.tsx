"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { PACKAGE_ID, MODULE } from "@/lib/constants";
import { useWallet } from "@/lib/context/WalletContext";
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions";
import { useAdminConfig } from "@/lib/hooks/useAdminConfig";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { ImageUpload } from "@/components/ImageUpload";
import { useTheme } from "@/lib/context/ThemeContext";

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

function formatTimeForDisplay(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes} UTC`;
}

function blockchainTimeToISOString(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isoStringToBlockchainTime(isoString: string) {
  const [datePart, timePart] = isoString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes);
}

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

const quickMaxTicketsOptions = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "5", value: "5" },
  { label: "10", value: "10" },
  { label: "20", value: "20" },
  { label: "50", value: "50" },
];

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

// Helper function to validate Sui address
function validateSuiAddress(address: string): string | null {
  if (!address.trim()) {
    return "Address is required";
  }

  if (!address.startsWith("0x")) {
    return "Address must start with 0x";
  }

  if (
    address ===
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) {
    return "Cannot use zero address";
  }

  if (address.length !== 66) {
    return "Invalid address length";
  }

  const hexPart = address.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    return "Address contains invalid characters";
  }

  return null;
}

export default function CreateRaffle() {
  const router = useRouter();
  const { address: currentAccount, isConnected } = useWallet();
  const suiClient = useSuiClient();
  const { isAdminOrController, creationFee } = useAdminPermissions();
  const { data: config } = useAdminConfig();
  const txService = useTransactions();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(
    null
  );
  const [currentBlockchainTime, setCurrentBlockchainTime] = useState<number>(0);
  const [isPriceUpdating, setIsPriceUpdating] = useState(false);
  const [organizerAddressError, setOrganizerAddressError] = useState<
    string | null
  >(null);

  const minTicketPriceSUI = config?.minTicketPrice
    ? config.minTicketPrice / 1_000_000_000
    : 0.001;

  const quickPriceOptions = useMemo(() => {
    const baseOptions = [
      minTicketPriceSUI,
      minTicketPriceSUI * 10,
      minTicketPriceSUI * 50,
      minTicketPriceSUI * 100,
    ].filter((price) => price <= 1000);

    return baseOptions.map((price) => ({
      label: `${parseFloat(price.toFixed(6)).toString()} SUI`,
      value: price.toString(),
    }));
  }, [minTicketPriceSUI]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageCid: "",
    startTime: "",
    endTime: "",
    ticketPrice: "",
    maxTicketsPerAddress: "",
    organizerAddress: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPriceUpdating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.ticketPrice]);

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

  const handleOrganizerAddressChange = (address: string) => {
    setFormData({ ...formData, organizerAddress: address });

    if (address.trim()) {
      const validationError = validateSuiAddress(address);
      setOrganizerAddressError(validationError);
    } else {
      setOrganizerAddressError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !currentAccount) return;

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
    const addressError = validateSuiAddress(formData.organizerAddress);
    if (addressError) {
      setError(addressError);
      return;
    }

    const ticketPriceValue = Number(formData.ticketPrice);
    if (ticketPriceValue < minTicketPriceSUI) {
      setError(
        `Ticket price must be at least ${minTicketPriceSUI.toFixed(3)} SUI`
      );
      return;
    }

    setIsCreating(true);
    setError(null);
    setTransactionDigest(null);

    try {
      const startTime = isoStringToBlockchainTime(formData.startTime);
      const endTime = isoStringToBlockchainTime(formData.endTime);
      const maxTicketsPerAddress = Number(formData.maxTicketsPerAddress);

      const error = validateEndTime(startTime, endTime, currentBlockchainTime);
      if (error) {
        throw new Error(error);
      }

      if (endTime - startTime < 60 * 1000) {
        throw new Error("Raffle must last at least 1 minute");
      }

      const result = await txService.createRaffle(
        {
          name: formData.name,
          description: formData.description,
          imageCid: formData.imageCid,
          startTime,
          endTime,
          ticketPrice: String(Number(formData.ticketPrice)),
          maxTicketsPerAddress: String(maxTicketsPerAddress),
          creationFeeMist: creationFee ?? 0,
          isAdminOrController: Boolean(isAdminOrController),
        },
        formData.organizerAddress
      );

      setTransactionDigest(result.digest);

      let raffleId: string | null = null;
      try {
        const txDetails = await suiClient.getTransactionBlock({
          digest: result.digest,
          options: {
            showEvents: true,
          },
        });

        if (txDetails.events) {
          const raffleCreatedEvent = txDetails.events.find(
            (event) => event.type === `${PACKAGE_ID}::${MODULE}::RaffleCreated`
          );
          if (raffleCreatedEvent && raffleCreatedEvent.parsedJson) {
            raffleId = (raffleCreatedEvent.parsedJson as { raffle_id: string })
              .raffle_id;
          }
        }
      } catch (error) {
        console.error("Failed to fetch transaction details:", error);
      }

      setTimeout(() => {
        if (raffleId) {
          router.push(`/raffle/${raffleId}`);
        } else {
          router.push("/explore");
        }
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a202c] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 mb-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg transition-colors duration-200">
                🎲
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                  Create New Raffle
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-200">
                  Set up your raffle parameters below
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Information Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
                <span className="text-green-500 dark:text-green-400">📝</span>
                General Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200"
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
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-white dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="Enter raffle name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200"
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
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-white dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="Describe your raffle..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
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
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 transition-colors duration-200">
                <span className="text-blue-500 dark:text-blue-400">⏰</span>
                Current Blockchain Time
              </h2>
              <p className="text-blue-800 dark:text-blue-300 font-mono transition-colors duration-200">
                {formatTimeForDisplay(currentBlockchainTime)}
              </p>
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 transition-colors duration-200">
                ⚠️ All times are in blockchain time (UTC)
              </p>
            </div>

            {/* Time Settings */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
                <span className="text-purple-500 dark:text-purple-400">⏰</span>
                Time Settings
              </h2>

              {/* Start Time Section */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 mb-4 transition-colors duration-200">
                  Start Time
                </h3>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2 flex-wrap">
                    {quickStartOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleQuickStart(option.value)}
                        className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors duration-200"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {mounted ? (
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
                          className: "bg-white dark:bg-[#1a202c]",
                          sx: {
                            "& .MuiInputBase-input": {
                              color: isDark ? "#ffffff" : "#111827",
                            },
                            "& .MuiInputLabel-root": {
                              color: isDark
                                ? "rgba(255, 255, 255, 0.7)"
                                : "rgba(0, 0, 0, 0.6)",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: isDark
                                ? "rgba(255, 255, 255, 0.23)"
                                : "rgba(0, 0, 0, 0.23)",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: isDark
                                ? "rgba(255, 255, 255, 0.87)"
                                : "rgba(0, 0, 0, 0.87)",
                            },
                            "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                              {
                                borderColor: "#6366f1",
                              },
                            "& .MuiInputLabel-root.Mui-focused": {
                              color: "#6366f1",
                            },
                            "& .MuiPickersSectionList-root": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersSectionList-root *": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersInputBase-sectionsContainer": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersInputBase-sectionsContainer *": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                          },
                        },
                        popper: {
                          sx: {
                            "& .MuiPaper-root": {
                              backgroundColor: isDark
                                ? "rgb(45, 55, 72) !important"
                                : "#ffffff",
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersDay-root": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersDay-root:not(.Mui-disabled)": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersDay-root:hover:not(.Mui-disabled)": {
                              backgroundColor: isDark
                                ? "rgba(99, 102, 241, 0.3) !important"
                                : "rgba(0, 0, 0, 0.04)",
                            },
                            "& .MuiPickersDay-root.Mui-selected": {
                              backgroundColor: isDark
                                ? "rgb(99, 102, 241) !important"
                                : "#6366f1",
                              color: "#ffffff !important",
                            },
                            "& .MuiPickersCalendarHeader-root": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersCalendarHeader-labelContainer": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersCalendarHeader-switchViewButton": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersArrowSwitcher-button": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiDayCalendar-weekDayLabel": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                          },
                        },
                      }}
                    />
                  </LocalizationProvider>
                ) : (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Start Time
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg bg-gray-50 dark:bg-[#1a202c] text-gray-500 dark:text-gray-400">
                      Loading...
                    </div>
                  </div>
                )}
                {formData.startTime && (
                  <p className="mt-2 text-sm text-purple-600 dark:text-purple-400 transition-colors duration-200">
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
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 mb-4 transition-colors duration-200">
                  End Time
                </h3>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2 flex-wrap">
                    {quickDurationOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleQuickDuration(option.value)}
                        className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors duration-200"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {mounted ? (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Select End Time"
                      value={
                        formData.endTime
                          ? new Date(
                              isoStringToBlockchainTime(formData.endTime)
                            )
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
                          className: "bg-white dark:bg-[#1a202c]",
                          error: !!error && error.includes("End time"),
                          helperText:
                            error && error.includes("End time")
                              ? error
                              : undefined,
                          sx: {
                            "& .MuiInputBase-input": {
                              color: isDark ? "#ffffff" : "#111827",
                            },
                            "& .MuiInputLabel-root": {
                              color: isDark
                                ? "rgba(255, 255, 255, 0.7)"
                                : "rgba(0, 0, 0, 0.6)",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: isDark
                                ? "rgba(255, 255, 255, 0.23)"
                                : "rgba(0, 0, 0, 0.23)",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: isDark
                                ? "rgba(255, 255, 255, 0.87)"
                                : "rgba(0, 0, 0, 0.87)",
                            },
                            "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                              {
                                borderColor: "#6366f1",
                              },
                            "& .MuiInputLabel-root.Mui-focused": {
                              color: "#6366f1",
                            },
                            "& .MuiPickersSectionList-root": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersSectionList-root *": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersInputBase-sectionsContainer": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersInputBase-sectionsContainer *": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                          },
                        },
                        popper: {
                          sx: {
                            "& .MuiPaper-root": {
                              backgroundColor: isDark
                                ? "rgb(45, 55, 72) !important"
                                : "#ffffff",
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersDay-root": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersDay-root:not(.Mui-disabled)": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersDay-root:hover:not(.Mui-disabled)": {
                              backgroundColor: isDark
                                ? "rgba(99, 102, 241, 0.3) !important"
                                : "rgba(0, 0, 0, 0.04)",
                            },
                            "& .MuiPickersDay-root.Mui-selected": {
                              backgroundColor: isDark
                                ? "rgb(99, 102, 241) !important"
                                : "#6366f1",
                              color: "#ffffff !important",
                            },
                            "& .MuiPickersCalendarHeader-root": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersCalendarHeader-labelContainer": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersCalendarHeader-switchViewButton": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiPickersArrowSwitcher-button": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                            "& .MuiDayCalendar-weekDayLabel": {
                              color: isDark ? "#ffffff !important" : "#111827",
                            },
                          },
                        },
                      }}
                    />
                  </LocalizationProvider>
                ) : (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select End Time
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg bg-gray-50 dark:bg-[#1a202c] text-gray-500 dark:text-gray-400">
                      Loading...
                    </div>
                  </div>
                )}
                {formData.startTime && formData.endTime && (
                  <p className="mt-2 text-sm text-purple-600 dark:text-purple-400 transition-colors duration-200">
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
                <span className="text-indigo-500 dark:text-indigo-400">🎫</span>
                Ticket Settings
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 transition-colors duration-200">
                  <label
                    htmlFor="ticketPrice"
                    className="block text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-2 transition-colors duration-200"
                  >
                    Ticket Price (SUI)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="ticketPrice"
                      required
                      min={minTicketPriceSUI}
                      step="0.001"
                      value={formData.ticketPrice}
                      onChange={(e) => {
                        setIsPriceUpdating(true);
                        setFormData({
                          ...formData,
                          ticketPrice: e.target.value,
                        });
                      }}
                      className="w-full px-4 py-3 border border-indigo-200 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-white dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200"
                    />
                    {isPriceUpdating && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg
                          className="animate-spin h-5 w-5 text-indigo-500 dark:text-indigo-400"
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
                  <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 mb-4 transition-colors duration-200">
                    Minimum price:{" "}
                    {parseFloat(minTicketPriceSUI.toFixed(6)).toString()} SUI
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {quickPriceOptions.map((option) => (
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
                        className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors duration-200"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 transition-colors duration-200">
                  <label
                    htmlFor="maxTicketsPerAddress"
                    className="block text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-2 transition-colors duration-200"
                  >
                    Max Tickets Per Address
                  </label>
                  <input
                    type="number"
                    id="maxTicketsPerAddress"
                    required
                    min="1"
                    max="50"
                    value={formData.maxTicketsPerAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxTicketsPerAddress: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-indigo-200 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-white dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200"
                  />
                  <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 mb-4 transition-colors duration-200">
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
                            maxTicketsPerAddress: option.value,
                          })
                        }
                        className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors duration-200"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Organizer Address Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
                <span className="text-purple-500 dark:text-purple-400">👤</span>
                Organizer Settings
              </h2>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 mb-4 transition-colors duration-200">
                  Organizer Address
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-400 mb-4 transition-colors duration-200">
                  This address will receive the organizer earnings (10% of total
                  prize pool)
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      id="organizerAddress"
                      required
                      value={formData.organizerAddress}
                      onChange={(e) =>
                        handleOrganizerAddressChange(e.target.value)
                      }
                      className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 text-base sm:text-lg bg-white dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200 ${
                        organizerAddressError
                          ? "border-red-300 dark:border-red-700 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400"
                          : "border-purple-200 dark:border-purple-700"
                      }`}
                      placeholder="Enter organizer address (0x...)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const address = currentAccount || "";
                        handleOrganizerAddressChange(address);
                      }}
                      disabled={!isConnected || !currentAccount}
                      className="px-4 py-3 bg-purple-500 dark:bg-purple-600 text-white rounded-lg hover:bg-purple-600 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                    >
                      Use Current Account
                    </button>
                  </div>

                  {organizerAddressError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 transition-colors duration-200">
                      <p className="text-sm text-red-600 dark:text-red-400 transition-colors duration-200">
                        <span className="font-medium">Error:</span>{" "}
                        {organizerAddressError}
                      </p>
                    </div>
                  )}

                  {formData.organizerAddress && !organizerAddressError && (
                    <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800 transition-colors duration-200">
                      <p className="text-sm text-purple-800 dark:text-purple-300 transition-colors duration-200">
                        <span className="font-medium">Organizer:</span>{" "}
                        <span className="break-all">
                          {formData.organizerAddress}
                        </span>
                      </p>
                      {formData.organizerAddress === currentAccount && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 transition-colors duration-200">
                          ✓ This is your current wallet address
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prize Distribution Info */}
            <div className="bg-white dark:bg-[#2d3748] rounded-xl p-6 border border-gray-200 dark:border-[#4a5568] shadow-sm dark:shadow-black/20 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 transition-colors duration-200">
                <span className="text-indigo-500 dark:text-indigo-400">🏆</span>
                {formData.ticketPrice
                  ? "Prize Distribution and Winning Estimations"
                  : "Prize Distribution"}
              </h2>
              {!formData.ticketPrice ? (
                <div className="space-y-3">
                  {[
                    {
                      position: "1st Place",
                      percentage: 50,
                      color: "text-gray-700 dark:text-gray-300",
                    },
                    {
                      position: "2nd Place",
                      percentage: 25,
                      color: "text-gray-700 dark:text-gray-300",
                    },
                    {
                      position: "3rd Place",
                      percentage: 10,
                      color: "text-gray-700 dark:text-gray-300",
                    },
                    {
                      position: "Organizer",
                      percentage: 10,
                      color: "text-gray-700 dark:text-gray-300",
                    },
                    {
                      position: "Protocol Fee",
                      percentage: 5,
                      color: "text-gray-700 dark:text-gray-300",
                    },
                  ].map((row) => (
                    <div
                      key={row.position}
                      className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#4a5568] last:border-0 transition-colors duration-200"
                    >
                      <span
                        className={`${row.color} transition-colors duration-200`}
                      >
                        {row.position}
                      </span>
                      <span
                        className={`font-semibold ${row.color} transition-colors duration-200`}
                      >
                        {row.percentage}%
                      </span>
                    </div>
                  ))}
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                    * Enter a ticket price to see estimated prize distributions
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 dark:border-[#4a5568] transition-colors duration-200">
                        <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1a202c] transition-colors duration-200">
                          Position
                        </th>
                        <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1a202c] transition-colors duration-200">
                          Percentage
                        </th>
                        <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1a202c] transition-colors duration-200">
                          100 Tickets
                        </th>
                        <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1a202c] transition-colors duration-200">
                          500 Tickets
                        </th>
                        <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1a202c] transition-colors duration-200">
                          1000 Tickets
                        </th>
                        <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1a202c] transition-colors duration-200">
                          5000 Tickets
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#4a5568] transition-colors duration-200">
                      {[
                        { position: "1st Place", percentage: 50 },
                        { position: "2nd Place", percentage: 25 },
                        { position: "3rd Place", percentage: 10 },
                        { position: "Organizer", percentage: 10 },
                        { position: "Protocol Fee", percentage: 5 },
                      ].map((row) => (
                        <tr
                          key={row.position}
                          className="hover:bg-gray-50 dark:hover:bg-[#1a202c]/50 transition-colors duration-200 bg-white dark:bg-[#2d3748] even:bg-gray-50/50 dark:even:bg-[#1a202c]/30"
                        >
                          <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200">
                            {row.position}
                          </td>
                          <td className="py-4 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white transition-colors duration-200">
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
                                className="py-4 px-4 text-sm text-right text-gray-700 dark:text-gray-300 font-mono transition-colors duration-200"
                              >
                                {parseFloat(amount.toFixed(6)).toString()} SUI
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="bg-gray-100 dark:bg-[#1a202c] border-t-2 border-gray-300 dark:border-[#4a5568] font-semibold transition-colors duration-200">
                        <td className="py-4 px-4 text-sm text-gray-900 dark:text-white transition-colors duration-200">
                          Total Prize Pool
                        </td>
                        <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white transition-colors duration-200">
                          100%
                        </td>
                        {[100, 500, 1000, 5000].map((tickets) => {
                          const ticketPrice = Number(formData.ticketPrice) || 0;
                          const totalPrize = tickets * ticketPrice;
                          return (
                            <td
                              key={tickets}
                              className="py-4 px-4 text-sm text-right text-indigo-600 dark:text-indigo-400 font-semibold font-mono transition-colors duration-200"
                            >
                              {parseFloat(totalPrize.toFixed(6)).toString()} SUI
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200 italic">
                    * Estimated distributions are calculated based on the
                    current ticket price of {formData.ticketPrice} SUI
                  </p>
                </div>
              )}
            </div>

            {/* Creation Fee Info */}
            {creationFee !== undefined && creationFee > 0 && (
              <div className="bg-gray-50 dark:bg-[#1a202c] rounded-xl p-4 border border-gray-200 dark:border-[#4a5568] transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">
                    Creation fee:{" "}
                    <span className="font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                      {parseFloat(
                        (creationFee / 1_000_000_000).toFixed(6)
                      ).toString()}{" "}
                      SUI
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreating || !isConnected || !!organizerAddressError}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-500 dark:hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-lg"
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
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors duration-200">
                <p className="text-red-600 dark:text-red-400 transition-colors duration-200">
                  {error}
                </p>
              </div>
            )}

            {transactionDigest && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg transition-colors duration-200">
                <p className="text-green-600 dark:text-green-400 font-medium mb-2 transition-colors duration-200">
                  🎉 Raffle created successfully!
                </p>
                <p className="text-green-600 dark:text-green-400 mb-2 transition-colors duration-200">
                  Redirecting to your raffle page...
                </p>
                <a
                  href={`https://suiexplorer.com/txblock/${transactionDigest}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline inline-flex items-center transition-colors duration-200"
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
