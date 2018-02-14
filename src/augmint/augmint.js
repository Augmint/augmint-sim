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
        ethUsdTrendSampleDays: 3, // how many days to inspect for rates.ethToUsdTrend calculation)
        minimumLockAmount: 100, // without interest
        ltdDifferenceLimit: 0.2 /* allow lock or loan if Loan To Deposut ratio stay within 1 +/- this param  */,
        allowedLtdDifferenceAmount: 5000 /* in token - if totalLoan and totalLock difference is less than this
                                            then allow loan or lock even if ltdDifference limit would go off with it */
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

    issueAcd(amount) {
        this.actors.reserve.balances.acd += amount;
        return this.actors.reserve.balances.acd;
    },

    burnAcd(amount) {
        if (amount > this.actors.reserve.balances.acd) {
            throw new Error(
                `Tried to burn ${amount} from reserve but reserve balance only ${this.actors.reserve.balances.acd}`
            );
        }
        this.actors.reserve.balances.acd -= amount;
        return this.actors.reserve.balances.acd;
    },

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
        // checking against 1 b/c of rounding issues (need to move to BigNumber)
        return this.balances.lockedAcdPool < 1 ? 'N/A' : this.balances.openLoansAcd / this.balances.lockedAcdPool;
    },

    /* for maxBorrowableAmount &  maxLockableAmount calculation logic see:
        https://docs.google.com/spreadsheets/d/1MeWYPYZRIm1n9lzpvbq8kLfQg1hhvk5oJY6NrR401S0/edit#gid=270865454 */
    maxBorrowableAmount(productId) {
        const allowedByLtdDifferencePt =
            this.balances.lockedAcdPool * (1 + this.params.ltdDifferenceLimit) - this.balances.openLoansAcd;

        const allowedByLtdDifferenceAmount =
            this.balances.openLoansAcd > this.balances.lockedAcdPool + this.params.allowedLtdDifferenceAmount
                ? 0
                : this.balances.lockedAcdPool + this.params.allowedLtdDifferenceAmount - this.balances.openLoansAcd;

        const maxLoan = Math.max(allowedByLtdDifferenceAmount, allowedByLtdDifferencePt);
        const maxLoanWithMinLoanLimit = maxLoan < this.loanProducts[productId].minimumLoanInAcd ? 0 : maxLoan;

        // console.debug(
        //     `maxBorrowableAmount calcs: totalLock: ${this.balances.lockedAcdPool} totalLoan: ${
        //         this.balances.openLoansAcd
        //     }
        //     loanToDepositRatio: ${this.loanToDepositRatio} ltdDifferenceLimit: ${
        //         this.params.ltdDifferenceLimit
        //     } minimumLoanAmount: ${this.loanProducts[productId].minimumLoanInAcd}
        //     maxLoan: ${maxLoanWithMinLoanLimit} allowedByLtdDifferenceAmount: ${allowedByLtdDifferenceAmount} allowedByLtdDifferencePt: ${allowedByLtdDifferencePt}`
        // );

        return maxLoanWithMinLoanLimit;
    },

    get maxLockableAmount() {
        // TODO: interest cals implemented in freezer too. Make a common getter somewhere?
        const interestPt = (1 + this.params.lockedAcdInterestPercentage) ** (this.params.lockTimeInDays / 365) - 1;
        const allowedByEarning = this.balances.interestEarnedPool / interestPt;

        const allowedByLtdDifferencePt =
            this.balances.openLoansAcd / (1 - this.params.ltdDifferenceLimit) - this.balances.lockedAcdPool;

        const allowedByLtdDifferenceAmount =
            this.balances.openLoansAcd > this.balances.lockedAcdPool + this.params.allowedLtdDifferenceAmount
                ? 0
                : this.balances.openLoansAcd - this.balances.lockedAcdPool + this.params.allowedLtdDifferenceAmount;

        const maxLock = Math.min(Math.max(allowedByLtdDifferencePt, allowedByLtdDifferenceAmount), allowedByEarning);

        const maxLockWithMinLockLimit = maxLock < this.params.minimumLockAmount ? 0 : maxLock;

        // console.debug(
        //     `maxLockableAmount calcs: totalLock: ${this.balances.lockedAcdPool} totalLoan: ${
        //         this.balances.openLoansAcd
        //     } earned interestPool: ${this.balances.interestEarnedPool}
        //     loanToDepositRatio: ${this.loanToDepositRatio} ltdDifferenceLimit: ${
        //         this.params.ltdDifferenceLimit
        //     } minimumLockAmount: ${this.params.minimumLockAmount}
        //     maxLock: ${maxLockWithMinLockLimit} allowedByLtdDifferencePt: ${allowedByLtdDifferencePt}
        //     allowedByLtdDifferenceAmount: ${allowedByLtdDifferenceAmount} allowedByEarning: ${allowedByEarning}`
        // );

        return maxLockWithMinLockLimit;
    }
};
