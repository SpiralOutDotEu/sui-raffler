#[test_only]
module sui_raffler::error_condition_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;
use std::string;

/// Test that cannot buy tickets before start time
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleNotActive)]
fun test_buy_tickets_before_start() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        organizer,
        organizer,
        1000,
        2000,
        100,
        5,
        &mut ts
    );

    // Try to buy tickets before start time
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that cannot buy tickets after end time
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleNotActive)]
fun test_buy_tickets_after_end() {
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

    // Try to buy tickets after end time
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    clock.set_for_testing(1001);
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that cannot buy zero tickets
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidTicketAmount)]
fun test_buy_tickets_zero_amount() {
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

    // Try to buy 0 tickets (should fail)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 100, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 0, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that cannot buy more than max_tickets_per_address in a single transaction
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidTicketAmount)]
fun test_buy_tickets_exceeds_per_purchase_limit() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets_per_address = 3; // enforce small cap

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        organizer,
        organizer,
        start_time,
        end_time,
        ticket_price,
        max_tickets_per_address,
        &mut ts
    );

    // Try to buy 4 tickets (> 3 limit)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, ticket_price * 4, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 4, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that two within-limit purchases cumulatively exceeding the limit will fail
#[test]
#[expected_failure(abort_code = sui_raffler::EExceedsPerUserLimit)]
fun test_buy_tickets_two_txs_exceed_cumulative_limit() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets_per_address = 3; // cap per user cumulatively

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        organizer,
        organizer,
        start_time,
        end_time,
        ticket_price,
        max_tickets_per_address,
        &mut ts
    );

    // First purchase: 2 tickets (within 3)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, ticket_price * 2, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 2, &clock, ts.ctx());

    // Second purchase: 2 tickets (2 + 2 = 4 > 3) should fail
    ts.next_tx(buyer);
    test_helpers::mint(buyer, ticket_price * 2, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that cannot release raffle before end time
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleNotEnded)]
fun test_release_raffle_before_end() {
    let admin = @0xAD;
    let organizer = @0x1234;

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

    // Try to release raffle before end time
    ts.next_tx(admin);
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that cannot release raffle twice
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleAlreadyReleased)]
fun test_release_raffle_twice() {
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

    // Try to release raffle again
    ts.next_tx(admin);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that cannot claim organizer share twice
#[test]
#[expected_failure(abort_code = sui_raffler::EAlreadyClaimed)]
fun test_claim_organizer_share_twice() {
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

    // Claim organizer share
    ts.next_tx(organizer);
    sui_raffler::claim_organizer_share(&mut raffle, ts.ctx());

    // Try to claim organizer share again
    ts.next_tx(organizer);
    sui_raffler::claim_organizer_share(&mut raffle, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that cannot burn tickets before raffle is released
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleNotEnded)]
fun test_burn_tickets_before_release() {
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
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

    // Try to burn tickets before release
    ts.next_tx(buyer);
    let mut tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut tickets, ticket);
        i = i + 1;
    };
    sui_raffler::burn_tickets(&mut raffle, tickets, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that cannot burn tickets from different raffle
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidTicket)]
fun test_burn_tickets_different_raffle() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;

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
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());
    let payment_coin2 = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create first raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle 1"),
        string::utf8(b"Test Description 1"),
        string::utf8(b"https://example.com/image1.jpg"),
        0,
        1000,
        100,
        5,
        organizer,
        ts.ctx()
    );
    ts.next_tx(organizer);
    let mut raffle1 = ts.take_shared<sui_raffler::Raffle>();

    // Create second raffle with different timing to ensure different ticket numbers
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        payment_coin2,
        string::utf8(b"Test Raffle 2"),
        string::utf8(b"Test Description 2"),
        string::utf8(b"https://example.com/image2.jpg"),
        0,
        1000,
        100,
        5,
        organizer,
        ts.ctx()
    );
    ts.next_tx(organizer);
    let mut raffle2 = ts.take_shared<sui_raffler::Raffle>();

    // Buyer buys tickets from raffle1 first (tickets 1-3)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle1, coin1, 3, &clock, ts.ctx());

    // Buyer buys tickets from raffle2 (tickets 1-3, but different raffle ID)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle2, coin2, 3, &clock, ts.ctx());

    // Release both raffles
    ts.next_tx(admin);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle1, &random_state, &clock, ts.ctx());
    sui_raffler::release_raffle(&config, &mut raffle2, &random_state, &clock, ts.ctx());

    // Collect tickets from raffle2 only
    ts.next_tx(buyer);
    let mut raffle2_tickets = vector::empty<sui_raffler::Ticket>();
    
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut raffle2_tickets, ticket);
        i = i + 1;
    };

    // Try to burn raffle2 tickets using raffle1 (should fail with EInvalidTicket)
    // because raffle2 tickets have different raffle_id than raffle1
    sui_raffler::burn_tickets(&mut raffle1, raffle2_tickets, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle1);
    ts::return_shared(raffle2);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that cannot create raffle when not permissionless and not admin
#[test]
#[expected_failure(abort_code = sui_raffler::EPermissionDenied)]
fun test_create_raffle_not_permissionless() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Set permissionless to false
    ts.next_tx(admin);
    sui_raffler::set_permissionless(&mut config, false, ts.ctx());

    // Try to create raffle as non-admin
    ts.next_tx(non_admin);
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
        organizer,
        ts.ctx()
    );

    ts::return_shared(config);
    ts.end();
}

/// Test that cannot create raffle with invalid dates (start_time >= end_time)
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidDates)]
fun test_create_raffle_invalid_dates() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Try to create raffle with start_time >= end_time
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        1000, // start_time
        1000, // end_time (same as start_time - should fail)
        100,
        5,
        organizer,
        ts.ctx()
    );

    ts::return_shared(config);
    ts.end();
}

/// Test that cannot create raffle with start_time > end_time
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidDates)]
fun test_create_raffle_start_after_end() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Try to create raffle with start_time > end_time
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        2000, // start_time
        1000, // end_time (before start_time - should fail)
        100,
        5,
        organizer,
        ts.ctx()
    );

    ts::return_shared(config);
    ts.end();
}

/// Test that cannot create raffle with zero ticket price
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidTicketPrice)]
fun test_create_raffle_zero_ticket_price() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Try to create raffle with ticket_price = 0
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        0,
        1000,
        0, // ticket_price = 0 (should fail)
        5,
        organizer,
        ts.ctx()
    );

    ts::return_shared(config);
    ts.end();
}

/// Test that cannot create raffle with zero max tickets per address
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidMaxTickets)]
fun test_create_raffle_zero_max_tickets() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Try to create raffle with max_tickets_per_address = 0
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        0,
        1000,
        100,
        0, // max_tickets_per_address = 0 (should fail)
        organizer,
        ts.ctx()
    );

    ts::return_shared(config);
    ts.end();
}
