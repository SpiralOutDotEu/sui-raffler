#[test_only]
module sui_raffler::refund_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::coin::{Self, Coin};
use sui::sui::SUI;

/// Test ticket return functionality
#[test]
fun test_return_tickets() {
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

    // Return ticket for buyer1
    ts.next_tx(buyer1);
    let ticket1 = ts.take_from_sender<sui_raffler::Ticket>();
    sui_raffler::return_ticket(&config, &mut raffle, ticket1, &clock, ts.ctx());
    ts.next_tx(buyer1);
    let refund1: Coin<SUI> = ts.take_from_sender();
    assert!(coin::value(&refund1) == ticket_price, 1);
    transfer::public_transfer(refund1, buyer1);

    // Return ticket for buyer2
    ts.next_tx(buyer2);
    let ticket2 = ts.take_from_sender<sui_raffler::Ticket>();
    sui_raffler::return_ticket(&config, &mut raffle, ticket2, &clock, ts.ctx());
    ts.next_tx(buyer2);
    let refund2: Coin<SUI> = ts.take_from_sender();
    assert!(coin::value(&refund2) == ticket_price, 1);
    transfer::public_transfer(refund2, buyer2);

    // Verify final balance is 0 after all returns
    let (_, _, _, _, _, _, _, _, _, final_balance, _, _, _, _, _, _, _, _) = sui_raffler::get_raffle_info(&raffle);
    assert!(final_balance == 0, 1);

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}
