#[test_only]
module sui_raffler::sui_raffler_security_tests;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::random::{Self, Random};
use sui::sui::SUI;
use std::debug;
use std::string;
use std::option::some;

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

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
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

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
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

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to update fee collector as non-admin
    ts.next_tx(non_admin);
    sui_raffler::update_fee_collector(&mut config, new_fee_collector, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

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

    ts.next_tx(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    ts.next_tx(admin);
    sui_raffler::update_creation_fee(&mut config, 10, ts.ctx());

    ts.next_tx(non_admin);
    // No payment passed, should abort
    sui_raffler::create_raffle(
        &config,
        std::option::none<Coin<SUI>>(),
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

    ts.next_tx(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();

    // Mint incorrect amount (e.g., 5)
    ts.next_tx(non_admin);
    // Mint a Coin<SUI> with less than 2 SUI (2_000_000_000 MIST) for creation fee
    let wrong_fee = coin::mint_for_testing<SUI>(1_000_000_000, ts.ctx());

    sui_raffler::create_raffle(
        &config,
        some(wrong_fee),
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

    ts.next_tx(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    ts.next_tx(admin);
    sui_raffler::update_creation_fee(&mut config, 10_000_000_000, ts.ctx());

    // Mint exact fee for non_admin
    ts.next_tx(non_admin);
    let fee_coin = coin::mint_for_testing<SUI>(10_000_000_000, ts.ctx());

    // Create raffle with fee
    sui_raffler::create_raffle(
        &config,
        std::option::some<Coin<SUI>>(fee_coin),
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

    ts.next_tx(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    ts.next_tx(admin);
    sui_raffler::update_creation_fee(&mut config, 0, ts.ctx());

    // Mint some amount and pass as payment; function should refund
    ts.next_tx(admin);
    let admin_coin = coin::mint_for_testing<SUI>(7, ts.ctx());

    sui_raffler::create_raffle(
        &config,
        std::option::some<Coin<SUI>>(admin_coin),
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

/// Test that non-admin/controller cannot pause contract
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAuthorized)]
fun test_pause_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();

    // Try to pause as non-admin/controller
    ts.next_tx(non_admin);
    sui_raffler::set_contract_paused(&mut config, true, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin/controller cannot pause raffle
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAuthorized)]
fun test_pause_raffle_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    ts.next_tx(organizer);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::set_raffle_paused(&config, &mut raffle, true, ts.ctx());

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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

    // Create clock and set time after end time
    ts.next_tx(admin);
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys tickets
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(admin);
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
    
    // Try to claim with a guaranteed non-winning ticket. If both buyer2 tickets
    // happen to be winners, fallback to using one of buyer1's tickets.
    let ticket_candidate1 = vector::pop_back(&mut buyer2_tickets);
    let (is_w1, _) = sui_raffler::is_winning_ticket(&raffle, &ticket_candidate1);
    let to_try = if (!is_w1) {
        ticket_candidate1
    } else {
        let ticket_candidate2 = vector::pop_back(&mut buyer2_tickets);
        let (is_w2, _) = sui_raffler::is_winning_ticket(&raffle, &ticket_candidate2);
        if (!is_w2) {
            // return the winning ticket to buyer2 to avoid resource leak
            transfer::public_transfer(ticket_candidate1, buyer2);
            ticket_candidate2
        } else {
            // Return both winners to buyer2 and fallback to buyer1's ticket (which cannot
            // all be winners as only 3 winners exist and buyer1 has more tickets).
            transfer::public_transfer(ticket_candidate1, buyer2);
            transfer::public_transfer(ticket_candidate2, buyer2);
            ts.next_tx(buyer1);
            ts.take_from_sender<sui_raffler::Ticket>()
        }
    };
    sui_raffler::claim_prize(&mut raffle, to_try, ts.ctx());

    // Ensure vector is empty before destroying to avoid sub-status error
    while (!vector::is_empty(&buyer2_tickets)) {
        let leftover = vector::pop_back(&mut buyer2_tickets);
        transfer::public_transfer(leftover, admin);
    };
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
fun test_cannot_buy_tickets_when_rafflepaused() {
    let admin = @0xAD;
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::set_raffle_paused(&config, &mut raffle, true, ts.ctx());

    // Try to buy tickets when raffle is paused
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    // Ensure no creation fee interferes when creating raffle
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    mint(buyer, 300, &mut ts);
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Pause the contract
    ts.next_tx(admin);
    sui_raffler::set_contract_paused(&mut config, true, ts.ctx());

    // Create a raffle (should fail)
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Set permissionless to false
    ts.next_tx(admin);
    sui_raffler::set_permissionless(&mut config, false, ts.ctx());

    // Try to create raffle as non-admin
    ts.next_tx(non_admin);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    let organizer = @0x1234;
    let buyer = @0xB0B;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle with future start time
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle with max_tickets_per_address = 3
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_tickets_per_address,
        organizer,
        ts.ctx()
    );
    ts.next_tx(organizer);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Try to buy 4 tickets (> 3 limit)
    ts.next_tx(buyer);
    mint(buyer, ticket_price * 4, &mut ts);
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle with per-purchase cap = 3 (now cumulative per-user cap)
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_tickets_per_address,
        organizer,
        ts.ctx()
    );
    ts.next_tx(organizer);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // First purchase: 2 tickets (within 3)
    ts.next_tx(buyer);
    mint(buyer, ticket_price * 2, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 2, &clock, ts.ctx());

    // Second purchase: 2 tickets (2 + 2 = 4 > 3) should fail
    ts.next_tx(buyer);
    mint(buyer, ticket_price * 2, &mut ts);
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

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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


/// Test to log winning ticket numbers for prize claiming tests
#[test]
fun test_log_winning_tickets() {
    let admin = @0xAD;
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys 2 tickets
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());

    // Buyer3 buys 2 tickets
    ts.next_tx(buyer3);
    mint(buyer3, 200, &mut ts);
    let coin3: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin3, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(admin);
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 3, &clock, ts.ctx());

    // Buyer2 buys 2 tickets
    ts.next_tx(buyer2);
    mint(buyer2, 200, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 2, &clock, ts.ctx());

    // Buyer3 buys 2 tickets
    ts.next_tx(buyer3);
    mint(buyer3, 200, &mut ts);
    let coin3: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin3, 2, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(admin);
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

/// Test that cannot burn tickets before raffle is released
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleNotEnded)]
fun test_burn_tickets_before_release() {
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

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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

/// Test that winning tickets are returned to caller instead of being burned
#[test]
fun test_burn_tickets_returns_winning_tickets() {
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
    let mut config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 3, &clock, ts.ctx());

    // Release raffle after end time
    ts.next_tx(admin);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Get winning tickets
    let (has_winners, winning_tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 0);
    assert!(vector::length(&winning_tickets) == 3, 0);
    
    let first_winner = *vector::borrow(&winning_tickets, 0);

    // Collect buyer's tickets
    ts.next_tx(buyer);
    let mut tickets = vector::empty<sui_raffler::Ticket>();
    let mut i = 0;
    while (i < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut tickets, ticket);
        i = i + 1;
    };

    // Try to burn tickets (should return winning tickets and burn non-winning ones)
    sui_raffler::burn_tickets(&mut raffle, tickets, ts.ctx());

    // Check that winning tickets were returned
    ts.next_tx(buyer);
    let mut returned_tickets = vector::empty<sui_raffler::Ticket>();
    let mut j = 0;
    while (j < 3) {
        let ticket = ts.take_from_sender<sui_raffler::Ticket>();
        vector::push_back(&mut returned_tickets, ticket);
        j = j + 1;
    };

    // Verify that the winning ticket was returned
    let mut found_winner = false;
    i = 0;
    while (i < vector::length(&returned_tickets)) {
        let ticket = vector::borrow(&returned_tickets, i);
        let (_, ticket_number) = sui_raffler::get_ticket_info(ticket);
        if (ticket_number == first_winner) {
            found_winner = true;
        };
        i = i + 1;
    };
    assert!(found_winner, 1);

    // Clean up returned tickets
    while (!vector::is_empty(&returned_tickets)) {
        let ticket = vector::pop_back(&mut returned_tickets);
        transfer::public_transfer(ticket, @0x0);
    };
    vector::destroy_empty(returned_tickets);

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
        some(payment_coin),
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
        some(payment_coin2),
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
    mint(buyer, 300, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    let mut clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle1, coin1, 3, &clock, ts.ctx());

    // Buyer buys tickets from raffle2 (tickets 1-3, but different raffle ID)
    ts.next_tx(buyer);
    mint(buyer, 300, &mut ts);
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

/// Test that admin can set raffle visibility
#[test]
fun test_set_raffle_visibility_admin() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Update controller
    sui_raffler::update_controller(&mut config, controller, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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

/// Test that non-admin/controller cannot set raffle visibility
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAuthorized)]
fun test_set_raffle_visibility_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());    

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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

    // Try to set visibility as non-admin/controller
    ts.next_tx(non_admin);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, false, ts.ctx());

    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that organizer cannot set raffle visibility
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAuthorized)]
fun test_set_raffle_visibility_organizer_unauthorized() {
    let admin = @0xAD;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let config = ts.take_shared<sui_raffler::Config>();
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create a raffle
    ts.next_tx(organizer);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
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

    // Try to set visibility as organizer (should fail)
    ts.next_tx(organizer);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, false, ts.ctx());

    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
} 