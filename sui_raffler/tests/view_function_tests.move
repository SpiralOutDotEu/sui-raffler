#[test_only]
module sui_raffler::view_function_tests;

use sui_raffler::sui_raffler;
use sui_raffler::test_helpers;
use sui::test_scenario as ts;
use sui::clock;
use sui::coin::Coin;
use sui::sui::SUI;

/// Test the get_address_purchase_info view function
#[test]
fun test_get_address_purchase_info() {
    let admin = @0xAD;
    let creator = @0xBEEF;
    let organizer = @0x1234;
    let buyer = @0xB0B;
    let start_time = 0;
    let end_time = 1000;
    let ticket_price = 100;
    let max_per_addr = 3;

    // Start with system address for random setup
    let (mut ts, random_state) = test_helpers::begin_scenario_with_random(@0x0);

    // Initialize module configuration
    let config = test_helpers::init_config_and_get(admin, &mut ts);
    let mut raffle = test_helpers::create_basic_raffle(
        &config,
        creator,
        organizer,
        start_time,
        end_time,
        ticket_price,
        max_per_addr,
        &mut ts
    );

    // Before any purchase: purchased=0, remaining=max
    let (p0, r0) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p0 == 0, 1);
    assert!(r0 == max_per_addr, 1);

    // Buyer buys 2 tickets
    ts.next_tx(buyer);
    test_helpers::mint(buyer, ticket_price * 2, &mut ts);
    let coin: Coin<SUI> = ts.take_from_sender();
    let clock = clock::create_for_testing(ts.ctx());
    sui_raffler::buy_tickets(&config, &mut raffle, coin, 2, &clock, ts.ctx());

    // After first purchase: purchased=2, remaining=1
    let (p1, r1) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p1 == 2, 1);
    assert!(r1 == 1, 1);

    // Buyer buys 1 more (reaches cap)
    ts.next_tx(buyer);
    test_helpers::mint(buyer, ticket_price, &mut ts);
    let coin2: Coin<SUI> = ts.take_from_sender();
    sui_raffler::buy_tickets(&config, &mut raffle, coin2, 1, &clock, ts.ctx());

    // After reaching cap: purchased=3, remaining=0
    let (p2, r2) = sui_raffler::get_address_purchase_info(&raffle, buyer);
    assert!(p2 == 3, 1);
    assert!(r2 == 0, 1);

    clock.destroy_for_testing();
    ts::return_shared(config);
    ts::return_shared(raffle);
    ts::return_shared(random_state);
    ts.end();
}
