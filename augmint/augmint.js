// stores all state for the simulation

'use strict';

// TODO: would prefer proper setters/getters, but this is cool for now...
module.exports = {
    actors: {},

    balances: {
        // acd:
        acdFeesEarned: 0,
        lockedAcdPool: 0,
        openLoansAcd: 0,
        interestHoldingPool: 0,
        interestEarnedPool: 0,
        exchangeAcd: 0,
        // eth:
        ethFeesEarned: 0,
        collateralHeld: 0,
        exchangeEth: 0
    },

    params: {
        exchangeFeePercentage: 0.1,
        lockedAcdInterestPercentage: 0.5,
        lockTimeInDays: 365
    },

    rates: {
        ethToAcd: 1, // i.e. price per acd in eth
        ethToUsd: 1
    },

    orderBook: {
        buy: [],
        sell: []
    },

    loans: {},
    locks: {},

    get netAcdDemand() {
        const orderBook = this.orderBook;
        const totalBuyAmount = orderBook.buy.reduce((sum, order) => {
            return sum + order.amount;
        }, 0);
        const totalSellAmount = orderBook.sell.reduce((sum, order) => {
            return sum + order.amount;
        }, 0);

        return totalBuyAmount - totalSellAmount;
    },

    get totalAcd() {
        const actorsAcd = Object.keys(this.actors).reduce((sum, actorId) => {
            return sum + this.actors[actorId].balances.acd;
        }, 0);
        const systemBalances = this.balances;

        return (
            actorsAcd +
            systemBalances.acdFeesEarned +
            systemBalances.lockedAcdPool +
            systemBalances.interestHoldingPool +
            systemBalances.interestEarnedPool +
            systemBalances.exchangeAcd
        );
    }
};
