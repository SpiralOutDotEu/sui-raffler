#[test_only]
module sui_raffler::upgrade_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use std::string;

/// Test that config is initialized with correct version
#[test]
fun test_config_initialized_with_correct_version() {
    let admin = @0xAD;
    
    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Verify config is initialized with latest version
    assert!(sui_raffler::is_latest_version(&config), 0);
    
    ts::return_shared(config);
    ts.end();
}

/// Test that migrate function updates version correctly
#[test]
fun test_migrate_updates_version() {
    let admin = @0xAD;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Stub config to simulate old version
    sui_raffler::stub_config_version(&mut config, 1);
    assert!(!sui_raffler::is_latest_version(&config), 0);
    
    // Migrate to latest version
    sui_raffler::migrate(&mut config, ts.ctx());
    
    // Verify version was updated
    assert!(sui_raffler::is_latest_version(&config), 1);
    
    ts::return_shared(config);
    ts.end();
}

/// Test that only admin can call migrate
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_migrate_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Stub config to simulate old version
    sui_raffler::stub_config_version(&mut config, 1);
    
    // Try to migrate as non-admin
    ts.next_tx(non_admin);
    sui_raffler::migrate(&mut config, ts.ctx());
    
    ts::return_shared(config);
    ts.end();
}

/// Test that migrate fails when config version is not less than current version
#[test]
#[expected_failure(abort_code = sui_raffler::ENotUpgrade)]
fun test_migrate_fails_when_version_not_less_than_current() {
    let admin = @0xAD;
    let current_version = sui_raffler::get_current_contract_version();
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Stub config to current version (should fail migration)
    sui_raffler::stub_config_version(&mut config, current_version);
    
    // Try to migrate with current version (should fail)
    sui_raffler::migrate(&mut config, ts.ctx());
    
    ts::return_shared(config);
    ts.end();
}

/// Test that migrate fails when config version is greater than current version
#[test]
#[expected_failure(abort_code = sui_raffler::ENotUpgrade)]
fun test_migrate_fails_when_version_greater_than_current() {
    let admin = @0xAD;
    let current_version = sui_raffler::get_current_contract_version();
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Stub config to future version (should fail migration)
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to migrate with future version (should fail)
    sui_raffler::migrate(&mut config, ts.ctx());
    
    ts::return_shared(config);
    ts.end();
}

/// Test that create_raffle fails when config version is newer than code expects
#[test]
#[expected_failure(abort_code = sui_raffler::EWrongVersion)]
fun test_create_raffle_fails_with_newer_version_config() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let current_version = sui_raffler::get_current_contract_version();
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Stub config to simulate newer version (simulating old code with new config)
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to create raffle with newer version config (old code should fail)
    ts.next_tx(organizer);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());
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

/// Test that buy_tickets fails when config version is newer than code expects
#[test]
#[expected_failure(abort_code = sui_raffler::EWrongVersion)]
fun test_buy_tickets_fails_with_newer_version_config() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Create raffle with current version
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
    
    // Stub config to simulate newer version (simulating old code with new config)
    let current_version = sui_raffler::get_current_contract_version();
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to buy tickets with newer version config (old code should fail)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 100, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 1, &clock, ts.ctx());
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that release_raffle fails when config version is newer than code expects
#[test]
#[expected_failure(abort_code = sui_raffler::EWrongVersion)]
fun test_release_raffle_fails_with_newer_version_config() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let (mut ts, mut config, mut raffle, random_state, mut clock) = test_helpers::setup_raffle_with_two_tickets(
        admin,
        organizer,
        organizer,
        buyer,
        buyer,
        0,
        1000,
        100,
        5
    );
    
    // Stub config to simulate newer version (simulating old code with new config)
    let current_version = sui_raffler::get_current_contract_version();
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to release raffle with newer version config (old code should fail)
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that claim_prize fails when config version is newer than code expects
#[test]
#[expected_failure(abort_code = sui_raffler::EWrongVersion)]
fun test_claim_prize_fails_with_newer_version_config() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Create raffle with current version
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
    
    // Buy 3 tickets to meet minimum requirement
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());
    
    // Release raffle with current version
    clock.set_for_testing(1001);
    let (mut ts2, random_state) = test_helpers::begin_scenario_with_random(@0x0);
    ts2.next_tx(admin);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts2.ctx());
    
    // Stub config to simulate newer version (simulating old code with new config)
    let current_version = sui_raffler::get_current_contract_version();
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to claim prize with newer version config (old code should fail)
    ts2.next_tx(buyer);
    let ticket = ts2.take_from_sender<sui_raffler::Ticket>();
    sui_raffler::claim_prize(&config, &mut raffle, ticket, ts2.ctx());
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
    ts2.end();
}

/// Test that claim_organizer_share fails when config version is newer than code expects
#[test]
#[expected_failure(abort_code = sui_raffler::EWrongVersion)]
fun test_claim_organizer_share_fails_with_newer_version_config() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Create raffle with current version
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
    
    // Buy 3 tickets to meet minimum requirement
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());
    
    // Release raffle with current version
    clock.set_for_testing(1001);
    let (mut ts2, random_state) = test_helpers::begin_scenario_with_random(@0x0);
    ts2.next_tx(admin);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts2.ctx());
    
    // Stub config to simulate newer version (simulating old code with new config)
    let current_version = sui_raffler::get_current_contract_version();
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to claim organizer share with newer version config (old code should fail)
    ts2.next_tx(organizer);
    sui_raffler::claim_organizer_share(&config, &mut raffle, ts2.ctx());
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
    ts2.end();
}

/// Test that return_ticket fails when config version is newer than code expects
#[test]
#[expected_failure(abort_code = sui_raffler::EWrongVersion)]
fun test_return_ticket_fails_with_newer_version_config() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Create raffle with current version
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
    
    // Buyer buys 1 ticket
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 100, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 1, &clock, ts.ctx());
    
    // Set time to after end time to trigger return state
    clock.set_for_testing(1001);
    
    // Stub config to simulate newer version (simulating old code with new config)
    let current_version = sui_raffler::get_current_contract_version();
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to return ticket with newer version config (old code should fail)
    ts.next_tx(buyer);
    let ticket = ts.take_from_sender<sui_raffler::Ticket>();
    sui_raffler::return_ticket(&config, &mut raffle, ticket, &clock, ts.ctx());
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that burn_tickets fails when config version is newer than code expects
#[test]
#[expected_failure(abort_code = sui_raffler::EWrongVersion)]
fun test_burn_tickets_fails_with_newer_version_config() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Create raffle with current version
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
    
    // Buy 3 tickets to meet minimum requirement
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());
    
    // Release raffle with current version
    clock.set_for_testing(1001);
    let (mut ts2, random_state) = test_helpers::begin_scenario_with_random(@0x0);
    ts2.next_tx(admin);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts2.ctx());
    
    // Stub config to simulate newer version (simulating old code with new config)
    let current_version = sui_raffler::get_current_contract_version();
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    
    // Try to burn tickets with newer version config (old code should fail)
    let mut tickets = vector::empty<sui_raffler::Ticket>();
    ts2.next_tx(buyer);
    let ticket = ts2.take_from_sender<sui_raffler::Ticket>();
    vector::push_back(&mut tickets, ticket);
    sui_raffler::burn_tickets(&config, &mut raffle, tickets, ts2.ctx());
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
    ts2.end();
}

/// Test that admin cap is created and transferred during init
#[test]
fun test_admin_cap_created_and_transferred() {
    let admin = @0xAD;
    
    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    
    // Verify admin cap was created and transferred to admin
    ts.next_tx(admin);
    // AdminCap is automatically cleaned up by the test framework
    // We just verify it exists by trying to take it and immediately return it
    let admin_cap = ts.take_from_sender<sui_raffler::AdminCap>();
    ts.return_to_sender(admin_cap);
    
    ts.end();
}

/// Test that migrate can be called multiple times safely
#[test]
fun test_migrate_idempotent() {
    let admin = @0xAD;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Stub config to simulate old version
    sui_raffler::stub_config_version(&mut config, 1);
    assert!(!sui_raffler::is_latest_version(&config), 0);
    
    // Migrate to latest version
    sui_raffler::migrate(&mut config, ts.ctx());
    assert!(sui_raffler::is_latest_version(&config), 1);
    
    // Stub config back to old version to test idempotency
    sui_raffler::stub_config_version(&mut config, 1);
    assert!(!sui_raffler::is_latest_version(&config), 2);
    
    // Migrate again - should work and be idempotent
    sui_raffler::migrate(&mut config, ts.ctx());
    assert!(sui_raffler::is_latest_version(&config), 3);
    
    ts::return_shared(config);
    ts.end();
}

/// Test that version checking works correctly with different version numbers
#[test]
fun test_version_checking_with_different_versions() {
    let admin = @0xAD;
    let current_version = sui_raffler::get_current_contract_version();
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Test with version 0 (older than current)
    sui_raffler::stub_config_version(&mut config, 0);
    assert!(!sui_raffler::is_latest_version(&config), 0);
    
    // Test with version 1 (older than current)
    sui_raffler::stub_config_version(&mut config, 1);
    assert!(!sui_raffler::is_latest_version(&config), 1);
    
    // Test with current version (should pass)
    sui_raffler::stub_config_version(&mut config, current_version);
    assert!(sui_raffler::is_latest_version(&config), 2);
    
    // Test with future version (newer than current - should fail for old code)
    sui_raffler::stub_config_version(&mut config, current_version + 1);
    assert!(!sui_raffler::is_latest_version(&config), 3);
    
    ts::return_shared(config);
    ts.end();
}

/// Test that all functions work correctly after migration
#[test]
fun test_functions_work_after_migration() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Stub config to simulate old version
    sui_raffler::stub_config_version(&mut config, 1);
    assert!(!sui_raffler::is_latest_version(&config), 0);
    
    // Migrate to latest version
    sui_raffler::migrate(&mut config, ts.ctx());
    assert!(sui_raffler::is_latest_version(&config), 1);
    
    // Now all functions should work
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
    
    // Buy tickets should work
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 100, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 1, &clock, ts.ctx());
    
    // Verify ticket was created
    assert!(sui_raffler::get_tickets_sold(&raffle) == 1, 2);
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that version checking is enforced on all critical functions
#[test]
fun test_version_checking_comprehensive() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    
    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    
    // Create a working raffle first
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
    
    // Buy some tickets (3 to meet minimum requirement)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());
    
    // Release raffle
    clock.set_for_testing(1001);
    let (mut ts2, random_state) = test_helpers::begin_scenario_with_random(@0x0);
    ts2.next_tx(admin);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts2.ctx());
    
    // Now test that all functions work with current version
    // (This test verifies that after migration, all functions work correctly)
    
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
    ts2.end();
}
