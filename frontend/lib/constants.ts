// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
export const FULLNODE_URL = `https://fullnode.${NETWORK}.sui.io:443`;

// Contract configuration
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
export const CONFIG_OBJECT_ID = process.env.NEXT_PUBLIC_CONFIG_OBJECT_ID || '0x0';

console.log("network", NETWORK);
console.log("packageId", PACKAGE_ID);
console.log("configObjectId", CONFIG_OBJECT_ID);

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

// Transaction targets
export const CREATE_RAFFLE_TARGET = `${PACKAGE_ID}::${MODULE}::create_raffle`;
export const BUY_TICKETS_TARGET = `${PACKAGE_ID}::${MODULE}::buy_tickets`;
export const RELEASE_RAFFLE_TARGET = `${PACKAGE_ID}::${MODULE}::release_raffle`;
export const BURN_TICKETS_TARGET = `${PACKAGE_ID}::${MODULE}::burn_tickets`;

// Cache configuration
export const CACHE_MAX_ITEMS = 1000;
export const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
export const CACHE_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// File upload limits
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Time constants
export const BLOCKCHAIN_TIME_UPDATE_INTERVAL = 60000; // 1 minute
export const PRICE_UPDATE_DEBOUNCE = 500; // 500ms

// Quick options
export const QUICK_START_OPTIONS = [
    { label: "Now", value: 0 },
    { label: "In 1 hour", value: 60 * 60 * 1000 },
    { label: "In 3 hours", value: 3 * 60 * 60 * 1000 },
    { label: "Tomorrow", value: 24 * 60 * 60 * 1000 },
    { label: "In 3 days", value: 3 * 24 * 60 * 60 * 1000 },
];

export const QUICK_DURATION_OPTIONS = [
    { label: "1 hour", value: 60 * 60 * 1000 },
    { label: "3 hours", value: 3 * 60 * 60 * 1000 },
    { label: "6 hours", value: 6 * 60 * 60 * 1000 },
    { label: "1 day", value: 24 * 60 * 60 * 1000 },
    { label: "3 days", value: 3 * 24 * 60 * 60 * 1000 },
    { label: "1 week", value: 7 * 24 * 60 * 60 * 1000 },
];

export const QUICK_TICKET_PRICE_OPTIONS = [
    { label: "0.1 SUI", value: "0.1" },
    { label: "1 SUI", value: "1" },
    { label: "5 SUI", value: "5" },
    { label: "10 SUI", value: "10" },
];

export const QUICK_MAX_TICKETS_OPTIONS = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "5", value: "5" },
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "50", value: "50" },
];

// Transaction targets for new functions
export const GET_ADDRESS_PURCHASE_INFO_TARGET = `${PACKAGE_ID}::${MODULE}::get_address_purchase_info`;