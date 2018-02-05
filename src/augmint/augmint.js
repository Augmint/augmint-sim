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
        interestEarnedPool: 0,
        exchangeAcd: 0,
        // eth:
        ethFeesEarned: 0,
        collateralHeld: 0,
        exchangeEth: 0
    },

    params: {
        marketLoanInterestRate: 0.18, // what do we compete with?  actor's demand for loans depends on it
        marketLockInterestRate: 0.04, // what do we compete with? actor's demand for locks depends on it
        exchangeFeePercentage: 0.1,
        lockedAcdInterestPercentage: 0.5,
        lockTimeInDays: 365,
        loanToLockRatioLoanLimit: 1.2, // don't allow new loans if it's more
        loanToLockRatioLockLimit: 0.8, // don't allow new locks if it's less
        ethUsdTrendSampleDays: 3, // how many days to inspect for rates.ethToUsdTrend calculation)

        lockNoLimitAllowance: 500 /* in token - if totalLockAmount is below this then a new lock is allowed
                                     up to this amount even if it will bring the loanToDepositRatio BELOW
                                     loanToDepositLoanLimit
                                     (interest earned account balance still applies a limit on top of it) */,
        loanNoLimitAllowance: 500 /* in token - if totalLoanAmount is below this then a new loan is allowed
                                     up this amount even if it will bring the loanToDepositRatio
                                     ABOVE loanToDepositLoanLimit */
    },

    rates: {
        ethToAcd: 1, // i.e. price per acd in eth
        ethToUsd: 1,
        ethToUsdTrend: 0
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

        return totalBuyAmount - totalSellAmount + this.reserveAcdOnExchange;
    },

    get totalAcd() {
        const systemBalances = this.balances;

        return (
            this.actorsAcd +
            systemBalances.acdFeesEarned +
            systemBalances.lockedAcdPool +
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

    get floatingAcd() {
        // all ACD on user accounts and in open orders
        return this.actorsAcd - this.reserveAcd + this.balances.exchangeAcd - this.reserveAcdOnExchange;
    },

    get usersAcd() {
        // all ACD owned by users
        return this.totalAcd - this.systemAcd;
    },

    get systemAcd() {
        // all ACD in control of Augmint system
        return (
            this.balances.acdFeesEarned + this.balances.interestEarnedPool + this.reserveAcd + this.reserveAcdOnExchange
        );
    },

    get loanToDepositRatio() {
        return this.balances.lockedAcdPool === 0 ? 'N/A' : this.balances.openLoansAcd / this.balances.lockedAcdPool;
    },

    /* for maxBorrowableAmount &  maxLockableAmount calculation logic see:
        https://docs.google.com/spreadsheets/d/1MeWYPYZRIm1n9lzpvbq8kLfQg1hhvk5oJY6NrR401S0/edit#gid=1427271130 */
    get maxBorrowableAmount() {
        let maxLoan;
        if (this.balances.openLoansAcd < this.params.loanNoLimitAllowance) {
            maxLoan = this.params.loanNoLimitAllowance - this.balances.openLoansAcd;
        } else {
            maxLoan = this.balances.lockedAcdPool * this.params.loanToLockRatioLoanLimit - this.balances.openLoansAcd;
        }
        maxLoan = maxLoan < 0 ? 0 : maxLoan.toFixed(4);
        return maxLoan;
    },

    get maxLockableAmount() {
        let maxLock;
        const allowedByLockLimit =
            this.balances.openLoansAcd / this.params.loanToLockRatioLockLimit - this.balances.lockedAcdPool;

        const interestPt = (1 + this.params.lockedAcdInterestPercentage) ** (this.params.lockTimeInDays / 365) - 1;
        const allowedByEarning = this.balances.interestEarnedPool / interestPt;
        // console.debug(
        //     'Lock Params:',
        //     'totalLock: ',
        //     this.balances.lockedAcdPool,
        //     'totalLoan: ',
        //     this.balances.openLoansAcd,
        //     'loanToLockRatioLockLimit: ',
        //     this.params.loanToLockRatioLockLimit,
        //     'earned interestPool: ',
        //     this.balances.interestEarnedPool,
        //     'lock interest: ',
        //     this.params.lockedAcdInterestPercentage
        // );
        if (this.balances.lockedAcdPool < this.params.lockNoLimitAllowance) {
            maxLock = Math.min(
                Math.max(allowedByLockLimit, this.params.lockNoLimitAllowance - this.balances.lockedAcdPool),
                allowedByEarning
            );
        } else {
            maxLock = Math.min(allowedByLockLimit, allowedByEarning);
        }

        maxLock = maxLock < 0 ? 0 : maxLock.toFixed(4);

        return maxLock;
    }
};
