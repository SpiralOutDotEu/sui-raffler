#[test_only]
module sui_raffler::visibility_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::coin;
use sui::sui::SUI;
use std::string;

/// Test that admin can set raffle visibility
#[test]
fun test_set_raffle_visibility_admin() {
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
    assert!(sui_raffler::get_raffle_visibility(&raffle), 1);

    // Admin sets visibility to false
    ts.next_tx(admin);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, false, ts.ctx());
    assert!(!sui_raffler::get_raffle_visibility(&raffle), 1);

    // Admin sets visibility back to true
    ts.next_tx(admin);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, true, ts.ctx());
    assert!(sui_raffler::get_raffle_visibility(&raffle), 1);

    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that controller can set raffle visibility
#[test]
fun test_set_raffle_visibility_controller() {
    let admin = @0xAD;
    let controller = @0x1236;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Update controller
    sui_raffler::update_controller(&mut config, controller, ts.ctx());

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

    // Verify raffle is visible by default
    assert!(sui_raffler::get_raffle_visibility(&raffle), 1);

    // Controller sets visibility to false
    ts.next_tx(controller);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, false, ts.ctx());
    assert!(!sui_raffler::get_raffle_visibility(&raffle), 1);

    // Controller sets visibility back to true
    ts.next_tx(controller);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, true, ts.ctx());
    assert!(sui_raffler::get_raffle_visibility(&raffle), 1);

    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}
