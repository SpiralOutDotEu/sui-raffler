// Network configuration
export const NETWORK = "testnet"; // or "mainnet" or "devnet"
export const FULLNODE_URL = `https://fullnode.${NETWORK}.sui.io:443`;

// Contract configuration
export const PACKAGE_ID = "0xc094a480583a30523e60ba5bc7ef3b0f5ed8e08d9e7f2db64f03b6bad69779bf"; // Replace with your actual package ID after deployment
export const MODULE = "sui_raffler";

// Raffle prize distribution percentages
export const FIRST_PRIZE_PERCENTAGE = 50;
export const SECOND_PRIZE_PERCENTAGE = 25;
export const THIRD_PRIZE_PERCENTAGE = 10;
export const ORGANIZER_PERCENTAGE = 10;
export const PROTOCOL_FEE_PERCENTAGE = 5;

// Event types
export const RAFFLE_CREATED_EVENT = `${PACKAGE_ID}::${MODULE}::RaffleCreated`;
export const TICKETS_PURCHASED_EVENT = `${PACKAGE_ID}::${MODULE}::TicketsPurchased`;
export const RAFFLE_RELEASED_EVENT = `${PACKAGE_ID}::${MODULE}::RaffleReleased`; 