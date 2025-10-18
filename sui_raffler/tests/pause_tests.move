#[test_only]
module sui_raffler::pause_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use std::string;

/// Test that cannot buy tickets when raffle is paused
#[test]
#[expected_failure(abort_code = sui_raffler::ERafflePaused)]
fun test_cannot_buy_tickets_when_rafflepaused() {
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

    // Pause the raffle
    ts.next_tx(admin);
    sui_raffler::set_raffle_paused(&config, &mut raffle, true, ts.ctx());

    // Try to buy tickets when raffle is paused
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

/// Test that cannot buy tickets when contract is paused
#[test]
#[expected_failure(abort_code = sui_raffler::EPaused)]
fun test_cannot_buy_tickets_when_contract_paused() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    // Ensure no creation fee interferes when creating raffle
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
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
        5,
        organizer,
        ts.ctx()
    );
    ts.next_tx(organizer);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Pause the contract
    ts.next_tx(admin);
    sui_raffler::set_contract_paused(&mut config, true, ts.ctx());

    // Try to buy tickets when raffle is paused
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

/// Test that cannot create raffle when contract is paused
#[test]
#[expected_failure(abort_code = sui_raffler::EPaused)]
fun test_cannot_create_raffle_when_contract_paused() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Pause the contract
    ts.next_tx(admin);
    sui_raffler::set_contract_paused(&mut config, true, ts.ctx());

    // Create a raffle (should fail)
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
        5,
        organizer,
        ts.ctx()
    );

    ts::return_shared(config);
    ts.end();
}
