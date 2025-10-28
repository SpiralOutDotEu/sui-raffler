#[test_only]
module sui_raffler::min_ticket_price_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::coin;
use sui::sui::SUI;
use sui::clock;
use std::string;

/// Creating a raffle below the configured minimum should fail
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidTicketPrice)]
fun test_create_raffle_below_min_price_fails() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

    // Set min to 200 (in MIST units of the test domain)
    ts.next_tx(admin);
    sui_raffler::update_min_ticket_price(&mut config, 200, ts.ctx());

    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Try to create raffle with ticket_price = 100 (below min 200)
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Raffle"),
        string::utf8(b"Desc"),
        string::utf8(b"https://img"),
        0,
        1000,
        100, // below min
        5,
        organizer,
        ts.ctx()
    );

    ts::return_shared(config);
    ts.end();
}

/// Creating a raffle at or above the minimum should succeed
#[test]
fun test_create_raffle_at_min_price_succeeds() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer = @0x9999;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

    // Set min to 200
    ts.next_tx(admin);
    sui_raffler::update_min_ticket_price(&mut config, 200, ts.ctx());

    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create raffle at min price = 200
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
        string::utf8(b"Raffle"),
        string::utf8(b"Desc"),
        string::utf8(b"https://img"),
        0,
        1000,
        200, // at min
        5,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Ensure getter returns the configured min
    assert!(sui_raffler::get_min_ticket_price(&config) == 200, 0);

    // Verify raffle was created and is active
    assert!(sui_raffler::get_tickets_sold(&raffle) == 0, 1);
    assert!(sui_raffler::get_raffle_balance(&raffle) == 0, 2);

    // Create clock for the raffle
    let mut clock = clock::create_for_testing(ts.ctx());
    clock::set_for_testing(&mut clock, 500); // Set to middle of raffle period

    // Buy tickets to verify the raffle works
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 400, &mut ts);
    let coin: coin::Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 2, &clock, ts.ctx());

    // Verify tickets were purchased successfully
    assert!(sui_raffler::get_tickets_sold(&raffle) == 2, 3);
    assert!(sui_raffler::get_raffle_balance(&raffle) == 400, 4);

    // Clean up - return all objects
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}


