#[test_only]
module sui_raffler::ticket_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::Coin;
use sui::sui::SUI;

/// Test burn tickets functionality
#[test]
fun test_burn_tickets() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let buyer3 = @0xB0B3;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 10;

    // Start with system address for random setup
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        creator,
        organizer,
        start_time,
        end_time,
        ticket_price,
        max_tickets,
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
    clock.set_for_testing(end_time + 1);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Get winning tickets
    let (has_winners, winning_tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 1);
    assert!(vector::length(&winning_tickets) == 3, 1);
    
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

    // Separate winning and non-winning tickets
    let mut winning_tickets_vec = vector::empty<sui_raffler::Ticket>();
    let mut non_winning_tickets = vector::empty<sui_raffler::Ticket>();

    // Check buyer1's tickets
    i = 0;
    while (i < vector::length(&buyer1_tickets)) {
        let ticket = vector::borrow(&buyer1_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner || ticket_number == second_winner || ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut winning_tickets_vec, ticket);
        } else {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut non_winning_tickets, ticket);
        };
    };

    // Check buyer2's tickets
    i = 0;
    while (i < vector::length(&buyer2_tickets)) {
        let ticket = vector::borrow(&buyer2_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner || ticket_number == second_winner || ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut winning_tickets_vec, ticket);
        } else {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut non_winning_tickets, ticket);
        };
    };

    // Check buyer3's tickets
    i = 0;
    while (i < vector::length(&buyer3_tickets)) {
        let ticket = vector::borrow(&buyer3_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner || ticket_number == second_winner || ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut winning_tickets_vec, ticket);
        } else {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut non_winning_tickets, ticket);
        };
    };

    // Verify we have exactly 3 winning tickets and 4 non-winning tickets
    assert!(vector::length(&winning_tickets_vec) == 3, 1);
    assert!(vector::length(&non_winning_tickets) == 4, 1);

    // Combine all tickets to test the new behavior
    let mut all_tickets = vector::empty<sui_raffler::Ticket>();
    
    // Add winning tickets
    while (!vector::is_empty(&winning_tickets_vec)) {
        let ticket = vector::pop_back(&mut winning_tickets_vec);
        vector::push_back(&mut all_tickets, ticket);
    };
    
    // Add non-winning tickets
    while (!vector::is_empty(&non_winning_tickets)) {
        let ticket = vector::pop_back(&mut non_winning_tickets);
        vector::push_back(&mut all_tickets, ticket);
    };

    // Test burning tickets (should return winning tickets and burn non-winning ones)
    ts.next_tx(buyer1); // Use any address as sender
    sui_raffler::burn_tickets(&config, &mut raffle, all_tickets, ts.ctx());

    // Check that winning tickets were returned
    ts.next_tx(buyer1);
    let mut returned_tickets = vector::empty<sui_raffler::Ticket>();
    let mut j = 0;
    while (j < 3) { // Should get back 3 winning tickets
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut returned_tickets, ticket);
        j = j + 1;
    };

    // Verify that all returned tickets are winning tickets
    let mut returned_count = 0;
    i = 0;
    while (i < vector::length(&returned_tickets)) {
        let ticket = vector::borrow(&returned_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner || ticket_number == second_winner || ticket_number == third_winner) {
            returned_count = returned_count + 1;
        };
        i = i + 1;
    };
    assert!(returned_count == 3, 1); // All 3 winning tickets should be returned

    // Clean up returned tickets
    while (!vector::is_empty(&returned_tickets)) {
        let ticket = vector::pop_back(&mut returned_tickets);
        transfer::public_transfer(ticket, @0x0);
    };
    vector::destroy_empty(returned_tickets);

    // Clean up remaining ticket vectors
    vector::destroy_empty(buyer1_tickets);
    vector::destroy_empty(buyer2_tickets);
    vector::destroy_empty(buyer3_tickets);
    
    // Clean up the vectors that were used in the test
    vector::destroy_empty(winning_tickets_vec);
    vector::destroy_empty(non_winning_tickets);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}
