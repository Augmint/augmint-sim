
// stores all state for the simulation

'use strict';

// TODO: move loan and locks state here:
// TODO: would prefer proper setters/getters, but this is cool for now...
module.exports = {

    actors: {},

    balances: {
        // acd:
        acdReserve: 0,
        acdFeesEarned: 0,
        lockedAcdPool: 0,
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

    get totalAcd() {

        const actorsAcd = Object.keys(this.actors).reduce((sum, actorId) => {

            return sum + this.actors[actorId].balances.acd;

        }, 0);
        const systemBalances = this.balances;

        return actorsAcd + systemBalances.acdReserve + systemBalances.acdFeesEarned + systemBalances.lockedAcdPool 
                    + systemBalances.interestHoldingPool + systemBalances.interestEarnedPool;

    }

};
