// Sui blockchain related types
export interface Raffle {
    id: string;
    start_time: number;
    end_time: number;
    ticket_price: number;
    max_tickets_per_address: number; // Changed from max_tickets_per_purchase
    organizer: string;
    fee_collector: string;
    admin: string;
    controller: string;
    balance: number;
    tickets_sold: number;
    is_released: boolean;
    winners: { [key: number]: string };
    prize_pool: number;
    organizer_claimed: boolean;
    protocol_claimed: boolean;
    paused: boolean;
    visible: boolean;
    winning_tickets: number[];
    name: string;
    description: string;
    image: string;
}

export interface Ticket {
    id: string;
    ticket_number: number;
    is_winner?: boolean;
    prize_amount?: number;
}

export interface TicketFields {
    raffle_id: string;
    ticket_number: string;
}

export interface RaffleEvent {
    raffle_id: string;
    organizer: string;
    start_time: number;
    end_time: number;
    ticket_price: number;
    name: string;
    description: string;
    image: string;
}

export interface RaffleFields {
    tickets_sold: number;
    is_released: boolean;
    balance: number;
    winners: { [key: number]: string } | undefined;
    prize_pool: number;
    image: string;
    name: string;
    description: string;
    paused: boolean;
    visible: boolean;
}

export interface CreateRaffleData {
    name: string;
    description: string;
    imageCid: string;
    startTime: number;
    endTime: number;
    ticketPrice: string;
    maxTicketsPerAddress: string; // Changed from maxTicketsPerPurchase
}

export interface UserPurchaseInfo {
    purchased_so_far: number;
    remaining_allowed: number;
}

export interface ClockFields {
    timestamp_ms: string;
}

export interface SuiError extends Error {
    code?: string;
    details?: unknown;
}

export interface CacheStats {
    size: number;
    itemCount: number;
    maxSize: number;
}

// Type for transaction result with digest and flexible additional properties
export type TransactionResult = {
    digest: string;
    effects?: unknown;
    events?: unknown[];
    objectChanges?: unknown[];
    balanceChanges?: unknown[];
    timestampMs?: string;
    checkpoint?: string;
} & Record<string, unknown>;
