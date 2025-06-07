#[test_only]
module sui_raffler::sui_raffler_tests;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;

/// Helper function to mint SUI coins for testing
fun mint(addr: address, amount: u64, scenario: &mut ts::Scenario) {
    transfer::public_transfer(coin::mint_for_testing<SUI>(amount, scenario.ctx()), addr);
    scenario.next_tx(addr);
}

/// Test the complete raffle flow:
/// 1. Create a raffle
/// 2. Buy tickets
/// 3. Release raffle and select winners
#[test]
fun test_raffle_flow() {
    let organizer = @0xBEEF;
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

    // Create raffle
    ts.next_tx(organizer);
    mint(organizer, 1000, &mut ts);
    ts.next_tx(organizer);
    sui_raffler::create_raffle(start_time, end_time, ticket_price, max_tickets, fee_collector, ts.ctx());
    ts.next_tx(organizer);
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
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}
