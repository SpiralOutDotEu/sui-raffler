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
    use sui::event;
    use std::string::{String};

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
    const EAlreadyClaimed: u64 = 11;         // Fees have already been claimed
    const ENotController: u64 = 12;          // Caller is not the controller
    const EPaused: u64 = 13;                 // Contract or raffle is paused
    const EPermissionDenied: u64 = 14;       // Not allowed in current permission mode
    const ERafflePaused: u64 = 15;           // Raffle is paused
    const ENotAuthorized: u64 = 17;          // Not authorized for this operation
    const ENotMinimumTickets: u64 = 18;      // Not enough tickets sold for raffle release

    /// Module configuration that holds admin, controller, fee collector, pause, and permissionless info
    public struct Config has key {
        id: UID,
        admin: address,
        controller: address,
        fee_collector: address,
        paused: bool,
        permissionless: bool,
    }

    /// A raffle object that holds all the raffle information
    /// This is the main object that tracks the raffle state
    public struct Raffle has key {
        id: UID,
        name: String,           // Name of the raffle
        description: String,    // Description of the raffle
        image: String,         // Image URL or reference
        start_time: u64,         // Unix timestamp in milliseconds when raffle starts
        end_time: u64,           // Unix timestamp in milliseconds when raffle ends
        ticket_price: u64,       // Price per ticket in SUI
        max_tickets_per_purchase: u64,  // Maximum tickets one can buy in a single transaction
        organizer: address,      // Address that created the raffle
        fee_collector: address,  // Address that receives protocol fees
        balance: Balance<SUI>,   // Current balance of the raffle
        tickets_sold: u64,       // Total number of tickets sold
        is_released: bool,       // Whether winners have been selected
        winning_tickets: vector<u64>,  // List of winning ticket numbers
        prize_pool: u64,         // Store the original prize pool at release
        organizer_claimed: bool,  // Whether organizer has claimed their share
        protocol_claimed: bool,   // Whether protocol fees have been claimed
        paused: bool,            // Whether this specific raffle is paused
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

    /// Initialize the module with admin, controller, and fee collector addresses
    /// This function can only be called once during module deployment
    public entry fun initialize(admin: address, controller: address, fee_collector: address, ctx: &mut TxContext) {
        let config = Config {
            id: object::new(ctx),
            admin,
            controller,
            fee_collector,
            paused: false,
            permissionless: true,
        };
        transfer::share_object(config);
    }

    /// Update the admin address
    /// Only the admin can call this function
    public entry fun update_admin(config: &mut Config, new_admin: address, ctx: &mut TxContext) {
        assert!(config.admin == tx_context::sender(ctx), ENotAdmin);
        config.admin = new_admin;
    }

    /// Update the controller address
    /// Only the admin can call this function
    public entry fun update_controller(config: &mut Config, new_controller: address, ctx: &mut TxContext) {
        assert!(config.admin == tx_context::sender(ctx), ENotAdmin);
        config.controller = new_controller;
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

    /// Set permissionless mode (true = anyone can create raffles, false = only admin)
    /// Only the admin can call this function
    public entry fun set_permissionless(config: &mut Config, value: bool, ctx: &mut TxContext) {
        assert!(config.admin == tx_context::sender(ctx), ENotAdmin);
        config.permissionless = value;
    }

    /// Pause the contract globally
    /// Only the admin or controller can call this function
    public entry fun pause(config: &mut Config, ctx: &mut TxContext) {
        assert!(is_admin_or_controller(config, tx_context::sender(ctx)), ENotAuthorized);
        config.paused = true;
    }

    /// Unpause the contract globally
    /// Only the admin or controller can call this function
    public entry fun unpause(config: &mut Config, ctx: &mut TxContext) {
        assert!(is_admin_or_controller(config, tx_context::sender(ctx)), ENotAuthorized);
        config.paused = false;
    }

    /// Pause a specific raffle
    /// Only the admin or controller can call this function
    public entry fun pause_raffle(config: &Config, raffle: &mut Raffle, ctx: &mut TxContext) {
        assert!(is_admin_or_controller(config, tx_context::sender(ctx)), ENotAuthorized);
        raffle.paused = true;
    }

    /// Unpause a specific raffle
    /// Only the admin or controller can call this function
    public entry fun unpause_raffle(config: &Config, raffle: &mut Raffle, ctx: &mut TxContext) {
        assert!(is_admin_or_controller(config, tx_context::sender(ctx)), ENotAuthorized);
        raffle.paused = false;
    }

    /// Helper: check if contract is paused
    public fun is_paused(config: &Config): bool {
        config.paused
    }

    /// Helper: check if a raffle is paused
    public fun is_raffle_paused(raffle: &Raffle): bool {
        raffle.paused
    }

    /// Helper: check if sender is admin
    public fun is_admin(config: &Config, sender: address): bool {
        config.admin == sender
    }

    /// Helper: check if sender is controller
    public fun is_controller(config: &Config, sender: address): bool {
        config.controller == sender
    }

    /// Helper: check if sender is admin or controller
    public fun is_admin_or_controller(config: &Config, sender: address): bool {
        config.admin == sender || config.controller == sender
    }

    /// Create a new raffle
    /// Anyone can create a raffle by specifying the parameters
    public entry fun create_raffle(
        config: &Config,
        name: String,
        description: String,
        image: String,
        start_time: u64,
        end_time: u64,
        ticket_price: u64,
        max_tickets_per_purchase: u64,
        organizer: address,
        ctx: &mut TxContext
    ) {
        assert!(!config.paused, EPaused);
        assert!(config.permissionless || tx_context::sender(ctx) == config.admin, EPermissionDenied);
        assert!(start_time < end_time, EInvalidDates);
        assert!(ticket_price > 0, EInvalidTicketPrice);
        assert!(max_tickets_per_purchase > 0, EInvalidMaxTickets);
        assert!(!(organizer == @0x0), EInvalidOrganizer);
        let raffle_uid = object::new(ctx);
        event::emit(RaffleCreated {
            raffle_id: object::uid_to_inner(&raffle_uid),
            organizer,
            start_time,
            end_time,
            ticket_price,
        });
        transfer::share_object(Raffle {
            id: raffle_uid,
            name,
            description,
            image,
            start_time,
            end_time,
            ticket_price,
            max_tickets_per_purchase,
            organizer,
            fee_collector: config.fee_collector,
            balance: balance::zero(),
            tickets_sold: 0,
            is_released: false,
            winning_tickets: vector::empty(),
            prize_pool: 0,
            organizer_claimed: false,
            protocol_claimed: false,
            paused: false,
        });
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
        // Check if raffle is paused
        assert!(!raffle.paused, ERafflePaused);
        
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
        config: &Config,
        raffle: &mut Raffle,
        random: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Check if contract is paused
        assert!(!config.paused, EPaused);
        // Check if raffle is paused
        assert!(!raffle.paused, ERafflePaused);
        // Only admin or controller can call
        if (!(config.admin == tx_context::sender(ctx) || config.controller == tx_context::sender(ctx))) {
            abort(ENotController)
        };
        let current_time = clock::timestamp_ms(clock);
        // Check if raffle has ended
        assert!(current_time > raffle.end_time, ERaffleNotEnded);
        // Check if raffle is already released
        assert!(!raffle.is_released, ERaffleAlreadyReleased);
        // Check if minimum tickets are sold
        assert!(raffle.tickets_sold >= 3, ENotMinimumTickets);
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
        vector::push_back(&mut raffle.winning_tickets, first_winner);
        vector::push_back(&mut raffle.winning_tickets, second_winner);
        vector::push_back(&mut raffle.winning_tickets, third_winner);
        raffle.is_released = true;
        // Store the prize pool at release
        raffle.prize_pool = balance::value(&raffle.balance);

        // Claim protocol fees immediately
        claim_protocol_fees_internal(config, raffle, ctx);

        // Emit event
        event::emit(RaffleReleased {
            raffle_id: object::id(raffle),
            first_winner: first_winner,
            second_winner: second_winner,
            third_winner: third_winner,
        });
    }

    /// Internal function to claim protocol fees from the raffle
    fun claim_protocol_fees_internal(
        config: &Config,
        raffle: &mut Raffle,
        ctx: &mut TxContext
    ) {
        // Verify protocol fees haven't been claimed yet
        assert!(!raffle.protocol_claimed, EAlreadyClaimed);

        // Mark as claimed
        raffle.protocol_claimed = true;

        // Calculate and transfer protocol fees
        let protocol_fee = (raffle.prize_pool * PROTOCOL_FEE_PERCENTAGE) / 100;
        let fee = coin::from_balance(balance::split(&mut raffle.balance, protocol_fee), ctx);
        transfer::public_transfer(fee, config.fee_collector);
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
        
        // Check if minimum tickets are sold
        assert!(raffle.tickets_sold >= 3, ENotMinimumTickets);
        
        // Verify ticket is a winner
        let ticket_number = ticket.ticket_number;
        assert!(vector::contains(&raffle.winning_tickets, &ticket_number), ENotWinner);

        // Calculate prize amount based on position
        let total_balance = raffle.prize_pool;
        let prize_amount = if (ticket_number == *vector::borrow(&raffle.winning_tickets, 0)) {
            (total_balance * FIRST_PRIZE_PERCENTAGE) / 100
        } else if (ticket_number == *vector::borrow(&raffle.winning_tickets, 1)) {
            (total_balance * SECOND_PRIZE_PERCENTAGE) / 100
        } else {
            (total_balance * THIRD_PRIZE_PERCENTAGE) / 100
        };

        // Transfer prize
        let prize = coin::from_balance(balance::split(&mut raffle.balance, prize_amount), ctx);
        transfer::public_transfer(prize, tx_context::sender(ctx));

        // Burn the ticket
        let Ticket { id, raffle_id: _, ticket_number: _ } = ticket;
        object::delete(id);
    }

    /// Claim organizer's share of the raffle
    /// Only the organizer can claim their share after all winners have claimed their prizes
    public entry fun claim_organizer_share(
        raffle: &mut Raffle,
        ctx: &mut TxContext
    ) {
        // Verify caller is the organizer
        assert!(tx_context::sender(ctx) == raffle.organizer, ENotAdmin);
        
        // Check if minimum tickets are sold
        assert!(raffle.tickets_sold >= 3, ENotMinimumTickets);
        
        // Verify raffle is released
        assert!(raffle.is_released, ERaffleNotEnded);
        
        // Verify organizer hasn't claimed yet
        assert!(!raffle.organizer_claimed, EAlreadyClaimed);

        // Mark as claimed
        raffle.organizer_claimed = true;

        // Calculate and transfer organizer's share
        let organizer_share = (raffle.prize_pool * ORGANIZER_PERCENTAGE) / 100;
        let organizer_prize = coin::from_balance(balance::split(&mut raffle.balance, organizer_share), ctx);
        transfer::public_transfer(organizer_prize, raffle.organizer);
    }

    /// Check if a raffle is in return state (ended with less than 3 tickets)
    public fun is_in_return_state(raffle: &Raffle, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        current_time > raffle.end_time && !raffle.is_released && raffle.tickets_sold < 3
    }

    /// Return ticket and get refund when raffle has ended with less than 3 tickets
    public entry fun return_ticket(
        raffle: &mut Raffle,
        ticket: Ticket,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Check if raffle is in return state
        assert!(is_in_return_state(raffle, clock), ERaffleNotEnded);
        
        // Verify ticket belongs to this raffle
        assert!(ticket.raffle_id == object::id(raffle), EInvalidTicket);
        
        // Calculate refund amount
        let refund_amount = raffle.ticket_price;
        
        // Transfer refund
        let refund = coin::from_balance(balance::split(&mut raffle.balance, refund_amount), ctx);
        transfer::public_transfer(refund, tx_context::sender(ctx));

        // Burn the ticket
        let Ticket { id, raffle_id: _, ticket_number: _ } = ticket;
        object::delete(id);
    }

    // === View Functions ===

    /// Get detailed raffle information
    public fun get_raffle_info(raffle: &Raffle): (
        String, // name
        String, // description
        String, // image
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
            raffle.name,
            raffle.description,
            raffle.image,
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
        vector<u64> // winning_ticket_numbers
    ) {
        if (!raffle.is_released) {
            return (false, vector::empty())
        };
        let mut winning_tickets = vector::empty<u64>();
        let mut i = 0;
        let len = vector::length(&raffle.winning_tickets);
        while (i < len) {
            let ticket = *vector::borrow(&raffle.winning_tickets, i);
            vector::push_back(&mut winning_tickets, ticket);
            i = i + 1;
        };
        (true, winning_tickets)
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
        if (!vector::contains(&raffle.winning_tickets, &ticket_number)) {
            return (false, 0)
        };
        let total_balance = raffle.prize_pool;
        let prize_amount = if (ticket_number == *vector::borrow(&raffle.winning_tickets, 0)) {
            (total_balance * FIRST_PRIZE_PERCENTAGE) / 100
        } else if (ticket_number == *vector::borrow(&raffle.winning_tickets, 1)) {
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


