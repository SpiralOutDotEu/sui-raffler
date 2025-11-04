#[test_only]
module sui_raffler::admin_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::coin;
use sui::sui::SUI;
use std::string;

/// Test successful admin update by current admin
#[test]
fun test_update_admin_success() {
    let admin = @0xAD;
    let new_admin = @0xAD2;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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

/// Test fee collector update functionality
#[test]
fun test_fee_collector_update() {
    let admin = @0xAD;
    let new_fee_collector = @0xFEE6;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
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
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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
    let mut config = ts.take_shared<sui_raffler::Config>();
    // Lower min ticket price for this test context
    ts.next_tx(admin);
    sui_raffler::update_min_ticket_price(&mut config, 0, ts.ctx());
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

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
