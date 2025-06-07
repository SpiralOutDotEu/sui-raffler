/*
/// Module: sui_raffler
module sui_raffler::sui_raffler;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module sui_raffler::sui_raffler {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::random::{Self, Random};
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::vec_map::{Self, VecMap};
    use sui::event;
    use sui::test_utils;
    use sui::test_scenario;

    // Constants for prize distribution
    const FIRST_PRIZE_PERCENTAGE: u64 = 50;
    const SECOND_PRIZE_PERCENTAGE: u64 = 25;
    const THIRD_PRIZE_PERCENTAGE: u64 = 10;
    const ORGANIZER_PERCENTAGE: u64 = 10;
    const PROTOCOL_FEE_PERCENTAGE: u64 = 5;

    // Error codes
    const ENotAdmin: u64 = 0;
    const EInvalidDates: u64 = 1;
    const EInvalidTicketPrice: u64 = 2;
    const EInvalidMaxTickets: u64 = 3;
    const ERaffleNotActive: u64 = 4;
    const ERaffleNotEnded: u64 = 5;
    const ERaffleAlreadyReleased: u64 = 6;
    const EInvalidTicketAmount: u64 = 7;
    const EInvalidTicket: u64 = 8;
    const ENotWinner: u64 = 9;

    /// The main raffle factory object that holds the admin address
    public struct RaffleFactory has key {
        id: UID,
        admin: address,
    }

    /// A raffle object that holds all the raffle information
    public struct Raffle has key {
        id: UID,
        start_time: u64,
        end_time: u64,
        ticket_price: u64,
        max_tickets_per_purchase: u64,
        organizer: address,
        fee_collector: address,
        balance: Balance<SUI>,
        tickets_sold: u64,
        is_released: bool,
        winners: VecMap<u64, address>, // Maps ticket numbers to winner addresses
    }

    /// A ticket object that represents a raffle ticket
    public struct Ticket has key, store {
        id: UID,
        raffle_id: ID,
        ticket_number: u64,
    }

    // === Events ===
    public struct RaffleCreated has copy, drop {
        raffle_id: ID,
        organizer: address,
        start_time: u64,
        end_time: u64,
        ticket_price: u64,
    }

    public struct TicketsPurchased has copy, drop {
        raffle_id: ID,
        buyer: address,
        amount: u64,
        start_ticket: u64,
        end_ticket: u64,
    }

    public struct RaffleReleased has copy, drop {
        raffle_id: ID,
        first_winner: address,
        second_winner: address,
        third_winner: address,
    }

    // === Functions ===

    /// Initialize the raffle factory with an admin address
    public entry fun create_factory(admin: address, ctx: &mut TxContext) {
        let factory = RaffleFactory {
            id: object::new(ctx),
            admin,
        };
        transfer::share_object(factory);
    }

    /// Create a new raffle
    public entry fun create_raffle(
        factory: &RaffleFactory,
        start_time: u64,
        end_time: u64,
        ticket_price: u64,
        max_tickets_per_purchase: u64,
        organizer: address,
        fee_collector: address,
        ctx: &mut TxContext
    ) {
        // Only admin can create raffles
        assert!(factory.admin == tx_context::sender(ctx), ENotAdmin);
        
        // Validate dates
        assert!(start_time < end_time, EInvalidDates);
        
        // Validate ticket price
        assert!(ticket_price > 0, EInvalidTicketPrice);
        
        // Validate max tickets
        assert!(max_tickets_per_purchase > 0, EInvalidMaxTickets);

        let raffle = Raffle {
            id: object::new(ctx),
            start_time,
            end_time,
            ticket_price,
            max_tickets_per_purchase,
            organizer,
            fee_collector,
            balance: balance::zero(),
            tickets_sold: 0,
            is_released: false,
            winners: vec_map::empty(),
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

        // Winner addresses
        let winner1 = @0x1;
        let winner2 = @0x2;
        let winner3 = @0x3;

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

        // Store winners with different addresses
        vec_map::insert(&mut raffle.winners, first_winner, winner1);
        vec_map::insert(&mut raffle.winners, second_winner, winner2);
        vec_map::insert(&mut raffle.winners, third_winner, winner3);

        raffle.is_released = true;

        // Emit event
        event::emit(RaffleReleased {
            raffle_id: object::id(raffle),
            first_winner: winner1,
            second_winner: winner2,
            third_winner: winner3,
        });
    }

    /// Claim prize with a winning ticket
    public entry fun claim_prize(
        raffle: &mut Raffle,
        ticket: Ticket,
        ctx: &mut TxContext
    ) {
        // Verify ticket belongs to this raffle
        assert!(object::id(&ticket) == object::id(raffle), EInvalidTicket);
        
        // Verify ticket is a winner
        let ticket_number = ticket.ticket_number;
        let winners = &raffle.winners;
        assert!(vec_map::contains(winners, &ticket_number), ENotWinner);

        // Calculate prize amount based on position
        let total_balance = balance::value(&raffle.balance);
        let winner_keys = vec_map::keys(winners);
        let prize_amount = if (ticket_number == winner_keys[0]) {
            (total_balance * FIRST_PRIZE_PERCENTAGE) / 100
        } else if (ticket_number == winner_keys[1]) {
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

    // === View Functions ===

    /// Get raffle information
    public fun get_raffle_info(raffle: &Raffle): (
        u64, // start_time
        u64, // end_time
        u64, // ticket_price
        u64, // max_tickets_per_purchase
        address, // organizer
        address, // fee_collector
        u64, // balance
        u64, // tickets_sold
        bool // is_released
    ) {
        (
            raffle.start_time,
            raffle.end_time,
            raffle.ticket_price,
            raffle.max_tickets_per_purchase,
            raffle.organizer,
            raffle.fee_collector,
            balance::value(&raffle.balance),
            raffle.tickets_sold,
            raffle.is_released
        )
    }

    // === Test Helpers ===

    #[test_only]
    public fun get_factory_admin(factory: &RaffleFactory): address {
        factory.admin
    }

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
}


