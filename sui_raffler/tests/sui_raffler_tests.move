#[test_only]
module sui_raffler::sui_raffler_tests;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::random::{Self, Random};
use sui::sui::SUI;
use sui::transfer;
use sui::object::{Self, ID};
use sui::vec_map::{Self, VecMap};
use std::vector;

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

    // Test view functions before release
    let (start_time, end_time, price, max_tix, org, fee_col, balance, sold, released, total, first, second, third, org_share, fee) = 
        sui_raffler::get_raffle_info(&raffle);
    assert!(start_time == 0, 1);
    assert!(end_time == 1000, 1);
    assert!(price == 100, 1);
    assert!(max_tix == 5, 1);
    assert!(org == organizer, 1);
    assert!(fee_col == fee_collector, 1);
    assert!(balance == 300, 1);
    assert!(sold == 3, 1);
    assert!(!released, 1);
    assert!(total == 300, 1);
    assert!(first == 150, 1);
    assert!(second == 75, 1);
    assert!(third == 30, 1);
    assert!(org_share == 30, 1);
    assert!(fee == 15, 1);

    let (total_sold, volume, avg_tix, time_left, is_active) = sui_raffler::get_raffle_stats(&raffle, &clock);
    assert!(total_sold == 3, 1);
    assert!(volume == 300, 1);
    assert!(avg_tix == 100, 1);
    assert!(time_left > 0, 1);
    assert!(is_active, 1);

    let (has_winners, winners, tickets) = sui_raffler::get_winners(&raffle);
    assert!(!has_winners, 1);
    assert!(vector::is_empty(&winners), 1);
    assert!(vector::is_empty(&tickets), 1);

    clock.destroy_for_testing();

    // Organizer releases raffle after end_time
    ts.next_tx(organizer);
    let mut clock2 = clock::create_for_testing(ts.ctx());
    clock2.set_for_testing(end_time + 1);
    sui_raffler::release_raffle(&mut raffle, &random_state, &clock2, ts.ctx());
    assert!(sui_raffler::is_released(&raffle), 1);

    // Test view functions after release
    let (has_winners, winners, tickets) = sui_raffler::get_winners(&raffle);
    assert!(has_winners, 1);
    assert!(vector::length(&winners) == 3, 1);
    assert!(vector::length(&tickets) == 3, 1);

    // Verify all winning tickets are different
    let ticket1 = *vector::borrow(&tickets, 0);
    let ticket2 = *vector::borrow(&tickets, 1);
    let ticket3 = *vector::borrow(&tickets, 2);
    assert!(ticket1 != ticket2 && ticket2 != ticket3 && ticket1 != ticket3, 1);

    // Test claim prize for first winner
    ts.next_tx(buyer);
    let buyer_ticket = ts.take_from_sender<sui_raffler::Ticket>();
    let (is_winner, prize_amount) = sui_raffler::is_winning_ticket(&raffle, &buyer_ticket);
    
    // Only try to claim prize if this is a winning ticket
    if (is_winner) {
        let initial_balance = sui_raffler::get_raffle_balance(&raffle);
        sui_raffler::claim_prize(&mut raffle, buyer_ticket, ts.ctx());
        let final_balance = sui_raffler::get_raffle_balance(&raffle);
        
        // Wait for the transaction to complete
        ts.next_tx(buyer);
        
        // Get the prize coin received by the buyer
        let prize_coin: Coin<SUI> = ts.take_from_sender();
        let received_amount = coin::value(&prize_coin);
        
        // Assert that the received amount matches the prize amount
        assert!(received_amount == prize_amount, 1);
        
        // Return the prize coin to the buyer
        transfer::public_transfer(prize_coin, buyer);
    } else {
        // If not a winning ticket, return it to the buyer
        transfer::public_transfer(buyer_ticket, buyer);
        
        // Try to get another ticket from the buyer
        ts.next_tx(buyer);
        let next_ticket = ts.take_from_sender<sui_raffler::Ticket>();
        let (is_next_winner, next_prize_amount) = sui_raffler::is_winning_ticket(&raffle, &next_ticket);
        
        if (is_next_winner) {
            let initial_balance = sui_raffler::get_raffle_balance(&raffle);
            sui_raffler::claim_prize(&mut raffle, next_ticket, ts.ctx());
            let final_balance = sui_raffler::get_raffle_balance(&raffle);
            
            // Wait for the transaction to complete
            ts.next_tx(buyer);
            
            // Get the prize coin received by the buyer
            let prize_coin: Coin<SUI> = ts.take_from_sender();
            let received_amount = coin::value(&prize_coin);
            
            // Assert that the received amount matches the prize amount
            assert!(received_amount == next_prize_amount, 1);
            
            // Return the prize coin to the buyer
            transfer::public_transfer(prize_coin, buyer);
        } else {
            // If second ticket is also not a winner, return it
            transfer::public_transfer(next_ticket, buyer);
        };
    };

    // Test organizer's share
    let (_, _, _, _, _, _, _, _, _, _, _, _, _, org_share, _) = sui_raffler::get_raffle_info(&raffle);
    assert!(org_share == 30, 1); // 10% of 300 = 30

    // Test fee collector's share
    let (_, _, _, _, _, _, _, _, _, _, _, _, _, _, fee) = sui_raffler::get_raffle_info(&raffle);
    assert!(fee == 15, 1); // 5% of 300 = 15
    
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
