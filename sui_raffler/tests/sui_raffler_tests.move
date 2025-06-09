#[test_only]
module sui_raffler::sui_raffler_tests;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;
use std::debug;
use std::string;

/// Helper function to mint SUI coins for testing
fun mint(addr: address, amount: u64, scenario: &mut ts::Scenario) {
    transfer::public_transfer(coin::mint_for_testing<SUI>(amount, scenario.ctx()), addr);
    scenario.next_tx(addr);
}


/// Test the complete raffle flow:
/// 1. Initialize module configuration
/// 2. Create a raffle
/// 3. Buy tickets
/// 4. Release raffle and select winners
#[test]
fun test_raffle_flow() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    let fee_collector = @0xFEE5;
    let controller = @0x1235;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 5;

    // Start with system address for random setup
    let mut ts = ts::begin(@0x0);

    // Setup randomness
    random::create_for_testing(ts.ctx());
    ts.next_tx(@0x0);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(
        0,
        x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
        ts.ctx(),
    );

    // Initialize module configuration
    ts.next_tx(admin);
    sui_raffler::initialize(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    assert!(sui_raffler::get_config_fee_collector(&config) == fee_collector, 1);

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(&config, start_time, end_time, ticket_price, max_tickets, organizer, ts.ctx());
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();
    assert!(sui_raffler::get_tickets_sold(&raffle) == 0, 1);

    // Buyer buys tickets
    ts.next_tx(buyer);
    mint(buyer, ticket_price * 3, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());
    assert!(sui_raffler::get_tickets_sold(&raffle) == 3, 1);

    // Test view functions before release
    let (start_time, end_time, price, max_tix, org, fee_col, balance, sold, released, total, first, second, third, org_share, fee) = 
        sui_raffler::get_raffle_info(&raffle);
    assert!(start_time == 0, 1);
    assert!(end_time == 1000, 1);
    assert!(price == 100, 1);
    assert!(max_tix == 5, 1);
    assert!(org == organizer, 1);
    assert!(fee_col == fee_collector, 1);
    assert!(balance == 300, 1);
    assert!(sold == 3, 1);
    assert!(!released, 1);
    assert!(total == 300, 1);
    assert!(first == 150, 1);
    assert!(second == 75, 1);
    assert!(third == 30, 1);
    assert!(org_share == 30, 1);
    assert!(fee == 15, 1);

    let (total_sold, volume, avg_tix, time_left, is_active) = sui_raffler::get_raffle_stats(&raffle, &clock);
    assert!(total_sold == 3, 1);
    assert!(volume == 300, 1);
    assert!(avg_tix == 100, 1);
    assert!(time_left > 0, 1);
    assert!(is_active, 1);

    let (has_winners, winners) = sui_raffler::get_winners(&raffle);
    assert!(!has_winners, 1);
    assert!(vector::is_empty(&winners), 1);

    // Controller releases raffle after end_time
    ts.next_tx(controller);
    clock.set_for_testing(end_time + 1);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());
    assert!(sui_raffler::is_released(&raffle), 1);

    // Test view functions after release
    let (has_winners, winners) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 1);
    assert!(vector::length(&winners) == 3, 1);

    // Verify all winning tickets are different
    let ticket1 = *vector::borrow(&winners, 0);
    let ticket2 = *vector::borrow(&winners, 1);
    let ticket3 = *vector::borrow(&winners, 2);
    assert!(ticket1 != ticket2 && ticket2 != ticket3 && ticket1 != ticket3, 1);

    // Test claim prize for buyer
    ts.next_tx(buyer);
    let mut buyer_tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer_tickets, ticket);
        i = i + 1;
    };
    
    // Check each ticket for buyer
    while (!vector::is_empty(&buyer_tickets)) {
        let ticket = vector::pop_back(&mut buyer_tickets);
        let (is_winner, prize_amount) = sui_raffler::is_winning_ticket(&raffle, &ticket);
        if (is_winner) {
            sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
            ts.next_tx(buyer);
            let prize_coin: Coin<SUI> = ts.take_from_sender();
            let received_amount = coin::value(&prize_coin);
            assert!(received_amount == prize_amount, 1);
            transfer::public_transfer(prize_coin, buyer);
        } else {
            transfer::public_transfer(ticket, buyer);
        };
    };
    vector::destroy_empty(buyer_tickets);

    // Test organizer's share
    let (_, _, _, _, _, _, _, _, _, _, _, _, _, org_share, _) = sui_raffler::get_raffle_info(&raffle);
    assert!(org_share == 30, 1); // 10% of 300 = 30

    // Test fee collector's share
    let (_, _, _, _, _, _, _, _, _, _, _, _, _, _, fee) = sui_raffler::get_raffle_info(&raffle);
    assert!(fee == 15, 1); // 5% of 300 = 15
    
    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test fee collector update functionality
#[test]
fun test_fee_collector_update() {
    let admin = @0xAD;
    let initial_fee_collector = @0xFEE5;
    let new_fee_collector = @0xFEE6;
    let controller = @0x1235;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::initialize(admin, controller, initial_fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    assert!(sui_raffler::get_config_fee_collector(&config) == initial_fee_collector, 1);

    // Update fee collector as admin
    sui_raffler::update_fee_collector(&mut config, new_fee_collector, ts.ctx());
    assert!(sui_raffler::get_config_fee_collector(&config) == new_fee_collector, 1);

    // Return objects and end scenario
    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin cannot update fee collector
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_fee_collector_update_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let initial_fee_collector = @0xFEE5;
    let new_fee_collector = @0xFEE6;
    let controller = @0x1235;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::initialize(admin, controller, initial_fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to update fee collector as non-admin
    ts.next_tx(non_admin);
    sui_raffler::update_fee_collector(&mut config, new_fee_collector, ts.ctx());

    // Return objects and end scenario
    ts::return_shared(config);
    ts.end();
}

/// Test that invalid organizer address is rejected
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidOrganizer)]
fun test_invalid_organizer() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let fee_collector = @0xFEE5;
    let controller = @0x1235;
    let invalid_organizer = @0x0;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::initialize(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Try to create raffle with invalid organizer address
    ts.next_tx(creator);
    sui_raffler::create_raffle(&config, 0, 1000, 100, 5, invalid_organizer, ts.ctx());

    // Return objects and end scenario
    ts::return_shared(config);
    ts.end();
}

/// Test raffle balances and fee distribution
#[test]
fun test_happy_path_raffle() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let buyer3 = @0xB0B3;
    let fee_collector = @0xFEE5;
    let controller = @0x1235;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 10;

    // Start with system address for random setup
    let mut ts = ts::begin(@0x0);

    // Setup randomness
    random::create_for_testing(ts.ctx());
    ts.next_tx(@0x0);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(
        0,
        x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
        ts.ctx(),
    );

    // Initialize module configuration
    ts.next_tx(admin);
    sui_raffler::initialize(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    assert!(sui_raffler::get_config_fee_collector(&config) == fee_collector, 1);

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(&config, start_time, end_time, ticket_price, max_tickets, organizer, ts.ctx());
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();
    assert!(sui_raffler::get_tickets_sold(&raffle) == 0, 1);

    // Buyer1 buys 3 tickets (cost: 300)
    ts.next_tx(buyer1);
    mint(buyer1, 300, &mut ts); // Mint exact amount needed
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin1, 3, &clock, ts.ctx());
    
    // Verify state after first purchase
    let (_, _, _, _, _, _, balance, sold, _, total, _, _, _, _, _) = sui_raffler::get_raffle_info(&raffle);
    debug::print(&string::utf8(b"=== AFTER FIRST PURCHASE ==="));
    debug::print(&string::utf8(b"Balance: "));
    debug::print(&balance);
    debug::print(&string::utf8(b"Tickets sold: "));
    debug::print(&sold);
    debug::print(&string::utf8(b"Total: "));
    debug::print(&total);
    assert!(sold == 3, 1);
    assert!(balance == 300, 1);
    assert!(total == 300, 1);

    // Buyer2 buys 2 tickets (cost: 200)
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts); // Mint exact amount needed
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&mut raffle, coin2, 2, &clock, ts.ctx());
    
    // Verify state after second purchase
    let (_, _, _, _, _, _, balance, sold, _, total, _, _, _, _, _) = sui_raffler::get_raffle_info(&raffle);
    debug::print(&string::utf8(b"=== AFTER SECOND PURCHASE ==="));
    debug::print(&string::utf8(b"Balance: "));
    debug::print(&balance);
    debug::print(&string::utf8(b"Tickets sold: "));
    debug::print(&sold);
    debug::print(&string::utf8(b"Total: "));
    debug::print(&total);
    assert!(sold == 5, 1);
    assert!(balance == 500, 1);
    assert!(total == 500, 1);

    // Buyer3 buys 4 tickets (cost: 400)
    ts.next_tx(buyer3);
    mint(buyer3, 400, &mut ts); // Mint exact amount needed
    let coin3: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&mut raffle, coin3, 4, &clock, ts.ctx());
    
    // Verify state after third purchase
    let (_, _, _, _, _, _, balance, sold, _, total, first, second, third, org_share, fee) = sui_raffler::get_raffle_info(&raffle);
    debug::print(&string::utf8(b"=== AFTER THIRD PURCHASE ==="));
    debug::print(&string::utf8(b"Balance: "));
    debug::print(&balance);
    debug::print(&string::utf8(b"Tickets sold: "));
    debug::print(&sold);
    debug::print(&string::utf8(b"Total: "));
    debug::print(&total);
    debug::print(&string::utf8(b"First prize share: "));
    debug::print(&first);
    debug::print(&string::utf8(b"Second prize share: "));
    debug::print(&second);
    debug::print(&string::utf8(b"Third prize share: "));
    debug::print(&third);
    debug::print(&string::utf8(b"Organizer share: "));
    debug::print(&org_share);
    debug::print(&string::utf8(b"Protocol fee: "));
    debug::print(&fee);
    assert!(sold == 9, 1);
    assert!(balance == 900, 1);
    assert!(total == 900, 1);
    assert!(first == 450, 1); // 50% of 900
    assert!(second == 225, 1); // 25% of 900
    assert!(third == 90, 1); // 10% of 900
    assert!(org_share == 90, 1); // 10% of 900
    assert!(fee == 45, 1); // 5% of 900

    // Controller releases raffle after end_time
    ts.next_tx(controller);
    clock.set_for_testing(end_time + 1);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());
    
    // Verify raffle is released and has winners
    assert!(sui_raffler::is_released(&raffle), 1);
    let (has_winners, winners) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 1);
    assert!(vector::length(&winners) == 3, 1);

    // Verify all winning tickets are different
    let ticket1 = *vector::borrow(&winners, 0);
    let ticket2 = *vector::borrow(&winners, 1);
    let ticket3 = *vector::borrow(&winners, 2);
    assert!(ticket1 != ticket2 && ticket2 != ticket3 && ticket1 != ticket3, 1);

    // Print values after release to confirm they are fixed
    let (_, _, _, _, _, _, balance, sold, _, total, first, second, third, org_share, fee) = sui_raffler::get_raffle_info(&raffle);
    debug::print(&string::utf8(b"=== AFTER RELEASE ==="));
    debug::print(&string::utf8(b"Balance: "));
    debug::print(&balance);
    debug::print(&string::utf8(b"Tickets sold: "));
    debug::print(&sold);
    debug::print(&string::utf8(b"Total prize pool: "));
    debug::print(&total);
    debug::print(&string::utf8(b"First prize share: "));
    debug::print(&first);
    debug::print(&string::utf8(b"Second prize share: "));
    debug::print(&second);
    debug::print(&string::utf8(b"Third prize share: "));
    debug::print(&third);
    debug::print(&string::utf8(b"Organizer share: "));
    debug::print(&org_share);
    debug::print(&string::utf8(b"Protocol fee: "));
    debug::print(&fee);
    assert!(total == 900, 1); // Prize pool is fixed at release
    assert!(first == 450, 1); // 50% of 900
    assert!(second == 225, 1); // 25% of 900
    assert!(third == 90, 1); // 10% of 900
    assert!(org_share == 90, 1); // 10% of 900
    assert!(fee == 45, 1); // 5% of 900

    // Test claim prize for buyer1
    ts.next_tx(buyer1);
    let mut buyer1_tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer1_tickets, ticket);
        i = i + 1;
    };
    
    // Check each ticket for buyer1
    while (!vector::is_empty(&buyer1_tickets)) {
        let ticket = vector::pop_back(&mut buyer1_tickets);
        let (is_winner, prize_amount) = sui_raffler::is_winning_ticket(&raffle, &ticket);
        if (is_winner) {
            sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
            ts.next_tx(buyer1);
            let prize_coin: Coin<SUI> = ts.take_from_sender();
            let received_amount = coin::value(&prize_coin);
            assert!(received_amount == prize_amount, 1);
            transfer::public_transfer(prize_coin, buyer1);
        } else {
            transfer::public_transfer(ticket, buyer1);
        };
    };
    vector::destroy_empty(buyer1_tickets);

    // Test claim prize for buyer2
    ts.next_tx(buyer2);
    let mut buyer2_tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 2) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer2_tickets, ticket);
        i = i + 1;
    };
    
    // Check each ticket for buyer2
    while (!vector::is_empty(&buyer2_tickets)) {
        let ticket = vector::pop_back(&mut buyer2_tickets);
        let (is_winner, prize_amount) = sui_raffler::is_winning_ticket(&raffle, &ticket);
        if (is_winner) {
            sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
            ts.next_tx(buyer2);
            let prize_coin: Coin<SUI> = ts.take_from_sender();
            let received_amount = coin::value(&prize_coin);
            assert!(received_amount == prize_amount, 1);
            transfer::public_transfer(prize_coin, buyer2);
        } else {
            transfer::public_transfer(ticket, buyer2);
        };
    };
    vector::destroy_empty(buyer2_tickets);

    // Test claim prize for buyer3
    ts.next_tx(buyer3);
    let mut buyer3_tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 4) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer3_tickets, ticket);
        i = i + 1;
    };
    
    // Check each ticket for buyer3
    while (!vector::is_empty(&buyer3_tickets)) {
        let ticket = vector::pop_back(&mut buyer3_tickets);
        let (is_winner, prize_amount) = sui_raffler::is_winning_ticket(&raffle, &ticket);
        if (is_winner) {
            sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
            ts.next_tx(buyer3);
            let prize_coin: Coin<SUI> = ts.take_from_sender();
            let received_amount = coin::value(&prize_coin);
            assert!(received_amount == prize_amount, 1);
            transfer::public_transfer(prize_coin, buyer3);
        } else {
            transfer::public_transfer(ticket, buyer3);
        };
    };
    vector::destroy_empty(buyer3_tickets);

    // Verify final state
    let (_, _, _, _, _, _, _, _, _, total, first, second, third, org_share, fee) = sui_raffler::get_raffle_info(&raffle);
    debug::print(&string::utf8(b"=== FINAL STATE ==="));
    debug::print(&string::utf8(b"Total prize pool: "));
    debug::print(&total);
    debug::print(&string::utf8(b"First prize share: "));
    debug::print(&first);
    debug::print(&string::utf8(b"Second prize share: "));
    debug::print(&second);
    debug::print(&string::utf8(b"Third prize share: "));
    debug::print(&third);
    debug::print(&string::utf8(b"Organizer share: "));
    debug::print(&org_share);
    debug::print(&string::utf8(b"Protocol fee: "));
    debug::print(&fee);
    assert!(total == 900, 1); // Prize pool is fixed at release
    assert!(first == 450, 1); // 50% of 900
    assert!(second == 225, 1); // 25% of 900
    assert!(third == 90, 1); // 10% of 900
    assert!(org_share == 90, 1); // 10% of 900
    assert!(fee == 45, 1); // 5% of 900

    // Test organizer's share claim
    ts.next_tx(organizer);
    sui_raffler::claim_organizer_share(&mut raffle, ts.ctx());
    ts.next_tx(organizer);
    let organizer_coin: Coin<SUI> = ts.take_from_sender();
    let organizer_amount = coin::value(&organizer_coin);
    assert!(organizer_amount == 90, 1); // 10% of 900
    transfer::public_transfer(organizer_coin, organizer);

    // Test protocol fee claim
    ts.next_tx(admin);
    sui_raffler::claim_protocol_fees(&config, &mut raffle, ts.ctx());
    ts.next_tx(fee_collector);
    let fee_coin: Coin<SUI> = ts.take_from_sender();
    let fee_amount = coin::value(&fee_coin);
    assert!(fee_amount == 45, 1); // 5% of 900
    transfer::public_transfer(fee_coin, fee_collector);

    // Verify final balance is 0 after all claims
    let (_, _, _, _, _, _, final_balance, _, _, _, _, _, _, _, _) = sui_raffler::get_raffle_info(&raffle);
    assert!(final_balance == 0, 1);

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}
