#[test_only]
module sui_raffler::test_helpers;

use sui_raffler::sui_raffler;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::random::{Self, Random};
use sui::sui::SUI;
use std::string;

/// Helper function to mint SUI coins for testing
public fun mint(addr: address, amount: u64, scenario: &mut ts::Scenario) {
    transfer::public_transfer(coin::mint_for_testing<SUI>(amount, scenario.ctx()), addr);
    scenario.next_tx(addr);
}

/// Helper: begin scenario at `system_addr` and set up deterministic randomness
public fun begin_scenario_with_random(system_addr: address): (ts::Scenario, Random) {
    let mut ts = ts::begin(system_addr);
    random::create_for_testing(ts.ctx());
    ts.next_tx(system_addr);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(
        0,
        x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
        ts.ctx(),
    );
    (ts, random_state)
}

/// Helper: initialize config and return it, asserting nothing implicitly
public fun init_config_and_get(admin: address, ts: &mut ts::Scenario): sui_raffler::Config {
    ts.next_tx(admin);
    sui_raffler::init_for_testing(ts.ctx());
    ts.next_tx(admin);
    let mut config = ts.take_shared<sui_raffler::Config>();
    // Lower min ticket price for unit tests to allow small ticket_price values
    ts.next_tx(admin);
    sui_raffler::update_min_ticket_price(&mut config, 0, ts.ctx());
    config
}

/// Helper: create a basic raffle with shared defaults
public fun create_basic_raffle(
    config: &sui_raffler::Config,
    creator: address,
    organizer: address,
    start_time: u64,
    end_time: u64,
    ticket_price: u64,
    max_per_addr: u64,
    ts: &mut ts::Scenario,
): sui_raffler::Raffle {
    // fund creator a bit for creation if needed by tests
    mint(creator, 1000, ts);
    ts.next_tx(creator);
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());
    sui_raffler::create_raffle(
        config,
        payment_coin,
        string::utf8(b"Test Raffle"),
        string::utf8(b"Test Description"),
        string::utf8(b"https://example.com/image.jpg"),
        start_time,
        end_time,
        ticket_price,
        max_per_addr,
        organizer,
        ts.ctx()
    );
    ts.next_tx(creator);
    ts.take_shared<sui_raffler::Raffle>()
}

/// Helper: create a testing clock
public fun new_clock(ts: &mut ts::Scenario): clock::Clock {
    clock::create_for_testing(ts.ctx())
}

/// Helper: buyer buys exactly `num` tickets paying `num * price`
public fun buy_tickets_exact(
    config: &sui_raffler::Config,
    raffle: &mut sui_raffler::Raffle,
    buyer: address,
    num: u64,
    price: u64,
    clock: &clock::Clock,
    ts: &mut ts::Scenario,
) {
    ts.next_tx(buyer);
    mint(buyer, price * num, ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(config, raffle, coin, num, clock, ts.ctx());
}

/// Test setup function that creates a raffle with 2 tickets sold
public fun setup_raffle_with_two_tickets(
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
    let mut config = ts.take_shared<sui_raffler::Config>();
    // Lower min ticket price for this scenario
    ts.next_tx(admin);
    sui_raffler::update_min_ticket_price(&mut config, 0, ts.ctx());
    
     // Mint a Coin<SUI> with exactly 2 SUI (2_000_000_000 MIST) for creation fee
    let payment_coin = coin::mint_for_testing<SUI>(2_000_000_000, ts.ctx());

    // Create raffle
    ts.next_tx(creator);
    mint(creator, 1000, &mut ts);
    ts.next_tx(creator);
    sui_raffler::create_raffle(
        &config,
        payment_coin,
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
