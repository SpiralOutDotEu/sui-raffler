"use client";

import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";

// Contract configuration
const PACKAGE_ID =
  "0xc094a480583a30523e60ba5bc7ef3b0f5ed8e08d9e7f2db64f03b6bad69779bf"; // Replace with your package ID
const MODULE = "sui_raffler";
const FUNCTION = "create_raffle";
const CONFIG_ID =
  "0xcdb8766024590675201703a921e84983af5f9acb1807eabc1a97d31d70ad1f65"; // We need to get this from the contract deployment

export default function AdminPage() {
  const [formData, setFormData] = useState({
    startTime: "",
    endTime: "",
    ticketPrice: "",
    maxTicketsPerPurchase: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Convert form data to appropriate types
      const startTime = BigInt(new Date(formData.startTime).getTime());
      const endTime = BigInt(new Date(formData.endTime).getTime());
      const ticketPrice = BigInt(parseFloat(formData.ticketPrice) * 1e9); // Convert SUI to MIST
      const maxTicketsPerPurchase = BigInt(formData.maxTicketsPerPurchase);

      // Build transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::${FUNCTION}`,
        arguments: [
          tx.object(CONFIG_ID), // Add Config object as first argument
          tx.pure.u64(startTime),
          tx.pure.u64(endTime),
          tx.pure.u64(ticketPrice),
          tx.pure.u64(maxTicketsPerPurchase),
          tx.pure.address(account.address),
        ],
      });

      // Execute transaction
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      setTxHash(result?.digest || null);
      setFormData({
        startTime: "",
        endTime: "",
        ticketPrice: "",
        maxTicketsPerPurchase: "",
      });
    } catch (err) {
      setError((err as Error).message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
      <Card elevation={4} sx={{ borderRadius: 4 }}>
        <CardContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={3}
          >
            <Typography variant="h4" fontWeight={700} color="primary.main">
              Create Raffle
            </Typography>
            <ConnectButton />
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="Start Time"
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End Time"
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Ticket Price (SUI)"
                type="number"
                name="ticketPrice"
                value={formData.ticketPrice}
                onChange={handleInputChange}
                required
                fullWidth
                inputProps={{ step: "0.1", min: "0" }}
              />

              <TextField
                label="Max Tickets Per Purchase"
                type="number"
                name="maxTicketsPerPurchase"
                value={formData.maxTicketsPerPurchase}
                onChange={handleInputChange}
                required
                fullWidth
                inputProps={{ min: "1" }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading || !account}
                sx={{ mt: 2 }}
              >
                {isLoading ? "Creating Raffle..." : "Create Raffle"}
              </Button>
            </Stack>
          </form>

          {error && (
            <Box mt={2} p={2} bgcolor="error.light" borderRadius={1}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {txHash && (
            <Box mt={2} textAlign="center">
              <Typography variant="body2" color="success.main">
                Raffle created successfully!
              </Typography>
              <Typography variant="body2">
                <a
                  href={`https://suiexplorer.com/txblock/${txHash}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#1976d2", textDecoration: "underline" }}
                >
                  View on Sui Explorer
                </a>
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
