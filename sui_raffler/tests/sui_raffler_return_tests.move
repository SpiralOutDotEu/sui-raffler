#[test_only]
module sui_raffler::sui_raffler_return_tests;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;
use std::string;
use std::option::some;

/// Helper function to mint SUI coins for testing
fun mint(addr: address, amount: u64, scenario: &mut ts::Scenario) {
    transfer::public_transfer(coin::mint_for_testing<SUI>(amount, scenario.ctx()), addr);
    scenario.next_tx(addr);
}

/// Test setup function that creates a raffle with 2 tickets sold
fun setup_raffle_with_two_tickets(
    admin: address,
    creator: address,
    organizer: address,
    buyer1: address,
    buyer2: address,
    start_time: u64,
    end_time: u64,
    ticket_price: u64,
    max_tickets: u64
): (ts::Scenario, sui_raffler::Config, sui_raffler::Raffle, Random, clock::Clock) {
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
    
     // Mint a Coin<SUI> with exactly 2 SUI (2_000_000_000 MIST) for creation fee
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        some(payment_coin),
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_tickets,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    let mut raffle = ts.take_shared<sui_raffler::Raffle>();

    // Create clock
    let mut clock = clock::create_for_testing(ts.ctx());
    clock.set_for_testing(start_time);

    // Buyer1 buys 1 ticket
    ts.next_tx(buyer1);
    mint(buyer1, ticket_price, &mut ts);
    let coin1: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin1, 1, &clock, ts.ctx());

    // Buyer2 buys 1 ticket
    ts.next_tx(buyer2);
    mint(buyer2, ticket_price, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 1, &clock, ts.ctx());

    (ts, config, raffle, random_state, clock)
}

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

    let (mut ts, config, mut raffle, random_state, mut clock) = setup_raffle_with_two_tickets(
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

    let (mut ts, config, mut raffle, random_state, mut clock) = setup_raffle_with_two_tickets(
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

    let (mut ts, config, mut raffle, random_state, clock) = setup_raffle_with_two_tickets(
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
    sui_raffler::claim_prize(&mut raffle, ticket, ts.ctx());

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

    let (mut ts, config, mut raffle, random_state, clock) = setup_raffle_with_two_tickets(
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
    sui_raffler::claim_organizer_share(&mut raffle, ts.ctx());

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

    let (mut ts, config, mut raffle, random_state, mut clock) = setup_raffle_with_two_tickets(
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
    mint(buyer3, ticket_price, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 1, &clock, ts.ctx());

    // Clean up
    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}

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

    let (mut ts, config, mut raffle, random_state, mut clock) = setup_raffle_with_two_tickets(
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
    sui_raffler::return_ticket(&mut raffle, ticket1, &clock, ts.ctx());
    ts.next_tx(buyer1);
    let refund1: Coin<SUI> = ts.take_from_sender();
    assert!(coin::value(&refund1) == ticket_price, 1);
    transfer::public_transfer(refund1, buyer1);

    // Return ticket for buyer2
    ts.next_tx(buyer2);
    let ticket2 = ts.take_from_sender<sui_raffler::Ticket>();
    sui_raffler::return_ticket(&mut raffle, ticket2, &clock, ts.ctx());
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