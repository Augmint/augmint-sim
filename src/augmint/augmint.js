// stores all state for the simulation

'use strict';

// TODO: add transferFeePt param (and transferAcdWithFee functions)
// TODO: would prefer proper setters/getters, but this is cool for now...

module.exports = {
    actors: {},

    balances: {
        // acd:
        acdFeesEarned: 0,
        lockedAcdPool: 0,
        openLoansAcd: 0,
        defaultedLoansAcd: 0,
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
    loanProducts: [],
    loans: {},
    locks: {},
    exchange: null, // set by simulation.init()

    // TODO: move these under balances.
    get reserveAcd() {
        return this.actors ? this.actors.reserve.balances.acd : 0;
    },
    get reserveEth() {
        return this.actors && this.actors.reserve ? this.actors.reserve.balances.eth : 0;
    },

    get reserveAcdOnExchange() {
        return this.exchange.getActorSellAcdOrdersSum('reserve');
    },

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
        const systemBalances = this.balances;

        return (
            this.actorsAcd +
            systemBalances.acdFeesEarned +
            systemBalances.lockedAcdPool +
            systemBalances.interestHoldingPool +
            systemBalances.interestEarnedPool +
            systemBalances.exchangeAcd
        );
    },

    get actorsAcd() {
        // it includes reserve balance but not acd in orders. to get only user's balances use usersAcd()
        return Object.keys(this.actors).reduce((sum, actorId) => {
            return sum + this.actors[actorId].balances.acd;
        }, 0);
    },

    get usersAcd() {
        // all ACD on user accounts and in open orders
        return this.actorsAcd - this.reserveAcd + this.balances.exchangeAcd - this.reserveAcdOnExchange;
    },

    get systemAcd() {
        // all ACD in control of Augmint system
        return (
            this.balances.acdFeesEarned +
            this.balances.interestHoldingPool +
            this.balances.interestEarnedPool +
            this.reserveAcd +
            this.reserveAcdOnExchange
        );
    }
};
