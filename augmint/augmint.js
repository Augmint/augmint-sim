
// stores all state for the simulation

'use strict';

// TODO: move loan and locks state here:
// TODO: would prefer proper setters/getters, but this is cool for now...
// TODO: burn/mint functions would be good too
module.exports = {

    actorBalances: {},

    actorState: {},

    balances: {
        // acd:
        acdReserve: 0,
        acdFeesEarned: 0,
        frozenAcdPool: 0,
        interestHoldingPool: 0,
        interestEarnedPool: 0,
        // eth:
        ethReserve: 0,
        ethFeesEarned: 0,
        collateralHeld: 0
    },

    params: {
        acdPriceInEth: 0,
        exchangeFeePercentage: 0,
        lockedAcdInterestPercentage: 0,
        // length of lock in seconds:
        lockTime: 0
    },

    // for tracking state:
    totalAcd: 0

};
