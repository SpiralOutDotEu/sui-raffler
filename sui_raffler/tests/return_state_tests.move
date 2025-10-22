#[test_only]
module sui_raffler::return_state_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::coin::{Coin};
use sui::sui::SUI;

/// Test the is_in_return_state view function
#[test]
fun test_is_in_return_state() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 10;

    let (ts, config, raffle, random_state, mut clock) = test_helpers::setup_raffle_with_two_tickets(
        admin,
        creator,
        organizer,
        buyer1,
        buyer2,
        start_time,
        end_time,
        ticket_price,
        max_tickets
    );

    // Set time to before end time
    clock.set_for_testing(end_time - 1);
    assert!(!sui_raffler::is_in_return_state(&raffle, &clock), 1);

    // Set time to after end time
    clock.set_for_testing(end_time + 1);
    assert!(sui_raffler::is_in_return_state(&raffle, &clock), 1);

    // Set time to further after end time
    clock.set_for_testing(end_time + 1000);
    assert!(sui_raffler::is_in_return_state(&raffle, &clock), 1);

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that release_raffle aborts when less than 3 tickets are sold
#[test]
#[expected_failure(abort_code = sui_raffler::ENotMinimumTickets)]
fun test_release_raffle_insufficient_tickets() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 10;

    let (mut ts, config, mut raffle, random_state, mut clock) = test_helpers::setup_raffle_with_two_tickets(
        admin,
        creator,
        organizer,
        buyer1,
        buyer2,
        start_time,
        end_time,
        ticket_price,
        max_tickets
    );

    // Set time past end time
    clock.set_for_testing(end_time + 1);

    // Try to release raffle
    ts.next_tx(admin);
    sui_raffler::release_raffle(&config, &mut raffle, &random_state, &clock, ts.ctx());

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that claim_prize aborts when less than 3 tickets are sold
#[test]
#[expected_failure(abort_code = sui_raffler::ENotMinimumTickets)]
fun test_claim_prize_insufficient_tickets() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 10;

    let (mut ts, config, mut raffle, random_state, clock) = test_helpers::setup_raffle_with_two_tickets(
        admin,
        creator,
        organizer,
        buyer1,
        buyer2,
        start_time,
        end_time,
        ticket_price,
        max_tickets
    );

    // Try to claim prize
    ts.next_tx(buyer1);
    let ticket = ts.take_from_sender<sui_raffler::Ticket>();
    sui_raffler::claim_prize(&config, &mut raffle, ticket, ts.ctx());

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that claim_organizer_share aborts when less than 3 tickets are sold
#[test]
#[expected_failure(abort_code = sui_raffler::ENotMinimumTickets)]
fun test_claim_organizer_share_insufficient_tickets() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 10;

    let (mut ts, config, mut raffle, random_state, clock) = test_helpers::setup_raffle_with_two_tickets(
        admin,
        creator,
        organizer,
        buyer1,
        buyer2,
        start_time,
        end_time,
        ticket_price,
        max_tickets
    );

    // Try to claim organizer share
    ts.next_tx(organizer);
    sui_raffler::claim_organizer_share(&config, &mut raffle, ts.ctx());

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

/// Test that buy_tickets aborts when raffle has ended
#[test]
#[expected_failure(abort_code = sui_raffler::ERaffleNotActive)]
fun test_buy_tickets_after_end() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer1 = @0xB0B;
    let buyer2 = @0xB0B2;
    let buyer3 = @0xB0B3;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_tickets = 10;

    let (mut ts, config, mut raffle, random_state, mut clock) = test_helpers::setup_raffle_with_two_tickets(
        admin,
        creator,
        organizer,
        buyer1,
        buyer2,
        start_time,
        end_time,
        ticket_price,
        max_tickets
    );

    // Set time past end time
    clock.set_for_testing(end_time + 1);

    // Try to buy ticket after end time
    ts.next_tx(buyer3);
    test_helpers::mint(buyer3, ticket_price, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 1, &clock, ts.ctx());

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}
