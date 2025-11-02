"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useResolveSuiNSName } from "@mysten/dapp-kit";
import { ORGANIZER_PERCENTAGE } from "@/lib/constants";
import { useWallet } from "@/lib/context/WalletContext";
import { useRaffle } from "@/lib/hooks/useRaffle";
import { useUserTickets } from "@/lib/hooks/useUserTickets";
import { useRaffleWinners } from "@/lib/hooks/useRaffleWinners";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useUserPurchaseInfo } from "@/lib/hooks/useUserPurchaseInfo";
import { useRaffleReturnState } from "@/lib/hooks/useRaffleReturnState";
import { getRelativeTime, truncateAddress } from "@/lib/utils/formatters";
import { validateTicketAmount } from "@/lib/utils/validators";
import Image from "next/image";
import PausedRaffleModal from "@/components/PausedRaffleModal";
import { ViolationBanner } from "@/components/ViolationBanner";
import { executeRecaptcha } from "@/lib/utils/recaptchaClient";

function calculateQuickTicketOptions(maxTickets: number) {
  const options = [1];

  const quarterTickets = Math.floor(maxTickets * 0.25);
  const halfTickets = Math.floor(maxTickets * 0.5);

  if (quarterTickets > 1) options.push(quarterTickets);
  if (halfTickets > quarterTickets) options.push(halfTickets);
  if (maxTickets !== options[options.length - 1]) {
    options.push(maxTickets);
  }

  return options;
}

export default function RaffleDetail() {
  const { id } = useParams();
  const { data: raffle, isLoading, error } = useRaffle(id as string);
  const { data: winners } = useRaffleWinners(id as string);
  const { data: userPurchaseInfo, isLoading: purchaseInfoLoading } =
    useUserPurchaseInfo(id as string);
  const { data: isInReturnState } = useRaffleReturnState(id as string);
  const { data: organizerSuiName } = useResolveSuiNSName(
    raffle?.organizer || ""
  );

  const isInReturnStateFallback =
    raffle &&
    Date.now() > Number(raffle.end_time) &&
    !raffle.is_released &&
    raffle.tickets_sold < 3;
  const [ticketAmount, setTicketAmount] = useState<number>(1);

  useEffect(() => {
    if (userPurchaseInfo && ticketAmount > userPurchaseInfo.remaining_allowed) {
      setTicketAmount(Math.max(1, userPurchaseInfo.remaining_allowed));
    }
  }, [userPurchaseInfo, ticketAmount]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isClaimingOrganizerShare, setIsClaimingOrganizerShare] =
    useState(false);
  const [isBurningTickets, setIsBurningTickets] = useState(false);
  const [organizerClaimed, setOrganizerClaimed] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(
    null
  );
  const { address: currentAccount, isConnected } = useWallet();
  const transactions = useTransactions();
  const { handleError, handleSuccess } = useNotifications();
  const queryClient = useQueryClient();
  const { data: userTickets = [], isLoading: isLoadingTickets } =
    useUserTickets(id as string, currentAccount);

  useEffect(() => {
    if (raffle) {
      const raffleName = raffle.name || `Raffle #${raffle.id.slice(0, 8)}...`;
      document.title = `${raffleName} | Sui Raffler`;

      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("property", property);
          document.head.appendChild(meta);
        }
        meta.setAttribute("content", content);
      };

      updateMetaTag("og:title", raffleName);
      updateMetaTag(
        "og:description",
        raffle.description || "Join this exciting raffle on Sui Raffler!"
      );
      updateMetaTag("og:url", `https://suiraffler.xyz/raffle/${raffle.id}`);
      if (raffle.image) {
        updateMetaTag("og:image", raffle.image);
      }
    }
  }, [raffle]);

  const quickTicketOptions =
    raffle && userPurchaseInfo
      ? calculateQuickTicketOptions(
          Math.min(
            raffle.max_tickets_per_address,
            userPurchaseInfo.remaining_allowed
          )
        )
      : [1];

  const handleBuyTickets = async () => {
    if (!isConnected || !currentAccount || !raffle) return;

    const validationError = validateTicketAmount(
      ticketAmount,
      raffle.max_tickets_per_address,
      userPurchaseInfo?.purchased_so_far || 0
    );
    if (validationError) {
      setPurchaseError(validationError);
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const result = await transactions.buyTickets(
        raffle.id,
        ticketAmount,
        raffle.ticket_price
      );

      console.log("Buy tickets result:", result);
      setTransactionDigest(result.digest);
      handleSuccess("Tickets purchased successfully!");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      await queryClient.invalidateQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["raffleReturnState", id],
      });
      await queryClient.invalidateQueries({ queryKey: ["winners", id] });
      await queryClient.invalidateQueries({ queryKey: ["raffles"] });
      await queryClient.refetchQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.refetchQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code !== "USER_REJECTED"
      ) {
        console.error("Error buying tickets:", err);
      }
      handleError(err);
      setPurchaseError("Failed to buy tickets. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClaimPrize = async (ticketId: string) => {
    if (!isConnected || !currentAccount || !raffle) return;

    setIsPurchasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const result = await transactions.claimPrize(raffle.id, ticketId);

      setTransactionDigest(result.digest);
      handleSuccess("Prize claimed successfully!");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      await queryClient.invalidateQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["raffleReturnState", id],
      });
      await queryClient.invalidateQueries({ queryKey: ["winners", id] });

      await queryClient.refetchQueries({ queryKey: ["raffle", id] });
      await queryClient.refetchQueries({
        queryKey: ["tickets", id, currentAccount],
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code !== "USER_REJECTED"
      ) {
        console.error("Error claiming prize:", err);
      }
      handleError(err);
      setPurchaseError("Failed to claim prize. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClaimOrganizerShare = async () => {
    if (!isConnected || !currentAccount || !raffle) return;

    setIsClaimingOrganizerShare(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const result = await transactions.claimOrganizerShare(raffle.id);

      setTransactionDigest(result.digest);
      setOrganizerClaimed(true);
      handleSuccess("Successfully claimed organizer share!");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      await queryClient.invalidateQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["raffleReturnState", id],
      });
      await queryClient.invalidateQueries({ queryKey: ["winners", id] });

      await queryClient.refetchQueries({ queryKey: ["raffle", id] });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code !== "USER_REJECTED"
      ) {
        console.error("Error claiming organizer share:", err);
      }
      handleError(err);
      setPurchaseError("Failed to claim organizer share. Please try again.");
    } finally {
      setIsClaimingOrganizerShare(false);
    }
  };

  const handleReturnTicket = async (ticketId: string) => {
    if (!isConnected || !currentAccount || !raffle) return;

    setIsPurchasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const result = await transactions.returnTicket(raffle.id, ticketId);

      setTransactionDigest(result.digest);
      handleSuccess("Ticket returned successfully! You received a refund.");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      await queryClient.invalidateQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["raffleReturnState", id],
      });

      await queryClient.refetchQueries({ queryKey: ["raffle", id] });
      await queryClient.refetchQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.refetchQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code !== "USER_REJECTED"
      ) {
        console.error("Error returning ticket:", err);
      }
      handleError(err);
      setPurchaseError("Failed to return ticket. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBurnTickets = async () => {
    if (!isConnected || !currentAccount || !raffle || !winners) return;

    const winningTicketStrings =
      winners.winningTicketNumbers?.map(String) ?? [];
    const nonWinningTickets = userTickets.filter(
      (ticket) => !winningTicketStrings.includes(String(ticket.ticket_number))
    );

    if (nonWinningTickets.length === 0) {
      handleError(new Error("No non-winning tickets to burn"));
      return;
    }

    setIsBurningTickets(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const ticketIds = nonWinningTickets.map((ticket) => ticket.id);
      const result = await transactions.burnTickets(raffle.id, ticketIds);

      setTransactionDigest(result.digest);
      handleSuccess(
        `Successfully burned ${nonWinningTickets.length} non-winning tickets!`
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      await queryClient.invalidateQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
      await queryClient.invalidateQueries({
        queryKey: ["raffleReturnState", id],
      });

      await queryClient.refetchQueries({ queryKey: ["raffle", id] });
      await queryClient.refetchQueries({
        queryKey: ["tickets", id, currentAccount],
      });
      await queryClient.refetchQueries({
        queryKey: ["userPurchaseInfo", id, currentAccount],
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code !== "USER_REJECTED"
      ) {
        console.error("Error burning tickets:", err);
      }
      handleError(err);
      setPurchaseError("Failed to burn tickets. Please try again.");
    } finally {
      setIsBurningTickets(false);
    }
  };

  const handleReleaseRaffle = async () => {
    if (!raffle) return;

    setIsReleasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const recaptchaToken = await executeRecaptcha("release_raffle");

      const response = await fetch(`/api/v1/release/${raffle.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recaptchaToken }),
      });
      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.details || data.error || "Failed to release raffle";
        console.error("Release raffle error:", errorMessage);
        handleError(new Error(errorMessage));
        return;
      }

      setTransactionDigest(data.digest);
      handleSuccess(
        `Raffle released successfully! View transaction: https://suiexplorer.com/txblock/${data.digest}?network=testnet`
      );

      window.location.reload();
    } catch (error) {
      console.error("Failed to release raffle:", error);
      handleError(
        `Failed to release raffle: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsReleasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors duration-200">
          <p className="text-red-600 dark:text-red-400 transition-colors duration-200">Error loading raffle: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 transition-colors duration-200">
          <p className="text-yellow-600 dark:text-yellow-400 transition-colors duration-200">Raffle not found</p>
        </div>
      </div>
    );
  }

  const isHidden = !raffle.visible;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a202c] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <ViolationBanner isVisible={isHidden} />

        {/* Paused Raffle Modal */}
        <PausedRaffleModal isOpen={raffle.paused} raffleId={raffle.id} />

        {/* Header Section */}
        <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 mb-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Image */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 flex items-center justify-center transition-colors duration-200">
              <div className="w-full max-w-md rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[500px]">
                {isHidden ? (
                  <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 transition-colors duration-200">
                    <div className="text-center">
                      <svg
                        className="h-16 w-16 text-red-400 dark:text-red-500 mx-auto mb-4 transition-colors duration-200"
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
                      <p className="text-red-600 dark:text-red-400 font-medium transition-colors duration-200">Content Hidden</p>
                      <p className="text-red-500 dark:text-red-400 text-sm transition-colors duration-200">
                        Due to Terms Violation
                      </p>
                    </div>
                  </div>
                ) : raffle.image ? (
                  <Image
                    src={raffle.image}
                    alt={raffle.name}
                    width={500}
                    height={500}
                    className="w-full h-auto max-h-[500px] object-contain rounded-lg"
                    unoptimized
                  />
                ) : (
                  <div className="w-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                    <span className="text-6xl">🎟️</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Data */}
            <div className="flex flex-col h-full">
              {/* 1. Title, Description, Status */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 mb-6 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                    {isHidden ? (
                      <span className="text-red-600 dark:text-red-400 transition-colors duration-200">
                        Hidden Raffle #{raffle.id.slice(0, 8)}...
                      </span>
                    ) : (
                      raffle.name || `Raffle #${raffle.id.slice(0, 8)}...`
                    )}
                  </h1>
                  <div className="flex items-center gap-4">
                    {raffle.is_released &&
                      !raffle.organizer_claimed &&
                      !organizerClaimed &&
                      currentAccount === raffle.organizer && (
                        <button
                          onClick={handleClaimOrganizerShare}
                          disabled={isClaimingOrganizerShare}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isClaimingOrganizerShare ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                              Claiming...
                            </span>
                          ) : (
                            `Claim ${
                              (raffle.prize_pool * ORGANIZER_PERCENTAGE) /
                              100 /
                              1e9
                            } SUI as organizer`
                          )}
                        </button>
                      )}
                    <div className="flex items-center gap-4">
                      {raffle.is_released ? (
                        <span className="px-4 py-2 rounded-full font-semibold shadow-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 transition-colors duration-200">
                          Ended
                        </span>
                      ) : isInReturnState || isInReturnStateFallback ? (
                        <span className="px-4 py-2 rounded-full font-semibold shadow-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors duration-200">
                          Return State
                        </span>
                      ) : (
                        <>
                          <span className="px-4 py-2 rounded-full font-semibold shadow-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 transition-colors duration-200">
                            Active
                          </span>
                          {!raffle.is_released &&
                            Date.now() > Number(raffle.end_time) &&
                            raffle.tickets_sold >= 3 && (
                              <button
                                onClick={handleReleaseRaffle}
                                disabled={isReleasing}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isReleasing ? (
                                  <span className="flex items-center">
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                                    Wait... Releasing...
                                  </span>
                                ) : (
                                  "Release Raffle"
                                )}
                              </button>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {isHidden ? (
                  <div className="mt-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors duration-200">
                    <p className="text-red-600 dark:text-red-400 text-lg font-medium transition-colors duration-200">
                      Description hidden due to terms violation
                    </p>
                  </div>
                ) : raffle.description ? (
                  <p className="text-gray-600 dark:text-gray-300 text-lg mt-2 transition-colors duration-200">
                    {raffle.description}
                  </p>
                ) : null}
              </div>

              {/* 2. Middle: Two Columns (Time & Address) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Time Details */}
                <div className="bg-white/70 dark:bg-[#1a202c]/70 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30 transition-colors duration-200">
                  <div>
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium transition-colors duration-200">
                      Start Time
                    </p>
                    <p className="text-lg font-semibold text-purple-900 dark:text-purple-200 transition-colors duration-200">
                      {new Date(Number(raffle.start_time)).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2">
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium transition-colors duration-200">
                      End Time
                    </p>
                    <p className="text-lg font-semibold text-purple-900 dark:text-purple-200 transition-colors duration-200">
                      {new Date(Number(raffle.end_time)).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 transition-colors duration-200">
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium transition-colors duration-200">
                      {Number(raffle.end_time) <= Date.now()
                        ? "Status"
                        : "Time Remaining"}
                    </p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-200 transition-colors duration-200">
                      {Number(raffle.end_time) <= Date.now()
                        ? `Ended ${getRelativeTime(Number(raffle.end_time))}`
                        : getRelativeTime(Number(raffle.end_time))}
                    </p>
                  </div>
                </div>
                {/* Address Details */}
                <div className="bg-white/70 dark:bg-[#1a202c]/70 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/30 flex flex-col gap-4 justify-center transition-colors duration-200">
                  <div>
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium transition-colors duration-200">
                      Created by:
                    </span>
                    <div className="flex items-center gap-2 bg-white dark:bg-[#2d3748] px-3 py-1.5 rounded-lg shadow-sm dark:shadow-black/20 mt-1 transition-colors duration-200">
                      <span className="font-mono text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        {organizerSuiName || truncateAddress(raffle.organizer)}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(raffle.organizer)
                        }
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Copy address"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                      </button>
                      <a
                        href={`https://suiexplorer.com/address/${raffle.organizer}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="View in Explorer"
                      >
                        <svg
                          className="w-4 h-4"
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
                  </div>
                  <div>
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium transition-colors duration-200">
                      Raffle ID:
                    </span>
                    <div className="flex items-center gap-2 bg-white dark:bg-[#2d3748] px-3 py-1.5 rounded-lg shadow-sm dark:shadow-black/20 mt-1 transition-colors duration-200">
                      <span className="font-mono text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        {truncateAddress(raffle.id)}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(raffle.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Copy address"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                      </button>
                      <a
                        href={`https://suiexplorer.com/object/${raffle.id}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="View in Explorer"
                      >
                        <svg
                          className="w-4 h-4"
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
                  </div>
                </div>
              </div>

              {/* 3. Max Return Panel - Full Width */}
              <div className="w-full">
                <div className="relative bg-gradient-to-br from-white via-green-50 to-white dark:from-[#2d3748] dark:via-green-900/20 dark:to-[#2d3748] border-l-4 border-green-400 dark:border-green-600 rounded-xl p-6 shadow-lg dark:shadow-black/20 w-full overflow-hidden transition-colors duration-200">
                  {/* Decorative floating icon */}
                  <div className="absolute -top-4 -left-4 bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 flex items-center justify-center shadow-md opacity-80 pointer-events-none transition-colors duration-200">
                    <span className="text-3xl">🚀</span>
                  </div>
                  {/* Main content */}
                  <div className="relative z-10">
                    {isInReturnState || isInReturnStateFallback ? (
                      <>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 transition-colors duration-200">
                          Raffle in Return State
                        </div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-400 mb-2 transition-colors duration-200">
                          Not enough tickets sold
                        </div>
                        <div className="text-base text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                          This raffle ended with only{" "}
                          <span className="font-semibold">
                            {raffle.tickets_sold} tickets
                          </span>{" "}
                          sold (minimum 3 required)
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-400 mt-2 italic font-medium transition-colors duration-200">
                          💰 You can return your tickets to get a full refund!
                        </div>
                      </>
                    ) : raffle.is_released ? (
                      <>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 transition-colors duration-200">
                          Winner took home
                        </div>
                        <div className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-400 mb-2 leading-tight transition-colors duration-200">
                          {(raffle.prize_pool * 0.5) / 1e9} SUI
                        </div>
                        <div className="text-base text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                          with a ticket of{" "}
                          <span className="font-semibold">
                            {raffle.ticket_price / 1e9} SUI
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base text-gray-500 dark:text-gray-400 transition-colors duration-200">gain:</span>
                          <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-1 rounded-full font-bold text-xl shadow-sm animate-pulse transition-colors duration-200">
                            {(
                              (raffle.prize_pool * 0.5) /
                              raffle.ticket_price
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                            x
                          </span>
                          <span className="text-base text-gray-500 dark:text-gray-400 transition-colors duration-200">
                            on their ticket
                          </span>
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-400 mt-2 italic font-medium transition-colors duration-200">
                          This raffle has ended, but you can explore more
                          opportunities!
                        </div>
                        <a
                          href="/explore"
                          className="mt-4 inline-block bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors duration-200"
                        >
                          Explore More Raffles
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 transition-colors duration-200">
                          Win up to
                        </div>
                        <div className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-400 mb-2 leading-tight transition-colors duration-200">
                          {(raffle.is_released
                            ? raffle.prize_pool * 0.5
                            : raffle.balance * 0.5) / 1e9}{" "}
                          SUI
                          {!raffle.is_released && (
                            <span className="text-sm font-normal text-indigo-500 dark:text-indigo-300 ml-2 transition-colors duration-200">
                              (and growing!)
                            </span>
                          )}
                        </div>
                        <div className="text-base text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                          with a ticket of{" "}
                          <span className="font-semibold">
                            {raffle.ticket_price / 1e9} SUI
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base text-gray-500 dark:text-gray-400 transition-colors duration-200">
                            current return:
                          </span>
                          <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-1 rounded-full font-bold text-xl shadow-sm animate-pulse transition-colors duration-200">
                            {(
                              (raffle.is_released
                                ? raffle.prize_pool * 0.5
                                : raffle.balance * 0.5) / raffle.ticket_price
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                            x
                          </span>
                          <span className="text-base text-gray-500 dark:text-gray-400 transition-colors duration-200">
                            on the winning ticket
                          </span>
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-400 mt-2 italic font-medium flex items-center gap-2 transition-colors duration-200">
                          <span>
                            🎯 Prize pool increases with each ticket sold!
                          </span>
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full transition-colors duration-200">
                            {raffle.tickets_sold} tickets sold
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Prize Pool Card */}
            <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
                  <span className="text-yellow-500 dark:text-yellow-400">🏆</span>
                  Prize Pool Distribution
                </h2>
              </div>
              {raffle.is_released ? (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 transition-colors duration-200">
                  <p className="text-green-700 dark:text-green-400 text-sm flex items-center gap-2 transition-colors duration-200">
                    <span className="text-xl">🎉</span>
                    The raffle has concluded! Here are the winners and their
                    prizes.
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors duration-200">
                  <p className="text-blue-700 dark:text-blue-400 text-sm transition-colors duration-200">
                    💡 The prize pool grows with each ticket purchase until the
                    raffle ends. Current minimum prizes shown below.
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-6 border border-yellow-100 dark:border-yellow-800/30 transition-colors duration-200">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-yellow-800 dark:text-yellow-300 font-semibold flex items-center gap-2 transition-colors duration-200">
                        <span className="text-2xl">🥇</span> 1st Place
                      </p>
                    </div>
                    {raffle.is_released &&
                    winners?.winningTicketNumbers?.[0] ? (
                      <div className="text-center">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1 transition-colors duration-200">
                          Winning Ticket
                        </p>
                        <p className="text-xl font-bold text-yellow-800 dark:text-yellow-300 transition-colors duration-200">
                          #{winners.winningTicketNumbers[0]}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 transition-colors duration-200">
                          Prize Pool: 50%
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300 transition-colors duration-200">
                        {raffle.is_released
                          ? (raffle.prize_pool * 0.5) / 1e9
                          : (raffle.balance * 0.5) / 1e9}{" "}
                        SUI
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30 rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold flex items-center gap-2 transition-colors duration-200">
                        <span className="text-2xl">🥈</span> 2nd Place
                      </p>
                    </div>
                    {raffle.is_released &&
                    winners?.winningTicketNumbers?.[1] ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 transition-colors duration-200">
                          Winning Ticket
                        </p>
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-200 transition-colors duration-200">
                          #{winners.winningTicketNumbers[1]}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">Prize Pool: 25%</p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 transition-colors duration-200">
                        {raffle.is_released
                          ? (raffle.prize_pool * 0.25) / 1e9
                          : (raffle.balance * 0.25) / 1e9}{" "}
                        SUI
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-6 border border-amber-100 dark:border-amber-800/30 transition-colors duration-200">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2 transition-colors duration-200">
                        <span className="text-2xl">🥉</span> 3rd Place
                      </p>
                    </div>
                    {raffle.is_released &&
                    winners?.winningTicketNumbers?.[2] ? (
                      <div className="text-center">
                        <p className="text-sm text-amber-600 dark:text-amber-400 mb-1 transition-colors duration-200">
                          Winning Ticket
                        </p>
                        <p className="text-xl font-bold text-amber-800 dark:text-amber-300 transition-colors duration-200">
                          #{winners.winningTicketNumbers[2]}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-amber-600 dark:text-amber-400 transition-colors duration-200">
                          Prize Pool: 10%
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 transition-colors duration-200">
                        {raffle.is_released
                          ? (raffle.prize_pool * 0.1) / 1e9
                          : (raffle.balance * 0.1) / 1e9}{" "}
                        SUI
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 transition-colors duration-200">
                <span className="text-blue-500 dark:text-blue-400">📊</span>
                Raffle Statistics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30 transition-colors duration-200">
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium transition-colors duration-200">
                    Ticket Price
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 transition-colors duration-200">
                    {raffle.ticket_price / 1e9} SUI
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800/30 transition-colors duration-200">
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium transition-colors duration-200">
                    Tickets Sold
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300 transition-colors duration-200">
                    {raffle.tickets_sold}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30 transition-colors duration-200">
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-medium transition-colors duration-200">
                    Max Per Address
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-300 transition-colors duration-200">
                    {raffle.max_tickets_per_address}
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/30 transition-colors duration-200">
                  <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium transition-colors duration-200">
                    Total Prize Pool
                  </p>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300 transition-colors duration-200">
                    {raffle.is_released
                      ? raffle.prize_pool / 1e9
                      : raffle.balance / 1e9}{" "}
                    SUI
                  </p>
                </div>
              </div>
            </div>

            {/* Your Tickets Card */}
            <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
                  <span className="text-green-500 dark:text-green-400">🎫</span>
                  Your Tickets
                </h2>
                {raffle.is_released &&
                  winners &&
                  userTickets.length > 0 &&
                  isConnected &&
                  currentAccount &&
                  (() => {
                    const winningTicketStrings =
                      winners.winningTicketNumbers?.map(String) ?? [];
                    const nonWinningTickets = userTickets.filter(
                      (ticket) =>
                        !winningTicketStrings.includes(
                          String(ticket.ticket_number)
                        )
                    );
                    return nonWinningTickets.length > 0 ? (
                      <button
                        onClick={handleBurnTickets}
                        disabled={isBurningTickets}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBurningTickets ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                            Burning...
                          </span>
                        ) : (
                          `Burn ${nonWinningTickets.length} Non-Winning Tickets`
                        )}
                      </button>
                    ) : null;
                  })()}
              </div>
              {isLoadingTickets ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400"></div>
                </div>
              ) : userTickets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTickets.map((ticket) => {
                    const winningTicketStrings =
                      winners?.winningTicketNumbers?.map(String) ?? [];
                    const isWinner = winningTicketStrings.includes(
                      String(ticket.ticket_number)
                    );
                    const winnerIndex = isWinner
                      ? winningTicketStrings.findIndex(
                          (n: string) => String(ticket.ticket_number) === n
                        )
                      : -1;
                    const prizeAmount = isWinner
                      ? winnerIndex === 0
                        ? (raffle.prize_pool * 0.5) / 1e9
                        : winnerIndex === 1
                        ? (raffle.prize_pool * 0.25) / 1e9
                        : (raffle.prize_pool * 0.1) / 1e9
                      : 0;

                    return (
                      <div
                        key={ticket.id}
                        className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg dark:hover:shadow-black/30 ${
                          isWinner
                            ? "border-green-200 dark:border-green-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/30 dark:to-slate-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <p className="font-bold text-gray-900 dark:text-white transition-colors duration-200">
                            Ticket #{ticket.ticket_number}
                          </p>
                          {isWinner && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold transition-colors duration-200">
                              Winner
                            </span>
                          )}
                        </div>
                        {isWinner && (
                          <div className="space-y-3">
                            <div className="bg-white/70 dark:bg-[#1a202c]/70 rounded-lg p-3 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
                              <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-200">
                                Prize Amount
                              </p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                                {prizeAmount} SUI
                              </p>
                            </div>
                            <button
                              onClick={() => handleClaimPrize(ticket.id)}
                              className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 dark:hover:from-green-500 dark:hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all text-sm"
                            >
                              Claim Prize
                            </button>
                          </div>
                        )}
                        {(isInReturnState || isInReturnStateFallback) &&
                          !isWinner && (
                            <div className="space-y-3">
                              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800 transition-colors duration-200">
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium transition-colors duration-200">
                                  Refund Amount
                                </p>
                                <p className="text-lg font-bold text-orange-800 dark:text-orange-300 transition-colors duration-200">
                                  {raffle.ticket_price / 1e9} SUI
                                </p>
                              </div>
                              <button
                                onClick={() => handleReturnTicket(ticket.id)}
                                disabled={isPurchasing}
                                className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-700 dark:hover:from-orange-500 dark:hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isPurchasing
                                  ? "Returning..."
                                  : "Return Ticket"}
                              </button>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-50 dark:bg-[#1a202c] rounded-xl p-8 max-w-md mx-auto border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-200">
                      <span className="text-2xl">🎫</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg font-medium transition-colors duration-200">
                      You don&apos;t have any tickets for this raffle yet.
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-200">
                      Buy some tickets to participate!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buy Tickets Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#2d3748] rounded-2xl shadow-lg dark:shadow-black/20 p-8 border border-gray-100 dark:border-[#4a5568] sticky top-8 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 transition-colors duration-200">
                <span className="text-indigo-500 dark:text-indigo-400">🎯</span>
                Buy Tickets
              </h2>
              {raffle.is_released ? (
                <div className="text-center py-12">
                  <div className="bg-gray-50 dark:bg-[#1a202c] rounded-xl p-8 max-w-md mx-auto border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-200">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg font-medium transition-colors duration-200">
                      This raffle has concluded. Check if you are among the
                      winners to claim your prize, or find another amazing
                      raffle to participate in!
                    </p>
                    <a
                      href="/explore"
                      className="mt-4 inline-block px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
                    >
                      Explore Raffles
                    </a>
                  </div>
                </div>
              ) : isInReturnState || isInReturnStateFallback ? (
                <div className="text-center py-12">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-8 max-w-md mx-auto border border-orange-200 dark:border-orange-800 transition-colors duration-200">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-200">
                      <span className="text-2xl">💰</span>
                    </div>
                    <p className="text-orange-700 dark:text-orange-400 text-lg font-medium mb-2 transition-colors duration-200">
                      This raffle is in return state
                    </p>
                    <p className="text-orange-600 dark:text-orange-400 text-sm mb-4 transition-colors duration-200">
                      Not enough tickets were sold (minimum 3 required). You can
                      return your tickets to get a full refund.
                    </p>
                    <a
                      href="/explore"
                      className="mt-4 inline-block px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
                    >
                      Explore Other Raffles
                    </a>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleBuyTickets();
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label
                      htmlFor="ticketAmount"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200"
                    >
                      Number of Tickets
                    </label>
                    <input
                      type="number"
                      id="ticketAmount"
                      min="1"
                      max={
                        userPurchaseInfo
                          ? Math.min(
                              raffle.max_tickets_per_address,
                              userPurchaseInfo.remaining_allowed
                            )
                          : raffle.max_tickets_per_address
                      }
                      value={ticketAmount}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (
                          userPurchaseInfo &&
                          value > userPurchaseInfo.remaining_allowed
                        ) {
                          setTicketAmount(userPurchaseInfo.remaining_allowed);
                        } else {
                          setTicketAmount(value);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-[#4a5568] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-lg bg-gray-50 dark:bg-[#1a202c] text-gray-900 dark:text-white transition-colors duration-200"
                    />
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                        Quick select:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {quickTicketOptions.map((amount) => {
                          const isDisabled =
                            userPurchaseInfo &&
                            amount > userPurchaseInfo.remaining_allowed;
                          return (
                            <button
                              key={amount}
                              type="button"
                              disabled={isDisabled}
                              onClick={() =>
                                !isDisabled && setTicketAmount(amount)
                              }
                              className={`w-full px-4 py-1.5 text-sm rounded-full transition-colors duration-200 ${
                                isDisabled
                                  ? "bg-gray-50 dark:bg-[#1a202c] text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                  : ticketAmount === amount
                                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                              }`}
                            >
                              {amount}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* User Purchase Info */}
                    {purchaseInfoLoading ? (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-[#1a202c] border border-gray-200 dark:border-[#4a5568] rounded-lg transition-colors duration-200">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2"></div>
                          <span className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
                            Loading your ticket limit...
                          </span>
                        </div>
                      </div>
                    ) : userPurchaseInfo ? (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors duration-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700 dark:text-blue-400 font-medium transition-colors duration-200">
                            Your Limit: {userPurchaseInfo.purchased_so_far}/
                            {raffle.max_tickets_per_address} tickets
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 transition-colors duration-200">
                            {userPurchaseInfo.remaining_allowed} more allowed
                          </span>
                        </div>
                        {userPurchaseInfo.remaining_allowed === 0 && (
                          <p className="text-red-600 dark:text-red-400 text-xs mt-2 font-medium transition-colors duration-200">
                            🚫 You have reached your personal ticket limit for
                            this raffle
                          </p>
                        )}
                        {userPurchaseInfo.remaining_allowed > 0 &&
                          userPurchaseInfo.remaining_allowed < 5 && (
                            <p className="text-orange-600 dark:text-orange-400 text-xs mt-2 font-medium transition-colors duration-200">
                              ⚠️ Only {userPurchaseInfo.remaining_allowed} more
                              tickets allowed in your limit
                            </p>
                          )}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-[#1a202c] rounded-lg p-4 border border-gray-100 dark:border-[#4a5568] transition-colors duration-200">
                      <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Price per ticket</span>
                      <span className="font-medium text-gray-900 dark:text-white transition-colors duration-200">
                        {raffle.ticket_price / 1e9} SUI
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800/30 transition-colors duration-200">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium transition-colors duration-200">
                        Total cost
                      </span>
                      <span className="text-xl font-bold text-indigo-900 dark:text-indigo-300 transition-colors duration-200">
                        {(raffle.ticket_price * ticketAmount) / 1e9} SUI
                      </span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={
                      isPurchasing || !isConnected || raffle.is_released
                    }
                    className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-500 dark:hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-lg"
                  >
                    {isPurchasing ? (
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
                        Purchasing...
                      </span>
                    ) : (
                      "Buy Tickets"
                    )}
                  </button>
                  {purchaseError && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors duration-200">
                      <p className="text-red-600 dark:text-red-400 transition-colors duration-200">{purchaseError}</p>
                    </div>
                  )}
                  {transactionDigest && raffle.is_released && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg transition-colors duration-200">
                      <p className="text-green-600 dark:text-green-400 font-medium mb-2 transition-colors duration-200">
                        🎉 Raffle released successfully!
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
