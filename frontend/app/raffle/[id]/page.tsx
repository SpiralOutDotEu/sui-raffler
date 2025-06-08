"use client";

import {
  useSuiClient,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  ConnectButton,
} from "@mysten/dapp-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Link,
} from "@mui/material";
import { PACKAGE_ID, MODULE } from "../../constants";
import { Transaction } from "@mysten/sui/transactions";

interface Raffle {
  id: string;
  start_time: number;
  end_time: number;
  ticket_price: number;
  max_tickets_per_purchase: number;
  organizer: string;
  tickets_sold: number;
  is_released: boolean;
  winners: { [key: number]: string };
}

function useRaffle(id: string) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["raffle", id],
    queryFn: async () => {
      const response = await suiClient.getObject({
        id,
        options: {
          showContent: true,
        },
      });

      if (response.data?.content?.dataType === "moveObject") {
        const fields = response.data.content.fields as unknown as Raffle;
        return {
          ...fields,
          id,
        };
      }
      throw new Error("Raffle not found");
    },
  });
}

export default function RaffleDetail() {
  const { id } = useParams();
  const { data: raffle, isLoading, error } = useRaffle(id as string);
  const [ticketAmount, setTicketAmount] = useState<number>(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(
    null
  );
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const handleBuyTickets = async () => {
    if (!currentAccount?.address || !raffle) return;

    setIsPurchasing(true);
    setPurchaseError(null);
    setTransactionDigest(null);

    try {
      const tx = new Transaction();

      // Calculate total cost in MIST (1 SUI = 1e9 MIST)
      const totalCost = BigInt(raffle.ticket_price) * BigInt(ticketAmount);

      // Split a coin with the exact amount needed
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(totalCost)]);

      // Add the buy_tickets call with all required arguments
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::buy_tickets`,
        arguments: [
          tx.object(raffle.id),
          payment, // Use the split coin as payment
          tx.pure.u64(ticketAmount),
          tx.object("0x6"), // Clock object ID
        ],
      });

      // Execute the transaction
      const result = await signAndExecute({
        transaction: tx,
      });

      // Store the transaction digest for the success message
      setTransactionDigest(result.digest);

      // Refresh raffle data
      await queryClient.invalidateQueries({ queryKey: ["raffle", id] });
    } catch (err) {
      let errorMessage = "Failed to purchase tickets";

      if (err instanceof Error) {
        // Handle specific error cases
        if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to purchase tickets";
        } else if (err.message.includes("raffle is not active")) {
          errorMessage = "This raffle is not active";
        } else if (err.message.includes("invalid ticket amount")) {
          errorMessage = "Invalid number of tickets requested";
        } else {
          errorMessage = err.message;
        }
      }

      setPurchaseError(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !raffle) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error instanceof Error ? error.message : "Failed to load raffle"}
        </Alert>
      </Box>
    );
  }

  // Debug timestamps
  console.log("Raw timestamps:", {
    start_time: raffle.start_time,
    end_time: raffle.end_time,
    current: Date.now(),
  });

  const isActive =
    !raffle.is_released &&
    Date.now() >= Number(raffle.start_time) &&
    Date.now() <= Number(raffle.end_time);

  return (
    <Box p={3}>
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr" }}
        gap={3}
      >
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Raffle #{raffle.id.slice(0, 8)}...
            </Typography>

            <Box
              display="grid"
              gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
              gap={2}
            >
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Status
                </Typography>
                <Typography variant="body1">
                  {raffle.is_released
                    ? "Ended"
                    : isActive
                    ? "Active"
                    : "Not Started"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Ticket Price
                </Typography>
                <Typography variant="body1">
                  {raffle.ticket_price / 1e9} SUI
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Tickets Sold
                </Typography>
                <Typography variant="body1">{raffle.tickets_sold}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Max Tickets per Purchase
                </Typography>
                <Typography variant="body1">
                  {raffle.max_tickets_per_purchase}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Start Time
                </Typography>
                <Typography variant="body1">
                  {new Date(Number(raffle.start_time)).toLocaleString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  End Time
                </Typography>
                <Typography variant="body1">
                  {new Date(Number(raffle.end_time)).toLocaleString()}
                </Typography>
              </Box>

              <Box gridColumn={{ xs: "1 / -1" }}>
                <Typography variant="subtitle1" color="textSecondary">
                  Organizer
                </Typography>
                <Typography variant="body1">{raffle.organizer}</Typography>
              </Box>

              {raffle.is_released &&
                Object.entries(raffle.winners).length > 0 && (
                  <Box gridColumn={{ xs: "1 / -1" }}>
                    <Typography variant="h6" gutterBottom>
                      Winners
                    </Typography>
                    {Object.entries(raffle.winners).map(
                      ([ticketNumber, winner]) => (
                        <Typography key={ticketNumber} variant="body1">
                          Ticket #{ticketNumber}: {winner}
                        </Typography>
                      )
                    )}
                  </Box>
                )}
            </Box>
          </CardContent>
        </Card>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Buy Tickets
          </Typography>

          {!currentAccount && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please connect your wallet to buy tickets
              </Alert>
              <ConnectButton />
            </Box>
          )}

          {!isActive && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This raffle is not active
            </Alert>
          )}

          <TextField
            fullWidth
            type="number"
            label="Number of Tickets"
            value={ticketAmount}
            onChange={(e) =>
              setTicketAmount(
                Math.max(
                  1,
                  Math.min(
                    raffle.max_tickets_per_purchase,
                    parseInt(e.target.value) || 1
                  )
                )
              )
            }
            inputProps={{
              min: 1,
              max: raffle.max_tickets_per_purchase,
            }}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="textSecondary" gutterBottom>
            Total Cost: {(raffle.ticket_price * ticketAmount) / 1e9} SUI
          </Typography>

          {purchaseError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {purchaseError}
            </Alert>
          )}

          {transactionDigest && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                🎉 Successfully purchased {ticketAmount} ticket
                {ticketAmount > 1 ? "s" : ""}!
              </Typography>
              <Link
                href={`https://suiexplorer.com/txblock/${transactionDigest}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Transaction
              </Link>
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={handleBuyTickets}
            disabled={isPurchasing || !isActive || !currentAccount}
          >
            {isPurchasing ? <CircularProgress size={24} /> : "Buy Tickets"}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
