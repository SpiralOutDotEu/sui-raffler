#[test_only]
module sui_raffler::authorization_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;

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

/// Test that non-admin cannot update controller
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_update_controller_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let new_controller = @0x1236;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

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
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        admin,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

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
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        admin,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    // Create clock and set time after end time
    let mut clock = test_helpers::new_clock(&mut ts);
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
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        admin,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    // Buyer buys tickets
    let mut clock = test_helpers::new_clock(&mut ts);
    test_helpers::buy_tickets_exact(&config, &mut raffle, buyer, 3, 100, &clock, &mut ts);

    // Create clock and set time after end time
    ts.next_tx(admin);
    clock.set_for_testing(1001);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Try to claim organizer share as non-organizer
    ts.next_tx(non_organizer);
    sui_raffler::claim_organizer_share(&config, &mut raffle, ts.ctx());

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
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        admin,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    // Buyer1 buys tickets
    let mut clock = test_helpers::new_clock(&mut ts);
    test_helpers::buy_tickets_exact(&config, &mut raffle, buyer1, 3, 100, &clock, &mut ts);

    // Buyer2 buys tickets
    test_helpers::buy_tickets_exact(&config, &mut raffle, buyer2, 2, 100, &clock, &mut ts);

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
    sui_raffler::claim_prize(&config, &mut raffle, to_try, ts.ctx());

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

/// Test that non-admin/controller cannot set raffle visibility
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAuthorized)]
fun test_set_raffle_visibility_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let organizer = @0x1234;

    let mut ts = ts::begin(admin);
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        admin,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

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
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        admin,
        organizer,
        0,
        1000,
        100,
        5,
        &mut ts
    );

    // Try to set visibility as organizer (should fail)
    ts.next_tx(organizer);
    sui_raffler::set_raffle_visibility(&config, &mut raffle, false, ts.ctx());

    ts::return_shared(config);
    ts::return_shared(raffle);
    ts.end();
}

/// Test that non-admin cannot set permissionless mode
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_set_permissionless_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

    // Try to set permissionless as non-admin
    ts.next_tx(non_admin);
    sui_raffler::set_permissionless(&mut config, false, ts.ctx());

    ts::return_shared(config);
    ts.end();
}

/// Test that non-admin cannot update creation fee
#[test]
#[expected_failure(abort_code = sui_raffler::ENotAdmin)]
fun test_update_creation_fee_unauthorized() {
    let admin = @0xAD;
    let non_admin = @0xBEEF;
    let new_fee = 5_000_000_000; // 5 SUI

    let mut ts = ts::begin(admin);
    let mut config = test_helpers::init_config_and_get(admin, &mut ts);

    // Try to update creation fee as non-admin
    ts.next_tx(non_admin);
    sui_raffler::update_creation_fee(&mut config, new_fee, ts.ctx());

    ts::return_shared(config);
    ts.end();
}
