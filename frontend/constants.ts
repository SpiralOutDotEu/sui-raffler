// Network configuration
export const NETWORK = "testnet"; // or "mainnet" or "devnet"
export const FULLNODE_URL = `https://fullnode.${NETWORK}.sui.io:443`;

// Contract configuration
// export const PACKAGE_ID = "0xc094a480583a30523e60ba5bc7ef3b0f5ed8e08d9e7f2db64f03b6bad69779bf";
export const PACKAGE_ID = "0x3929e87b20eba90b22d4521a686aab7ab45e8cf8c0f257f49e248edaa8758e84";
// export const CONFIG_OBJECT_ID = "0xcdb8766024590675201703a921e84983af5f9acb1807eabc1a97d31d70ad1f65";
export const CONFIG_OBJECT_ID = "0x7c50e7eccb2a85d3349158dcf434fb2014a60536cc0c1efc02653d9d07a46a97";
export const MODULE = "sui_raffler";


// Shared objects
export const RANDOM_OBJECT_ID = "0x8";
export const CLOCK_OBJECT_ID = "0x6";

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