#[test_only]
module sui_raffler::sui_raffler_tests;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;
use sui::transfer;

/// Helper function to mint SUI coins for testing
fun mint(addr: address, amount: u64, scenario: &mut ts::Scenario) {
    transfer::public_transfer(coin::mint_for_testing<SUI>(amount, scenario.ctx()), addr);
    scenario.next_tx(addr);
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
    let fee_collector = @0xFEE5;
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
    sui_raffler::initialize(admin, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    assert!(sui_raffler::get_config_fee_collector(&config) == fee_collector, 1);

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(&config, start_time, end_time, ticket_price, max_tickets, organizer, ts.ctx());
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();
    assert!(sui_raffler::get_tickets_sold(&raffle) == 0, 1);

    // Buyer buys tickets
    ts.next_tx(buyer);
    mint(buyer, ticket_price * 3, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());
    assert!(sui_raffler::get_tickets_sold(&raffle) == 3, 1);
    clock.destroy_for_testing();

    // Organizer releases raffle after end_time
    ts.next_tx(organizer);
    let mut clock2 = clock::create_for_testing(ts.ctx());
    clock2.set_for_testing(end_time + 1);
    sui_raffler::release_raffle(&mut raffle, &random_state, &clock2, ts.ctx());
    assert!(sui_raffler::is_released(&raffle), 1);
    clock2.destroy_for_testing();

    // Return objects and end scenario
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test fee collector update functionality
#[test]
fun test_fee_collector_update() {
    let admin = @0xAD;
    let initial_fee_collector = @0xFEE5;
    let new_fee_collector = @0xFEE6;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::initialize(admin, initial_fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    assert!(sui_raffler::get_config_fee_collector(&config) == initial_fee_collector, 1);

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
    let initial_fee_collector = @0xFEE5;
    let new_fee_collector = @0xFEE6;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::initialize(admin, initial_fee_collector, ts.ctx());
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
    let fee_collector = @0xFEE5;
    let invalid_organizer = @0x0;

    let mut ts = ts::begin(admin);

    // Initialize module configuration
    sui_raffler::initialize(admin, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Try to create raffle with invalid organizer address
    ts.next_tx(creator);
    sui_raffler::create_raffle(&config, 0, 1000, 100, 5, invalid_organizer, ts.ctx());

    // Return objects and end scenario
    ts::return_shared(config);
    ts.end();
}
