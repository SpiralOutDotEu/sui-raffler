#[test_only]
module sui_raffler::sui_raffler_security_tests;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;
use std::debug;
use std::string;

/// Helper function to mint SUI coins for testing
fun mint(addr: address, amount: u64, scenario: &mut ts::Scenario) {
    transfer::public_transfer(coin::mint_for_testing<SUI>(amount, scenario.ctx()), addr);
    scenario.next_tx(addr);
}

/// Test that non-admin cannot update admin
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_update_admin_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let new_admin = @0xAD2;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to update admin as non-admin
    ts.next_tx(non_admin);
    sui_raffler::update_admin(&mut config, new_admin, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin cannot update controller
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_update_controller_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let new_controller = @0x1236;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to update controller as non-admin
    ts.next_tx(non_admin);
    sui_raffler::update_controller(&mut config, new_controller, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin cannot update fee collector
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_update_fee_collector_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let new_fee_collector = @0xFEE6;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to update fee collector as non-admin
    ts.next_tx(non_admin);
    sui_raffler::update_fee_collector(&mut config, new_fee_collector, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin/controller cannot pause contract
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAuthorized)]
fun test_pause_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to pause as non-admin/controller
    ts.next_tx(non_admin);
    sui_raffler::pause(&mut config, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin/controller cannot pause raffle
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAuthorized)]
fun test_pause_raffle_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Try to pause raffle as non-admin/controller
    ts.next_tx(non_admin);
    sui_raffler::pause_raffle(&config, &mut raffle, ts.ctx());

    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that non-admin/controller cannot release raffle
#[test]
#[expected_failure(abort_code = sui_raffler::ENotController)]
fun test_release_raffle_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;

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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Create clock and set time after end time
    let mut clock = clock::create_for_testing(ts.ctx());
    clock.set_for_testing(1001);

    // Try to release raffle as non-admin/controller
    ts.next_tx(non_admin);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that non-organizer cannot claim organizer share
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_claim_organizer_share_unauthorized() {
    let admin = @0xAD;
    let non_organizer = @0xBEEF;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Buyer buys tickets
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());

    // Create clock and set time after end time
    ts.next_tx(controller);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Try to claim organizer share as non-organizer
    ts.next_tx(non_organizer);
    sui_raffler::claim_organizer_share(&mut raffle, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}


/// Test that non-winner cannot claim prize
#[test]
#[expected_failure(abort_code = sui_raffler::ENotWinner)]
fun test_claim_prize_unauthorized() {
    let admin = @0xAD;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;

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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Buyer1 buys tickets
    ts.next_tx(buyer1);
    mint(buyer1, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys tickets
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&mut raffle, coin2, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(controller);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Try to claim prize with non-winning ticket
    ts.next_tx(buyer2);
    let mut buyer2_tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 2) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer2_tickets, ticket);
        i = i + 1;
    };
    
    // Try to claim with non-winning ticket
    let ticket = vector::pop_back(&mut buyer2_tickets);
    sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());

    vector::destroy_empty(buyer2_tickets);
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that cannot buy tickets when raffle is paused
#[test]
#[expected_failure(abort_code = sui_raffler::ERafflePaused)]
fun test_cannot_buy_tickets_when_paused() {
    let admin = @0xAD;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Pause the raffle
    ts.next_tx(admin);
    sui_raffler::pause_raffle(&config, &mut raffle, ts.ctx());

    // Try to buy tickets when raffle is paused
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that cannot buy tickets when contract is paused
#[test]
#[expected_failure(abort_code = sui_raffler::EPaused)]
fun test_cannot_create_raffle_when_contract_paused() {
    let admin = @0xAD;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Pause the contract
    ts.next_tx(admin);
    sui_raffler::pause(&mut config, ts.ctx());

    // Create a raffle (should fail)
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

/// Test that cannot create raffle when not permissionless and not admin
#[test]
#[expected_failure(abort_code = sui_raffler::EPermissionDenied)]
fun test_create_raffle_not_permissionless() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Set permissionless to false
    ts.next_tx(admin);
    sui_raffler::set_permissionless(&mut config, false, ts.ctx());

    // Try to create raffle as non-admin
    ts.next_tx(non_admin);
    sui_raffler::create_raffle(
        &config,
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

/// Test that cannot buy tickets before start time
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleNotActive)]
fun test_buy_tickets_before_start() {
    let admin = @0xAD;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle with future start time
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        1000,
        2000,
        100,
        5,
        organizer,
        ts.ctx()
    );
    ts.next_tx(organizer);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Try to buy tickets before start time
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());

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
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Try to buy tickets after end time
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    clock.set_for_testing(1001);
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());

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
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;

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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Try to release raffle before end time
    ts.next_tx(controller);
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
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Buyer buys tickets
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(controller);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Try to release raffle again
    ts.next_tx(controller);
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
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Buyer buys tickets
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin, 3, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(controller);
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


/// Test to log winning ticket numbers for prize claiming tests
#[test]
fun test_log_winning_tickets() {
    let admin = @0xAD;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let buyer3 = @0xB0B3;

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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Buyer1 buys 3 tickets
    ts.next_tx(buyer1);
    mint(buyer1, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys 2 tickets
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&mut raffle, coin2, 2, &clock, ts.ctx());

    // Buyer3 buys 2 tickets
    ts.next_tx(buyer3);
    mint(buyer3, 200, &mut ts);
    let coin3: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&mut raffle, coin3, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(controller);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Log winning tickets
    let (has_winners, winning_tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 0);
    assert!(vector::length(&winning_tickets) == 3, 0);
    
    // Log the winning ticket numbers
    debug::print(&string::utf8(b"First place ticket: "));
    debug::print(vector::borrow(&winning_tickets, 0));
    debug::print(&string::utf8(b"\nSecond place ticket: "));
    debug::print(vector::borrow(&winning_tickets, 1));
    debug::print(&string::utf8(b"\nThird place ticket: "));
    debug::print(vector::borrow(&winning_tickets, 2));
    debug::print(&string::utf8(b"\n"));

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test prize claiming functionality
#[test]
fun test_prize_claiming() {
    let admin = @0xAD;
    let controller = @0x1235;
    let fee_collector = @0xFEE5;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let buyer3 = @0xB0B3;

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
    sui_raffler::init_for_testing(admin, controller, fee_collector, ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
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

    // Buyer1 buys 3 tickets
    ts.next_tx(buyer1);
    mint(buyer1, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys 2 tickets
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&mut raffle, coin2, 2, &clock, ts.ctx());

    // Buyer3 buys 2 tickets
    ts.next_tx(buyer3);
    mint(buyer3, 200, &mut ts);
    let coin3: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&mut raffle, coin3, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(controller);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Get winning tickets
    let (has_winners, winning_tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 0);
    assert!(vector::length(&winning_tickets) == 3, 0);
    
    let first_winner = *vector::borrow(&winning_tickets, 0);
    let second_winner = *vector::borrow(&winning_tickets, 1);
    let third_winner = *vector::borrow(&winning_tickets, 2);

    // Collect all tickets
    let mut buyer1_tickets = vector::empty<sui_raffler::Ticket>();
    let mut buyer2_tickets = vector::empty<sui_raffler::Ticket>();
    let mut buyer3_tickets = vector::empty<sui_raffler::Ticket>();

    // Collect buyer1's tickets
    ts.next_tx(buyer1);
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer1_tickets, ticket);
        i = i + 1;
    };

    // Collect buyer2's tickets
    ts.next_tx(buyer2);
    i = 0;
    while (i < 2) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer2_tickets, ticket);
        i = i + 1;
    };

    // Collect buyer3's tickets
    ts.next_tx(buyer3);
    i = 0;
    while (i < 2) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut buyer3_tickets, ticket);
        i = i + 1;
    };

    // Find winning tickets for each buyer
    let mut first_winner_ticket = vector::empty<sui_raffler::Ticket>();
    let mut second_winner_ticket = vector::empty<sui_raffler::Ticket>();
    let mut third_winner_ticket = vector::empty<sui_raffler::Ticket>();

    // Check buyer1's tickets
    i = 0;
    while (i < vector::length(&buyer1_tickets)) {
        let ticket = vector::borrow(&buyer1_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut first_winner_ticket, ticket);
        } else if (ticket_number == second_winner) {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut second_winner_ticket, ticket);
        } else if (ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer1_tickets, i);
            vector::push_back(&mut third_winner_ticket, ticket);
        } else {
            i = i + 1;
        };
    };

    // Check buyer2's tickets
    i = 0;
    while (i < vector::length(&buyer2_tickets)) {
        let ticket = vector::borrow(&buyer2_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut first_winner_ticket, ticket);
        } else if (ticket_number == second_winner) {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut second_winner_ticket, ticket);
        } else if (ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer2_tickets, i);
            vector::push_back(&mut third_winner_ticket, ticket);
        } else {
            i = i + 1;
        };
    };

    // Check buyer3's tickets
    i = 0;
    while (i < vector::length(&buyer3_tickets)) {
        let ticket = vector::borrow(&buyer3_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut first_winner_ticket, ticket);
        } else if (ticket_number == second_winner) {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut second_winner_ticket, ticket);
        } else if (ticket_number == third_winner) {
            let ticket = vector::remove(&mut buyer3_tickets, i);
            vector::push_back(&mut third_winner_ticket, ticket);
        } else {
            i = i + 1;
        };
    };

    // Claim prizes
    if (vector::length(&first_winner_ticket) > 0) {
        ts.next_tx(buyer1);
        let ticket = vector::pop_back(&mut first_winner_ticket);
        sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
    };
    if (vector::length(&second_winner_ticket) > 0) {
        ts.next_tx(buyer2);
        let ticket = vector::pop_back(&mut second_winner_ticket);
        sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
    };
    if (vector::length(&third_winner_ticket) > 0) {
        ts.next_tx(buyer3);
        let ticket = vector::pop_back(&mut third_winner_ticket);
        sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());
    };

    // Clean up winner tickets
    vector::destroy_empty(first_winner_ticket);
    vector::destroy_empty(second_winner_ticket);
    vector::destroy_empty(third_winner_ticket);

    // Transfer remaining tickets to @0x0
    if (vector::length(&buyer1_tickets) > 0) {
        ts.next_tx(buyer1);
        while (vector::length(&buyer1_tickets) > 0) {
            let ticket = vector::pop_back(&mut buyer1_tickets);
            transfer::public_transfer(ticket, @0x0);
        };
    };
    if (vector::length(&buyer2_tickets) > 0) {
        ts.next_tx(buyer2);
        while (vector::length(&buyer2_tickets) > 0) {
            let ticket = vector::pop_back(&mut buyer2_tickets);
            transfer::public_transfer(ticket, @0x0);
        };
    };
    if (vector::length(&buyer3_tickets) > 0) {
        ts.next_tx(buyer3);
        while (vector::length(&buyer3_tickets) > 0) {
            let ticket = vector::pop_back(&mut buyer3_tickets);
            transfer::public_transfer(ticket, @0x0);
        };
    };
    vector::destroy_empty(buyer1_tickets);
    vector::destroy_empty(buyer2_tickets);
    vector::destroy_empty(buyer3_tickets);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
} 