/*
/// Module: sui_raffler
module sui_raffler::sui_raffler;
*/

/*
 * @title Sui Raffler
 * @description A decentralized raffle system built on Sui blockchain
 * @version 1.0.0
 * 
 * This module implements a decentralized raffle system where:
 * - Anyone can create raffles with specific parameters
 * - Users can buy tickets for raffles
 * - Winners are selected randomly using Sui's on-chain randomness
 * - Prizes are automatically distributed to winners
 */

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module sui_raffler::sui_raffler {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::random::{Self, Random};
    use sui::clock::{Self, Clock};
    use sui::vec_map::{Self, VecMap};
    use sui::event;

    // === Constants ===
    // Prize distribution percentages (must sum to 100)
    const FIRST_PRIZE_PERCENTAGE: u64 = 50;  // 50% of total prize pool
    const SECOND_PRIZE_PERCENTAGE: u64 = 25; // 25% of total prize pool
    const THIRD_PRIZE_PERCENTAGE: u64 = 10;  // 10% of total prize pool
    const ORGANIZER_PERCENTAGE: u64 = 10;    // 10% of total prize pool
    const PROTOCOL_FEE_PERCENTAGE: u64 = 5;  // 5% of total prize pool

    // === Error Codes ===
    const ENotAdmin: u64 = 0;                // Caller is not the admin
    const EInvalidDates: u64 = 1;            // Start time must be before end time
    const EInvalidTicketPrice: u64 = 2;      // Ticket price must be greater than 0
    const EInvalidMaxTickets: u64 = 3;       // Max tickets per purchase must be greater than 0
    const ERaffleNotActive: u64 = 4;         // Raffle is not active (current time outside start/end time)
    const ERaffleNotEnded: u64 = 5;          // Raffle has not ended yet
    const ERaffleAlreadyReleased: u64 = 6;   // Winners have already been selected
    const EInvalidTicketAmount: u64 = 7;     // Invalid number of tickets requested
    const EInvalidTicket: u64 = 8;           // Ticket does not belong to this raffle
    const ENotWinner: u64 = 9;               // Ticket is not a winning ticket
    const EInvalidOrganizer: u64 = 10;       // Invalid organizer address

    /// Module configuration that holds admin and fee collector addresses
    public struct Config has key {
        id: UID,
        admin: address,
        fee_collector: address,
    }

    /// A raffle object that holds all the raffle information
    /// This is the main object that tracks the raffle state
    public struct Raffle has key {
        id: UID,
        start_time: u64,         // Unix timestamp in milliseconds when raffle starts
        end_time: u64,           // Unix timestamp in milliseconds when raffle ends
        ticket_price: u64,       // Price per ticket in SUI
        max_tickets_per_purchase: u64,  // Maximum tickets one can buy in a single transaction
        organizer: address,      // Address that created the raffle
        fee_collector: address,  // Address that receives protocol fees
        balance: Balance<SUI>,   // Current balance of the raffle
        tickets_sold: u64,       // Total number of tickets sold
        is_released: bool,       // Whether winners have been selected
        winners: VecMap<u64, u64>,  // Maps winning ticket numbers to winner addresses
        prize_pool: u64,         // Store the original prize pool at release
    }

    /// A ticket object that represents a raffle ticket
    /// Each ticket has a unique number and is linked to a specific raffle
    public struct Ticket has key, store {
        id: UID,
        raffle_id: ID,          // ID of the raffle this ticket belongs to
        ticket_number: u64,     // Unique ticket number
    }

    // === Events ===
    /// Emitted when a new raffle is created
    public struct RaffleCreated has copy, drop {
        raffle_id: ID,
        organizer: address,
        start_time: u64,
        end_time: u64,
        ticket_price: u64,
    }

    /// Emitted when tickets are purchased
    public struct TicketsPurchased has copy, drop {
        raffle_id: ID,
        buyer: address,
        amount: u64,
        start_ticket: u64,
        end_ticket: u64,
    }

    /// Emitted when winners are selected
    public struct RaffleReleased has copy, drop {
        raffle_id: ID,
        first_winner: u64,
        second_winner: u64,
        third_winner: u64,
    }

    /// Emitted when fee collector is updated
    public struct FeeCollectorUpdated has copy, drop {
        old_fee_collector: address,
        new_fee_collector: address,
    }

    // === Functions ===

    /// Initialize the module with admin and fee collector addresses
    /// This function can only be called once during module deployment
    public entry fun initialize(admin: address, fee_collector: address, ctx: &mut TxContext) {
        let config = Config {
            id: object::new(ctx),
            admin,
            fee_collector,
        };
        transfer::share_object(config);
    }

    /// Update the fee collector address
    /// Only the admin can call this function
    public entry fun update_fee_collector(
        config: &mut Config,
        new_fee_collector: address,
        ctx: &mut TxContext
    ) {
        assert!(config.admin == tx_context::sender(ctx), ENotAdmin);
        let old_fee_collector = config.fee_collector;
        config.fee_collector = new_fee_collector;
        event::emit(FeeCollectorUpdated {
            old_fee_collector,
            new_fee_collector,
        });
    }

    /// Create a new raffle
    /// Anyone can create a raffle by specifying the parameters
    public entry fun create_raffle(
        config: &Config,
        start_time: u64,
        end_time: u64,
        ticket_price: u64,
        max_tickets_per_purchase: u64,
        organizer: address,
        ctx: &mut TxContext
    ) {
        // Validate dates
        assert!(start_time < end_time, EInvalidDates);
        
        // Validate ticket price
        assert!(ticket_price > 0, EInvalidTicketPrice);
        
        // Validate max tickets
        assert!(max_tickets_per_purchase > 0, EInvalidMaxTickets);

        // Validate organizer address
        assert!(organizer != @0x0, EInvalidOrganizer);

        let raffle = Raffle {
            id: object::new(ctx),
            start_time,
            end_time,
            ticket_price,
            max_tickets_per_purchase,
            organizer,
            fee_collector: config.fee_collector,
            balance: balance::zero(),
            tickets_sold: 0,
            is_released: false,
            winners: vec_map::empty(),
            prize_pool: 0,
        };

        // Emit event
        event::emit(RaffleCreated {
            raffle_id: object::id(&raffle),
            organizer,
            start_time,
            end_time,
            ticket_price,
        });

        transfer::share_object(raffle);
    }

    /// Buy tickets for a raffle
    /// Users can buy multiple tickets in a single transaction up to max_tickets_per_purchase
    public entry fun buy_tickets(
        raffle: &mut Raffle,
        payment: Coin<SUI>,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Check if raffle is active
        assert!(current_time >= raffle.start_time && current_time <= raffle.end_time, ERaffleNotActive);
        
        // Validate amount
        assert!(amount > 0 && amount <= raffle.max_tickets_per_purchase, EInvalidTicketAmount);
        
        // Calculate total cost
        let total_cost = raffle.ticket_price * amount;
        let payment_value = coin::value(&payment);
        assert!(payment_value >= total_cost, EInvalidTicketPrice);

        // Add payment to raffle balance
        balance::join(&mut raffle.balance, coin::into_balance(payment));

        // Create tickets
        let start_ticket = raffle.tickets_sold + 1;
        let end_ticket = start_ticket + amount - 1;
        
        // Update tickets sold
        raffle.tickets_sold = end_ticket;

        // Create and transfer tickets
        let mut i = 0;
        while (i < amount) {
            let ticket = Ticket {
                id: object::new(ctx),
                raffle_id: object::id(raffle),
                ticket_number: start_ticket + i,
            };
            transfer::public_transfer(ticket, tx_context::sender(ctx));
            i = i + 1;
        };

        // Emit event
        event::emit(TicketsPurchased {
            raffle_id: object::id(raffle),
            buyer: tx_context::sender(ctx),
            amount,
            start_ticket,
            end_ticket,
        });
    }

    /// Release the raffle and select winners
    /// Can only be called after the raffle end time
    #[allow(lint(public_random))]
    public entry fun release_raffle(
        raffle: &mut Raffle,
        random: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Check if raffle has ended
        assert!(current_time > raffle.end_time, ERaffleNotEnded);
        
        // Check if raffle is already released
        assert!(!raffle.is_released, ERaffleAlreadyReleased);

        // Generate unique random numbers for winners
        let mut random_generator = random::new_generator(random, ctx);
        let first_winner = random_generator.generate_u64() % raffle.tickets_sold + 1;

        let mut second_winner = random_generator.generate_u64() % raffle.tickets_sold + 1;
        while (second_winner == first_winner) {
            second_winner = random_generator.generate_u64() % raffle.tickets_sold + 1;
        };

        let mut third_winner = random_generator.generate_u64() % raffle.tickets_sold + 1;
        while (third_winner == first_winner || third_winner == second_winner) {
            third_winner = random_generator.generate_u64() % raffle.tickets_sold + 1;
        };

        // Store winning ticket numbers
        vec_map::insert(&mut raffle.winners, first_winner, first_winner);
        vec_map::insert(&mut raffle.winners, second_winner, second_winner);
        vec_map::insert(&mut raffle.winners, third_winner, third_winner);

        raffle.is_released = true;

        // Store the prize pool at release
        raffle.prize_pool = balance::value(&raffle.balance);

        // Emit event
        event::emit(RaffleReleased {
            raffle_id: object::id(raffle),
            first_winner: first_winner,
            second_winner: second_winner,
            third_winner: third_winner,
        });
    }

    /// Claim prize with a winning ticket
    /// Winners can claim their prizes after the raffle is released
    public entry fun claim_prize(
        raffle: &mut Raffle,
        ticket: Ticket,
        ctx: &mut TxContext
    ) {
        // Verify ticket belongs to this raffle
        assert!(ticket.raffle_id == object::id(raffle), EInvalidTicket);
        
        // Verify ticket is a winner
        let ticket_number = ticket.ticket_number;
        let winners = &raffle.winners;
        assert!(vec_map::contains(winners, &ticket_number), ENotWinner);

        // Calculate prize amount based on position
        let total_balance = raffle.prize_pool;
        let winner_keys = vec_map::keys(winners);
        let prize_amount = if (ticket_number == *vector::borrow(&winner_keys, 0)) {
            (total_balance * FIRST_PRIZE_PERCENTAGE) / 100
        } else if (ticket_number == *vector::borrow(&winner_keys, 1)) {
            (total_balance * SECOND_PRIZE_PERCENTAGE) / 100
        } else {
            (total_balance * THIRD_PRIZE_PERCENTAGE) / 100
        };

        // Transfer prize
        let prize = coin::from_balance(balance::split(&mut raffle.balance, prize_amount), ctx);
        transfer::public_transfer(prize, tx_context::sender(ctx));

        // If this is the last winner, transfer organizer's share and protocol fee
        if (vec_map::size(winners) == 3) {
            let organizer_share = (raffle.prize_pool * ORGANIZER_PERCENTAGE) / 100;
            let protocol_fee = (raffle.prize_pool * PROTOCOL_FEE_PERCENTAGE) / 100;

            // Transfer organizer's share
            let organizer_prize = coin::from_balance(balance::split(&mut raffle.balance, organizer_share), ctx);
            transfer::public_transfer(organizer_prize, raffle.organizer);

            // Transfer protocol fee
            let fee = coin::from_balance(balance::split(&mut raffle.balance, protocol_fee), ctx);
            transfer::public_transfer(fee, raffle.fee_collector);
        };

        // Burn the ticket
        let Ticket { id, raffle_id: _, ticket_number: _ } = ticket;
        object::delete(id);
    }

    // === View Functions ===

    /// Get detailed raffle information
    public fun get_raffle_info(raffle: &Raffle): (
        u64, // start_time
        u64, // end_time
        u64, // ticket_price
        u64, // max_tickets_per_purchase
        address, // organizer
        address, // fee_collector
        u64, // balance
        u64, // tickets_sold
        bool, // is_released
        u64, // total_prize_pool
        u64, // first_prize_amount
        u64, // second_prize_amount
        u64, // third_prize_amount
        u64, // organizer_share_amount
        u64  // protocol_fee_amount
    ) {
        let total_balance = if (raffle.is_released) { raffle.prize_pool } else { balance::value(&raffle.balance) };
        (
            raffle.start_time,
            raffle.end_time,
            raffle.ticket_price,
            raffle.max_tickets_per_purchase,
            raffle.organizer,
            raffle.fee_collector,
            balance::value(&raffle.balance),
            raffle.tickets_sold,
            raffle.is_released,
            total_balance,
            (total_balance * FIRST_PRIZE_PERCENTAGE) / 100,
            (total_balance * SECOND_PRIZE_PERCENTAGE) / 100,
            (total_balance * THIRD_PRIZE_PERCENTAGE) / 100,
            (total_balance * ORGANIZER_PERCENTAGE) / 100,
            (total_balance * PROTOCOL_FEE_PERCENTAGE) / 100
        )
    }

    /// Get winner information for a raffle
    public fun get_winners(raffle: &Raffle): (
        bool, // has_winners
        vector<u64>, // winning_ticket_numbers
        vector<u64> // winner_addresses
    ) {
        if (!raffle.is_released) {
            return (false, vector::empty(), vector::empty())
        };
        let winner_keys = vec_map::keys(&raffle.winners);
        let mut winner_values = vector::empty<u64>();
        let mut i = 0;
        let len = vector::length(&winner_keys);
        while (i < len) {
            let key = vector::borrow(&winner_keys, i);
            let value = *vec_map::get(&raffle.winners, key);
            vector::push_back(&mut winner_values, value);
            i = i + 1;
        };
        (true, winner_values, winner_keys)
    }

    /// Get ticket information
    public fun get_ticket_info(ticket: &Ticket): (
        ID, // raffle_id
        u64 // ticket_number
    ) {
        (ticket.raffle_id, ticket.ticket_number)
    }

    /// Check if a ticket is a winning ticket
    public fun is_winning_ticket(raffle: &Raffle, ticket: &Ticket): (
        bool, // is_winner
        u64 // prize_amount (0 if not winner)
    ) {
        if (!raffle.is_released) {
            return (false, 0)
        };
        let ticket_number = ticket.ticket_number;
        if (!vec_map::contains(&raffle.winners, &ticket_number)) {
            return (false, 0)
        };
        let total_balance = raffle.prize_pool;
        let winner_keys = vec_map::keys(&raffle.winners);
        let prize_amount = if (ticket_number == *vector::borrow(&winner_keys, 0)) {
            (total_balance * FIRST_PRIZE_PERCENTAGE) / 100
        } else if (ticket_number == *vector::borrow(&winner_keys, 1)) {
            (total_balance * SECOND_PRIZE_PERCENTAGE) / 100
        } else {
            (total_balance * THIRD_PRIZE_PERCENTAGE) / 100
        };
        (true, prize_amount)
    }

    /// Get raffle statistics
    public fun get_raffle_stats(raffle: &Raffle, clock: &Clock): (
        u64, // total_tickets_sold
        u64, // total_volume
        u64, // average_tickets_per_purchase
        u64, // time_remaining_ms (0 if ended)
        bool // is_active
    ) {
        let current_time = clock::timestamp_ms(clock);
        let time_remaining = if (current_time < raffle.end_time) {
            raffle.end_time - current_time
        } else {
            0
        };
        let is_active = current_time >= raffle.start_time && current_time <= raffle.end_time;
        (
            raffle.tickets_sold,
            balance::value(&raffle.balance),
            if (raffle.tickets_sold > 0) { balance::value(&raffle.balance) / raffle.tickets_sold } else { 0 },
            time_remaining,
            is_active
        )
    }

    // === Test Helpers ===

    #[test_only]
    public fun get_raffle_balance(raffle: &Raffle): u64 {
        balance::value(&raffle.balance)
    }

    #[test_only]
    public fun get_tickets_sold(raffle: &Raffle): u64 {
        raffle.tickets_sold
    }

    #[test_only]
    public fun is_released(raffle: &Raffle): bool {
        raffle.is_released
    }

    #[test_only]
    public fun get_config_fee_collector(config: &Config): address {
        config.fee_collector
    }
}


