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

/// Helper: begin scenario at `system_addr` and set up deterministic randomness
fun begin_scenario_with_random(system_addr: address): (ts::Scenario, Random) {
    let mut ts = ts::begin(system_addr);
    random::create_for_testing(ts.ctx());
    ts.next_tx(system_addr);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(
        0,
        x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
        ts.ctx(),
    );
    (ts, random_state)
}

/// Helper: initialize config and return it, asserting nothing implicitly
fun init_config_and_get(admin: address, ts: &mut ts::Scenario): sui_raffler::Config {
    ts.next_tx(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    ts.take_shared<sui_raffler::Config>()
}

/// Helper: create a basic raffle with shared defaults
fun create_basic_raffle(
    config: &sui_raffler::Config,
    creator: address,
    organizer: address,
    start_time: u64,
    end_time: u64,
    ticket_price: u64,
    max_per_addr: u64,
    ts: &mut ts::Scenario,
): sui_raffler::Raffle {
    // fund creator a bit for creation if needed by tests
    mint(creator, 1000, ts);
    ts.next_tx(creator);
    let mut payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());
    sui_raffler::create_raffle(
        config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_per_addr,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    ts.take_shared<sui_raffler::Raffle>()
}

/// Helper: create a testing clock
fun new_clock(ts: &mut ts::Scenario): clock::Clock {
    clock::create_for_testing(ts.ctx())
}

/// Helper: buyer buys exactly `num` tickets paying `num * price`
fun buy_tickets_exact(
    config: &sui_raffler::Config,
    raffle: &mut sui_raffler::Raffle,
    buyer: address,
    num: u64,
    price: u64,
    clock: &clock::Clock,
    ts: &mut ts::Scenario,
) {
    ts.next_tx(buyer);
    mint(buyer, price * num, ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(config, raffle, coin, num, clock, ts.ctx());
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
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 5;

    // Scenario + randomness
    let (mut ts, random_state) = begin_scenario_with_random(@0x0);

    // Initialize module configuration and check fee collector
    let config = init_config_and_get(admin, &mut ts);
    assert!(sui_raffler::get_config_fee_collector(&config) == admin, 1);

    // Create raffle
    let mut raffle = create_basic_raffle(
        &config,
        creator,
        organizer,
        start_time,
        end_time,
        ticket_price,
        max_tickets,
        &mut ts,
    );
    assert!(sui_raffler::get_tickets_sold(&raffle) == 0, 1);

    // Buyer buys tickets
    let mut clock = new_clock(&mut ts);
    buy_tickets_exact(&config, &mut raffle, buyer, 3, ticket_price, &clock, &mut ts);
    assert!(sui_raffler::get_tickets_sold(&raffle) == 3, 1);

    // Test view functions before release
    let (name, description, image, start_time, end_time, price, max_tix, org, fee_col, balance, sold, released, total, first, second, third, org_share, fee) = 
        sui_raffler::get_raffle_info(&raffle);
    assert!(name == string::utf8(b"Test Raffle"), 1);
    assert!(description == string::utf8(b"Test Description"), 1);
    assert!(image == string::utf8(b"https://example.com/image.jpg"), 1);
    assert!(start_time == 0, 1);
    assert!(end_time == 1000, 1);
    assert!(price == 100, 1);
    assert!(max_tix == 5, 1);
    assert!(org == organizer, 1);
    assert!(fee_col == admin, 1);
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

    // Admin releases raffle after end_time
    ts.next_tx(admin);
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
    let (_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, org_share, _, _) = sui_raffler::get_raffle_info(&raffle);
    assert!(org_share == 30, 1); // 10% of 300 = 30

    // Test fee collector's share
    let (_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, fee) = sui_raffler::get_raffle_info(&raffle);
    assert!(fee == 15, 1); // 5% of 300 = 15
    
    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test the get_address_purchase_info view function
#[test]
fun test_get_address_purchase_info() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_per_addr = 3;

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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let mut payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_per_addr,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Before any purchase: purchased=0, remaining=max
    let (p0, r0) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p0 == 0, 1);
    assert!(r0 == max_per_addr, 1);

    // Buyer buys 2 tickets
    ts.next_tx(buyer);
    mint(buyer, ticket_price * 2, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 2, &clock, ts.ctx());

    // After first purchase: purchased=2, remaining=1
    let (p1, r1) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p1 == 2, 1);
    assert!(r1 == 1, 1);

    // Buyer buys 1 more (reaches cap)
    ts.next_tx(buyer);
    mint(buyer, ticket_price, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 1, &clock, ts.ctx());

    // After reaching cap: purchased=3, remaining=0
    let (p2, r2) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p2 == 3, 1);
    assert!(r2 == 0, 1);

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
    let new_fee_collector = @0xFEE6;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    assert!(sui_raffler::get_config_fee_collector(&config) == admin, 1);

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
    let new_fee_collector = @0xFEE6;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::init_for_testing(ts.ctx());
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
    let invalid_organizer = @0x0;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let mut payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Try to create raffle with invalid organizer address
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        0,
        1000,
        100,
        5,
        invalid_organizer,
        ts.ctx()
    );

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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    // Ensure no creation fee for default tests
    let mut payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());
    assert!(sui_raffler::get_config_fee_collector(&config) == admin, 1);

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_tickets,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();
    assert!(sui_raffler::get_tickets_sold(&raffle) == 0, 1);

    // Buyer1 buys 3 tickets (cost: 300)
    ts.next_tx(buyer1);
    mint(buyer1, 300, &mut ts); // Mint exact amount needed
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 3, &clock, ts.ctx());
    
    // Verify state after first purchase
    let (_, _, _, _, _, _, _, _, _, balance, sold, _, total, _first, _second, _third, _org_share, _fee) = sui_raffler::get_raffle_info(&raffle);
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());
    
    // Verify state after second purchase
    let (_, _, _, _, _, _, _, _, _, balance, sold, _, total, _first, _second, _third, _org_share, _fee) = sui_raffler::get_raffle_info(&raffle);
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin3, 4, &clock, ts.ctx());
    
    // Verify state after third purchase
    let (_, _, _, _, _, _, _, _, _, balance, sold, _, total, first, second, third, org_share, fee) = sui_raffler::get_raffle_info(&raffle);
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

    // Admin releases raffle after end_time
    ts.next_tx(admin);
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
    let (_, _, _, _, _, _, _, _, _, balance, sold, _, total, first, second, third, org_share, fee) = sui_raffler::get_raffle_info(&raffle);
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
    let (_, _, _, _, _, _, _, _, _, _final_balance, _, _, _, _, _, _, _, _) = sui_raffler::get_raffle_info(&raffle);
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

    // Verify final balance is 0 after all claims
    let (_, _, _, _, _, _, _, _, _, final_balance, _, _, _, _, _, _, _, _) = sui_raffler::get_raffle_info(&raffle);
    debug::print(&string::utf8(b"Final balance: "));
    debug::print(&final_balance);
    assert!(final_balance == 0, 1);

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that protocol fees are automatically collected during release_raffle
#[test]
fun test_protocol_fee_auto_collection() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer = @0xB0B;
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let mut payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_tickets,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Buyer buys 5 tickets (cost: 500)
    ts.next_tx(buyer);
    mint(buyer, 500, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 5, &clock, ts.ctx());

    // Verify initial state
    let (_, _, _, _, _, _, _, _, _, balance, sold, _, total, _, _, _, _, fee) = sui_raffler::get_raffle_info(&raffle);
    assert!(balance == 500, 1);
    assert!(sold == 5, 1);
    assert!(total == 500, 1);
    assert!(fee == 25, 1); // 5% of 500 = 25

    // Admin releases raffle after end_time
    ts.next_tx(admin);
    clock.set_for_testing(end_time + 1);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Verify protocol fees were automatically collected
    ts.next_tx(admin);
    let fee_coin: Coin<SUI> = ts.take_from_sender();
    let fee_amount = coin::value(&fee_coin);
    assert!(fee_amount == 25, 1); // 5% of 500 = 25
    transfer::public_transfer(fee_coin, admin);

    // Verify raffle state after release
    let (_, _, _, _, _, _, _, _, _, balance, sold, _, total, _, _, _, _, fee) = sui_raffler::get_raffle_info(&raffle);
    assert!(balance == 475, 1); // 500 - 25 (protocol fee)
    assert!(sold == 5, 1);
    assert!(total == 500, 1); // Total prize pool remains the same
    assert!(fee == 25, 1); // Fee amount remains the same

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}


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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let mut payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_tickets,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Buyer1 buys 3 tickets
    ts.next_tx(buyer1);
    mint(buyer1, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys 2 tickets
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());

    // Buyer3 buys 2 tickets
    ts.next_tx(buyer3);
    mint(buyer3, 200, &mut ts);
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
    sui_raffler::burn_tickets(&mut raffle, all_tickets, ts.ctx());

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

#[test]
fun test_init_for_testing() {
    let admin = @0xAD;
    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.end();
}

/// Test successful admin update by current admin
#[test]
fun test_update_admin_success() {
    let admin = @0xAD;
    let new_admin = @0xAD2;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Verify initial admin
    assert!(sui_raffler::is_admin(&config, admin), 0);

    // Update admin
    sui_raffler::update_admin(&mut config, new_admin, ts.ctx());

    // Verify admin was updated
    assert!(sui_raffler::is_admin(&config, new_admin), 1);
    assert!(!sui_raffler::is_admin(&config, admin), 2);

    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin cannot update admin
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_update_admin_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let new_admin = @0xAD2;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to update admin as non-admin
    ts.next_tx(non_admin);
    sui_raffler::update_admin(&mut config, new_admin, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

/// Test that admin can update admin to same address (should work)
#[test]
fun test_update_admin_to_same_address() {
    let admin = @0xAD;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Verify initial admin
    assert!(sui_raffler::is_admin(&config, admin), 0);

    // Update admin to same address
    sui_raffler::update_admin(&mut config, admin, ts.ctx());

    // Verify admin is still the same
    assert!(sui_raffler::is_admin(&config, admin), 1);

    ts::return_shared(config);
    ts.end();
}

/// Test that admin can update admin to zero address (edge case)
#[test]
fun test_update_admin_to_zero_address() {
    let admin = @0xAD;
    let zero_admin = @0x0;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Verify initial admin
    assert!(sui_raffler::is_admin(&config, admin), 0);

    // Update admin to zero address
    sui_raffler::update_admin(&mut config, zero_admin, ts.ctx());

    // Verify admin was updated to zero address
    assert!(sui_raffler::is_admin(&config, zero_admin), 1);
    assert!(!sui_raffler::is_admin(&config, admin), 2);

    ts::return_shared(config);
    ts.end();
}

/// Test multiple admin updates in sequence
#[test]
fun test_multiple_admin_updates() {
    let admin1 = @0xAD;
    let admin2 = @0xAD2;
    let admin3 = @0xAD3;

    let mut ts = ts::begin(admin1);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin1);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // First update: admin1 -> admin2
    sui_raffler::update_admin(&mut config, admin2, ts.ctx());
    assert!(sui_raffler::is_admin(&config, admin2), 0);
    assert!(!sui_raffler::is_admin(&config, admin1), 1);

    // Second update: admin2 -> admin3
    ts.next_tx(admin2);
    sui_raffler::update_admin(&mut config, admin3, ts.ctx());
    assert!(sui_raffler::is_admin(&config, admin3), 2);
    assert!(!sui_raffler::is_admin(&config, admin2), 3);
    assert!(!sui_raffler::is_admin(&config, admin1), 4);

    ts::return_shared(config);
    ts.end();
}

/// Test that controller cannot update admin
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_controller_cannot_update_admin() {
    let admin = @0xAD;
    let controller = @0x1236;
    let new_admin = @0xAD2;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Update controller to a different address
    sui_raffler::update_controller(&mut config, controller, ts.ctx());

    // Verify controller is set
    assert!(sui_raffler::is_controller(&config, controller), 0);
    assert!(sui_raffler::is_admin(&config, admin), 1);

    // Try to update admin as controller (should fail)
    ts.next_tx(controller);
    sui_raffler::update_admin(&mut config, new_admin, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

