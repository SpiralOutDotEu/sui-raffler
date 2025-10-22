#[test_only]
module sui_raffler::view_function_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::Coin;
use sui::sui::SUI;

/// Test the is_latest_version view function
#[test]
fun test_is_latest_version() {
    let admin = @0xAD;
    let current_version = sui_raffler::get_current_contract_version();
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Config should be initialized with latest version
    assert!(sui_raffler::is_latest_version(&config), 0);
    
    // Test with older version
    sui_raffler::stub_config_version(&mut config, current_version - 1);
    assert!(!sui_raffler::is_latest_version(&config), 1);
    
    // Test with current version
    sui_raffler::stub_config_version(&mut config, current_version);
    assert!(sui_raffler::is_latest_version(&config), 2);
    
    // Test with future version
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    assert!(!sui_raffler::is_latest_version(&config), 3);
    
    ts::return_shared(config);
    ts.end();
}

/// Test the get_current_contract_version view function
#[test]
fun test_get_current_contract_version() {
    let current_version = sui_raffler::get_current_contract_version();
    
    // Verify it returns a valid version number (should be 2 currently)
    assert!(current_version > 0, 0);
    
    // Test that it's consistent with the config version checking
    let admin = @0xAD;
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Config should be initialized with current version
    assert!(sui_raffler::is_latest_version(&config), 1);
    
    // Stub config to current version and verify it matches
    sui_raffler::stub_config_version(&mut config, current_version);
    assert!(sui_raffler::is_latest_version(&config), 2);
    
    ts::return_shared(config);
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
        max_per_addr,
        &mut ts
    );

    // Before any purchase: purchased=0, remaining=max
    let (p0, r0) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p0 == 0, 1);
    assert!(r0 == max_per_addr, 1);

    // Buyer buys 2 tickets
    ts.next_tx(buyer);
    test_helpers::mint(buyer, ticket_price * 2, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 2, &clock, ts.ctx());

    // After first purchase: purchased=2, remaining=1
    let (p1, r1) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p1 == 2, 1);
    assert!(r1 == 1, 1);

    // Buyer buys 1 more (reaches cap)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, ticket_price, &mut ts);
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

/// Test the is_raffle_visible view function
#[test]
fun test_is_raffle_visible() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
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

    // Verify raffle is visible by default
    assert!(sui_raffler::is_raffle_visible(&raffle), 1);

    // Admin sets visibility to false
    ts.next_tx(admin);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, false, ts.ctx());
    assert!(!sui_raffler::is_raffle_visible(&raffle), 1);

    // Admin sets visibility back to true
    ts.next_tx(admin);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, true, ts.ctx());
    assert!(sui_raffler::is_raffle_visible(&raffle), 1);

    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test the is_winning_ticket view function when raffle is not released
#[test]
fun test_is_winning_ticket_not_released() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
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
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

    // Get buyer's tickets
    ts.next_tx(buyer);
    let mut tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut tickets, ticket);
        i = i + 1;
    };

    // Test is_winning_ticket when raffle is not released (should return false, 0)
    while (!vector::is_empty(&tickets)) {
        let ticket = vector::pop_back(&mut tickets);
        let (is_winner, prize_amount) = sui_raffler::is_winning_ticket(&raffle, &ticket);
        
        // Should return false and 0 when raffle is not released
        assert!(!is_winner, 1);
        assert!(prize_amount == 0, 1);
        
        transfer::public_transfer(ticket, buyer);
    };
    vector::destroy_empty(tickets);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test the get_raffle_stats view function when no tickets are sold
#[test]
fun test_get_raffle_stats_no_tickets_sold() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let raffle = test_helpers::create_basic_raffle(
        &config,
        organizer,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    let clock = clock::create_for_testing(ts.ctx());
    
    // Test get_raffle_stats when no tickets are sold
    let (total_sold, volume, avg_tix, time_left, is_active) = sui_raffler::get_raffle_stats(&raffle, &clock);
    
    // Should return 0 for average tickets per purchase when no tickets sold
    assert!(total_sold == 0, 1);
    assert!(volume == 0, 1);
    assert!(avg_tix == 0, 1); // This covers the else branch: { 0 }
    assert!(time_left > 0, 1); // Raffle hasn't ended yet
    assert!(is_active, 1);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test the get_raffle_stats view function when raffle has ended
#[test]
fun test_get_raffle_stats_raffle_ended() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
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

    // Set time after raffle end time
    clock.set_for_testing(1001);
    
    // Test get_raffle_stats when raffle has ended
    let (total_sold, volume, avg_tix, time_left, is_active) = sui_raffler::get_raffle_stats(&raffle, &clock);
    
    // Should return 0 for time remaining when raffle has ended
    assert!(total_sold == 3, 1);
    assert!(volume == 300, 1);
    assert!(avg_tix == 100, 1); // 300 / 3 = 100
    assert!(time_left == 0, 1); // This covers the else branch: { 0 }
    assert!(!is_active, 1);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}
