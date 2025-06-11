// Network configuration
export const NETWORK = "testnet"; // or "mainnet" or "devnet"
export const FULLNODE_URL = `https://fullnode.${NETWORK}.sui.io:443`;

// Contract configuration
// export const PACKAGE_ID = "0xc094a480583a30523e60ba5bc7ef3b0f5ed8e08d9e7f2db64f03b6bad69779bf";
export const PACKAGE_ID = "0xda81f78615c91764536a777025199b7d42a1186d18ac238bfce75cdd46fc57bf";
// export const CONFIG_OBJECT_ID = "0xcdb8766024590675201703a921e84983af5f9acb1807eabc1a97d31d70ad1f65";
export const CONFIG_OBJECT_ID = "0xbfdc89747320b401b737aa91c45b75e61f472c158bb46a63446e284f0814086f";
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