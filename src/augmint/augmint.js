// stores all state for the simulation

"use strict";

// TODO: add transferFeePt param (and transferAcdWithFee functions)
// TODO: would prefer proper setters/getters, but this is cool for now...

const bigNums = require("../lib/bigNums.js");
const Acd = bigNums.BigAcd;
const Eth = bigNums.BigEth;
const Pt = bigNums.BigPt;

module.exports = {
    actors: {},

    balances: {
        // acd:
        acdFeesEarned: Acd(0),
        lockedAcdPool: Acd(0),
        openLoansAcd: Acd(0),
        defaultedLoansAcd: Acd(0),
        interestEarnedPool: Acd(0),
        exchangeAcd: Acd(0),
        // eth:
        ethFeesEarned: Eth(0),
        collateralHeld: Eth(0),
        exchangeEth: Eth(0)
    },

    params: {
        marketLoanInterestRate: Pt(0.18), // what do we compete with?  actor's demand for loans depends on it
        marketLockInterestRate: Pt(0.04), // what do we compete with? actor's demand for locks depends on it
        exchangeFeePercentage: Pt(0.1),
        lockedAcdInterestPercentage: Pt(0.5),
        lockTimeInDays: 365,
        ethUsdTrendSampleDays: 3, // how many days to inspect for rates.ethToUsdTrend calculation)
        minimumLockAmount: Acd(100), // without interest
        ltdDifferenceLimit: Pt(0.2) /* allow lock or loan if Loan To Deposut ratio stay within 1 +/- this param  */,
        allowedLtdDifferenceAmount: Acd(
            5000
        ) /* in token - if totalLoan and totalLock difference is less than this
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
        this.actors.reserve.balances.acd = this.actors.reserve.balances.acd.add(amount);
        return this.actors.reserve.balances.acd;
    },

    burnAcd(amount) {
        this.actors.reserve.balances.acd = this.actors.reserve.balances.acd.sub(amount);
        return this.actors.reserve.balances.acd;
    },

    // TODO: move these under balances.
    get reserveAcd() {
        return this.actors ? this.actors.reserve.balances.acd : Acd(0);
    },
    get reserveEth() {
        return this.actors && this.actors.reserve ? this.actors.reserve.balances.eth : Acd(0);
    },

    get reserveAcdOnExchange() {
        return this.exchange.getActorSellAcdOrdersSum("reserve");
    },

    get netAcdDemand() {
        const orderBook = this.orderBook;
        const totalBuyAmount = orderBook.buy.reduce((sum, order) => {
            return sum.add(order.amount);
        }, Acd(0));
        const totalSellAmount = orderBook.sell.reduce((sum, order) => {
            if (!order.amount.round(2, 0).eq(order.amount)) {
                throw new Error(order.actorId + order.amount.toString());
            }
            return sum.add(order.amount);
        }, Acd(0));
        if (
            !totalSellAmount.round(2, 0).eq(totalSellAmount) ||
            !totalBuyAmount.round(2, 0).eq(totalBuyAmount) ||
            !this.reserveAcdOnExchange.round(2, 0).eq(this.reserveAcdOnExchange)
        ) {
            throw new Error(totalSellAmount.toString());
        }
        return totalBuyAmount.sub(totalSellAmount).add(this.reserveAcdOnExchange);
    },

    get totalAcd() {
        const systemBalances = this.balances;

        return this.actorsAcd
            .add(systemBalances.acdFeesEarned)
            .add(systemBalances.lockedAcdPool)
            .add(systemBalances.interestEarnedPool)
            .add(systemBalances.exchangeAcd);
    },

    get actorsAcd() {
        // it includes reserve balance but not acd in orders. to get only user's balances use usersAcd()
        return Object.keys(this.actors).reduce((sum, actorId) => {
            return sum.add(this.actors[actorId].balances.acd);
        }, Acd(0));
    },

    get floatingAcd() {
        // all ACD on user accounts and in open orders
        return this.actorsAcd
            .sub(this.reserveAcd)
            .add(this.balances.exchangeAcd)
            .sub(this.reserveAcdOnExchange);
    },

    get usersAcd() {
        // all ACD owned by users
        return this.totalAcd.sub(this.systemAcd);
    },

    get systemAcd() {
        // all ACD in control of Augmint system
        return this.balances.acdFeesEarned
            .add(this.balances.interestEarnedPool)
            .add(this.reserveAcd)
            .add(this.reserveAcdOnExchange);
    },

    get loanToDepositRatio() {
        return this.balances.lockedAcdPool.eq(0) ? "N/A" : this.balances.openLoansAcd.div(this.balances.lockedAcdPool);
    },

    /* for maxBorrowableAmount &  maxLockableAmount calculation logic see:
        https://docs.google.com/spreadsheets/d/1MeWYPYZRIm1n9lzpvbq8kLfQg1hhvk5oJY6NrR401S0/edit#gid=270865454 */
    maxBorrowableAmount(productId) {
        const allowedByLtdDifferencePt = Pt(
            this.balances.lockedAcdPool.mul(this.params.ltdDifferenceLimit.add(1)).sub(this.balances.openLoansAcd)
        );

        const allowedByLtdDifferenceAmount = this.balances.openLoansAcd.gt(
            this.balances.lockedAcdPool.add(this.params.allowedLtdDifferenceAmount)
        )
            ? Acd(0)
            : this.balances.lockedAcdPool.add(this.params.allowedLtdDifferenceAmount).sub(this.balances.openLoansAcd);

        const maxLoan = allowedByLtdDifferenceAmount.gt(allowedByLtdDifferencePt)
            ? allowedByLtdDifferenceAmount
            : allowedByLtdDifferencePt;
        const maxLoanWithMinLoanLimit = maxLoan.lt(this.loanProducts[productId].minimumLoanInAcd)
            ? Acd(0)
            : maxLoan.round(bigNums.ACD_DP, 0);

        //         console.debug(
        //             `=== maxBorrowableAmount calcs:
        //     totalLock: ${this.balances.lockedAcdPool} totalLoan: ${this.balances.openLoansAcd}
        //     loanToDepositRatio: ${this.loanToDepositRatio} ltdDifferenceLimit: ${this.params.ltdDifferenceLimit}
        //     minimumLoanAmount: ${this.loanProducts[productId].minimumLoanInAcd}
        //     allowedByLtdDifferenceAmount: ${allowedByLtdDifferenceAmount}
        //     allowedByLtdDifferencePt: ${allowedByLtdDifferencePt}
        // ==> maxLoan: ${maxLoanWithMinLoanLimit}`
        //         );

        return maxLoanWithMinLoanLimit;
    },

    get maxLockableAmount() {
        // TODO: interest cals implemented in freezer too. Make a common getter somewhere?

        const interestPt = Pt(this.params.lockedAcdInterestPercentage.add(1) ** (this.params.lockTimeInDays / 365) - 1);
        const allowedByEarning = this.balances.interestEarnedPool.div(interestPt);

        const allowedByLtdDifferencePt = this.balances.openLoansAcd
            .div(Pt(1).sub(this.params.ltdDifferenceLimit))
            .sub(this.balances.lockedAcdPool);

        const allowedByLtdDifferenceAmount = this.balances.openLoansAcd.gt(
            this.balances.lockedAcdPool.add(this.params.allowedLtdDifferenceAmount)
        )
            ? Acd(0)
            : this.balances.openLoansAcd.sub(this.balances.lockedAcdPool).add(this.params.allowedLtdDifferenceAmount);

        //const maxLock = Math.min(Math.max(allowedByLtdDifferencePt, allowedByLtdDifferenceAmount), allowedByEarning);
        const maxLock = Acd(
            Math.min(Math.max(allowedByLtdDifferencePt, allowedByLtdDifferenceAmount), allowedByEarning)
        );

        const maxLockWithMinLockLimit = maxLock.lt(this.params.minimumLockAmount)
            ? Acd(0)
            : maxLock.round(bigNums.ACD_DP, 0);

        //         console.debug(
        //             `=== maxLockableAmount calcs:
        //     totalLock: ${this.balances.lockedAcdPool} totalLoan: ${this.balances.openLoansAcd}
        //     loanToDepositRatio: ${this.loanToDepositRatio} ltdDifferenceLimit: ${this.params.ltdDifferenceLimit}
        //     earned interestPool: ${this.balances.interestEarnedPool}
        //     minimumLockAmount: ${this.params.minimumLockAmount}
        //     allowedByLtdDifferencePt: ${allowedByLtdDifferencePt}
        //     allowedByLtdDifferenceAmount: ${allowedByLtdDifferenceAmount} allowedByEarning: ${allowedByEarning}
        // ===> maxLock: ${maxLockWithMinLockLimit}`
        //         );

        return maxLockWithMinLockLimit;
    }
};
