#[test_only]
module sui_raffler::prize_claiming_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::Coin;
use sui::sui::SUI;

/// Test to log winning ticket numbers for prize claiming tests
#[test]
fun test_log_winning_tickets() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let buyer3 = @0xB0B3;

    // Start with system address for random setup
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        organizer,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    // Buyer1 buys 3 tickets
    ts.next_tx(buyer1);
    test_helpers::mint(buyer1, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys 2 tickets
    ts.next_tx(buyer2);
    test_helpers::mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());

    // Buyer3 buys 2 tickets
    ts.next_tx(buyer3);
    test_helpers::mint(buyer3, 200, &mut ts);
    let coin3: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin3, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(admin);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Log winning tickets
    let (has_winners, winning_tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 0);
    assert!(vector::length(&winning_tickets) == 3, 0);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test prize claiming functionality
#[test]
fun test_prize_claiming() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let buyer3 = @0xB0B3;

    // Start with system address for random setup
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        organizer,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    // Buyer1 buys 3 tickets
    ts.next_tx(buyer1);
    test_helpers::mint(buyer1, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys 2 tickets
    ts.next_tx(buyer2);
    test_helpers::mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());

    // Buyer3 buys 2 tickets
    ts.next_tx(buyer3);
    test_helpers::mint(buyer3, 200, &mut ts);
    let coin3: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin3, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(admin);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Get winning tickets
    let (has_winners, winning_tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 0);
    assert!(vector::length(&winning_tickets) == 3, 0);
    
    let first_winner = *vector::borrow(&winning_tickets, 0);
    let second_winner = *vector::borrow(&winning_tickets, 1);
    let third_winner = *vector::borrow(&winning_tickets, 2);

    // Collect all tickets
    let mut buyer1_tickets = vector::empty<sui_raffler::Ticket>();
    let mut buyer2_tickets = vector::empty<sui_raffler::Ticket>();
    let mut buyer3_tickets = vector::empty<sui_raffler::Ticket>();

    // Collect buyer1's tickets
    ts.next_tx(buyer1);
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer1_tickets, ticket);
        i = i + 1;
    };

    // Collect buyer2's tickets
    ts.next_tx(buyer2);
    i = 0;
    while (i < 2) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer2_tickets, ticket);
        i = i + 1;
    };

    // Collect buyer3's tickets
    ts.next_tx(buyer3);
    i = 0;
    while (i < 2) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer3_tickets, ticket);
        i = i + 1;
    };

    // Find winning tickets for each buyer
    let mut first_winner_ticket = vector::empty<sui_raffler::Ticket>();
    let mut second_winner_ticket = vector::empty<sui_raffler::Ticket>();
    let mut third_winner_ticket = vector::empty<sui_raffler::Ticket>();

    // Check buyer1's tickets
    i = 0;
    while (i < vector::length(&buyer1_tickets)) {
        let ticket = vector::borrow(&buyer1_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut first_winner_ticket, ticket);
        } else if (ticket_number == second_winner) {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut second_winner_ticket, ticket);
        } else if (ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut third_winner_ticket, ticket);
        } else {
            i = i + 1;
        };
    };

    // Check buyer2's tickets
    i = 0;
    while (i < vector::length(&buyer2_tickets)) {
        let ticket = vector::borrow(&buyer2_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut first_winner_ticket, ticket);
        } else if (ticket_number == second_winner) {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut second_winner_ticket, ticket);
        } else if (ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut third_winner_ticket, ticket);
        } else {
            i = i + 1;
        };
    };

    // Check buyer3's tickets
    i = 0;
    while (i < vector::length(&buyer3_tickets)) {
        let ticket = vector::borrow(&buyer3_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut first_winner_ticket, ticket);
        } else if (ticket_number == second_winner) {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut second_winner_ticket, ticket);
        } else if (ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut third_winner_ticket, ticket);
        } else {
            i = i + 1;
        };
    };

    // Claim prizes
    if (vector::length(&first_winner_ticket) > 0) {
        ts.next_tx(buyer1);
        let ticket = vector::pop_back(&mut first_winner_ticket);
        sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
    };
    if (vector::length(&second_winner_ticket) > 0) {
        ts.next_tx(buyer2);
        let ticket = vector::pop_back(&mut second_winner_ticket);
        sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
    };
    if (vector::length(&third_winner_ticket) > 0) {
        ts.next_tx(buyer3);
        let ticket = vector::pop_back(&mut third_winner_ticket);
        sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
    };

    // Clean up winner tickets
    vector::destroy_empty(first_winner_ticket);
    vector::destroy_empty(second_winner_ticket);
    vector::destroy_empty(third_winner_ticket);

    // Transfer remaining tickets to @0x0
    if (vector::length(&buyer1_tickets) > 0) {
        ts.next_tx(buyer1);
        while (vector::length(&buyer1_tickets) > 0) {
            let ticket = vector::pop_back(&mut buyer1_tickets);
            transfer::public_transfer(ticket, @0x0);
        };
    };
    if (vector::length(&buyer2_tickets) > 0) {
        ts.next_tx(buyer2);
        while (vector::length(&buyer2_tickets) > 0) {
            let ticket = vector::pop_back(&mut buyer2_tickets);
            transfer::public_transfer(ticket, @0x0);
        };
    };
    if (vector::length(&buyer3_tickets) > 0) {
        ts.next_tx(buyer3);
        while (vector::length(&buyer3_tickets) > 0) {
            let ticket = vector::pop_back(&mut buyer3_tickets);
            transfer::public_transfer(ticket, @0x0);
        };
    };
    vector::destroy_empty(buyer1_tickets);
    vector::destroy_empty(buyer2_tickets);
    vector::destroy_empty(buyer3_tickets);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that winning tickets are returned to caller instead of being burned
#[test]
fun test_burn_tickets_returns_winning_tickets() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    // Start with system address for random setup
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        organizer,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    // Buyer buys tickets
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(admin);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Get winning tickets
    let (has_winners, winning_tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 0);
    assert!(vector::length(&winning_tickets) == 3, 0);
    
    let first_winner = *vector::borrow(&winning_tickets, 0);

    // Collect buyer's tickets
    ts.next_tx(buyer);
    let mut tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut tickets, ticket);
        i = i + 1;
    };

    // Try to burn tickets (should return winning tickets and burn non-winning ones)
    sui_raffler::burn_tickets(&mut raffle, tickets, ts.ctx());

    // Check that winning tickets were returned
    ts.next_tx(buyer);
    let mut returned_tickets = vector::empty<sui_raffler::Ticket>();
    let mut j = 0;
    while (j < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut returned_tickets, ticket);
        j = j + 1;
    };

    // Verify that the winning ticket was returned
    let mut found_winner = false;
    i = 0;
    while (i < vector::length(&returned_tickets)) {
        let ticket = vector::borrow(&returned_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            found_winner = true;
        };
        i = i + 1;
    };
    assert!(found_winner, 1);

    // Clean up returned tickets
    while (!vector::is_empty(&returned_tickets)) {
        let ticket = vector::pop_back(&mut returned_tickets);
        transfer::public_transfer(ticket, @0x0);
    };
    vector::destroy_empty(returned_tickets);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}
