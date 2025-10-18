#[test_only]
module sui_raffler::creation_fee_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;
use std::string;

/// Test that non-admin with missing fee cannot create raffle when fee > 0
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidCreationFee)]
fun test_create_raffle_missing_fee_non_admin() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let organizer = @0x1234;
    let start_time = 0;
    let end_time = 1000;

    let mut ts = ts::begin(@0x0);
    random::create_for_testing(ts.ctx());
    ts.next_tx(@0x0);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(0, x"11", ts.ctx());

    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    ts.next_tx(admin);
    sui_raffler::update_creation_fee(&mut config, 10, ts.ctx());

    ts.next_tx(non_admin);
    // No payment case is now represented by wrong amount; pass zero to trigger failure
    sui_raffler::create_raffle(
        &config,
        coin::mint_for_testing<SUI>(0, ts.ctx()),
        string::utf8(b"Test Raffle"),
        string::utf8(b"Desc"),
        string::utf8(b"img"),
        start_time,
        end_time,
        1,
        3,
        organizer,
        ts.ctx()
    );
    // Cleanup (type-checking requires consuming values even on abort path)
    ts::return_shared(random_state);
    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin with wrong fee aborts
#[test]
#[expected_failure(abort_code = sui_raffler::EInvalidCreationFee)]
fun test_create_raffle_wrong_fee_non_admin() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let organizer = @0x1234;
    let start_time = 0;
    let end_time = 1000;

    let mut ts = ts::begin(@0x0);
    random::create_for_testing(ts.ctx());
    ts.next_tx(@0x0);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(0, x"22", ts.ctx());

    let config = test_helpers::init_config_and_get(admin, &mut ts);

    // Mint incorrect amount (e.g., 5)
    ts.next_tx(non_admin);
    // Mint a Coin<SUI> with less than 2 SUI (2_000_000_000 MIST) for creation fee
    let wrong_fee = coin::mint_for_testing<SUI>(1_000_000_000, ts.ctx());

    sui_raffler::create_raffle(
        &config,
        wrong_fee,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Desc"),
        string::utf8(b"img"),
        start_time,
        end_time,
        1,
        3,
        organizer,
        ts.ctx()
    );
    // Cleanup for type-checking
    ts::return_shared(random_state);
    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin with exact fee succeeds and fee goes to collector
#[test]
fun test_create_raffle_exact_fee_non_admin() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let organizer = @0x1234;

    let mut ts = ts::begin(@0x0);
    random::create_for_testing(ts.ctx());
    ts.next_tx(@0x0);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(0, x"33", ts.ctx());

    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    ts.next_tx(admin);
    sui_raffler::update_creation_fee(&mut config, 10_000_000_000, ts.ctx());

    // Mint exact fee for non_admin
    ts.next_tx(non_admin);
    let fee_coin = coin::mint_for_testing<SUI>(10_000_000_000, ts.ctx());

    // Create raffle with fee
    sui_raffler::create_raffle(
        &config,
        fee_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Desc"),
        string::utf8(b"img"),
        0,
        1000,
        1,
        3,
        organizer,
        ts.ctx()
    );
    
    // Verify the fee was transferred to fee collector
    ts.next_tx(sui_raffler::get_config_fee_collector(&config));
    let fee_collected : Coin<SUI> = ts.take_from_sender();
    assert!(coin::value(&fee_collected) == 10_000_000_000, 1);
    ts.return_to_sender(fee_collected);

    // Cleanup
    ts::return_shared(random_state);
    ts::return_shared(config);
    ts.end();
}

/// Test that admin providing a payment is refunded
#[test]
fun test_create_raffle_admin_refund_if_provided_coin() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(@0x0);
    random::create_for_testing(ts.ctx());
    ts.next_tx(@0x0);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(0, x"44", ts.ctx());

    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    ts.next_tx(admin);
    sui_raffler::update_creation_fee(&mut config, 0, ts.ctx());

    // Mint some amount and pass as payment; function should refund
    ts.next_tx(admin);
    let admin_coin = coin::mint_for_testing<SUI>(7, ts.ctx());

    sui_raffler::create_raffle(
        &config,
        admin_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Desc"),
        string::utf8(b"img"),
        0,
        1000,
        1,
        3,
        organizer,
        ts.ctx()
    );
    
    // Verify the coin was refunded to admin
    ts.next_tx(admin);
    let refunded_coin: Coin<SUI> = ts.take_from_sender();
    assert!(coin::value(&refunded_coin) == 7, 1);
    ts.return_to_sender(refunded_coin);
    
    // Cleanup
    ts::return_shared(random_state);
    ts::return_shared(config);
    ts.end();
}
