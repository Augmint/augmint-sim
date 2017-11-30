
// stores balances, and params for augmint

'use strict';

// TODO: would prefer proper setters/getters, but this is cool for now...
// TODO: burn/mint functions would be good too
module.exports = {

    // TODO: seperate this out?
    actorBalances: {},

    balances: {
        acdReserve: 0,
        ethReserve: 0,
        acdFeesEarned: 0,
        ethFeesEarned: 0,
        frozenAcdPool: 0,
        collateralHeld: 0,
        interestHoldingPool: 0,
        interestEarnedPool: 0
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
