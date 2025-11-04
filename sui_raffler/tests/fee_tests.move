#[test_only]
module sui_raffler::fee_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::sui::SUI;

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

    // Buyer buys 5 tickets (cost: 500)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 500, &mut ts);
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
