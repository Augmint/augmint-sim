"use strict";

const { Acd, Eth, Pt } = require("../lib/augmintNums.js");

const augmintOptions = {
    balances: { interestEarnedPool: Acd(5000) /* genesis, loan from stakeholders */ },
    params: {
        exchangeFeePercentage: Pt(0.003),
        marketLoanInterestRate: Pt(0.14), // what do we compete with?  actor's demand for loans depends on it
        marketLockInterestRate: Pt(0.06), // what do we compete with? actor's demand for locks depends on it
        lockedAcdInterestPercentage: Pt(0.08),
        lockTimeInDays: 30,
        ethUsdTrendSampleDays: 5, // how many days to inspect for rates.ethToUsdTrend calculation)
        graphRefreshDays: 5, // refresh graph in every x days
        logMoves: false, // wheter to log moves - big performance impact
        minimumLockAmount: Acd(100), // without interest

        ltdLockDifferenceLimit: Pt(0.2) /* allow lock if Loan To Deposut ratio stay within 1 +/- this param  */,
        ltdLoanDifferenceLimit: Pt(0.2) /* allow loan if Loan To Deposut ratio stay within 1 +/- this param  */,

        allowedLtdDifferenceAmount: Acd(
            5000
        ) /* in token - if totalLoan and totalLock difference is less than that
                                            then allow loan or lock even if ltdDifference limit would go off with it */,
        loanRepaymentCost: Acd(5), // gas and other costs in ACD - used when deciding if a loan worth to repay
        loanProduct: {
            minimumLoanInAcd: Acd(100),
            loanCollateralRatio: Pt(0.6),
            interestPt: Pt(0.12), // p.a.
            repaymentPeriodInDays: 60,
            defaultFeePercentage: Pt(0.05)
        }
    }
};

const actors = {
    // boardLoanCollateralRatio: {
    //     type: 'BoardLoanCollateralRatio',
    //     balances: {},
    //     params: {
    //         HIGH_COLLATERAL_RATIO: 0.3, // collateral ratio when ETH/USD trend above high trigger
    //         MID_COLLATERAL_RATIO: 0.6, // collateral ratio when ETH/USD trend b/w low & high triggers
    //         LOW_COLLATERAL_RATIO: 0.6, // collateral ratio when ETH/USD trend < low trigger
    //         TREND_TRIGGER_LOW: 0.003, // ETH/USD trend: least squares abs(m) value (price normalised to 0-1)
    //         TREND_TRIGGER_HIGH: 0.01, // ETH/USD trend: least squares abs(m) value (price normalised to 0-1)
    //         MIN_DAYS_BEFORE_RAISE: 14 // how many days to wait from last change before raising COLLATERAL ratio
    //     }
    // },
    alwaysLocker: {
        type: "LockerBasic",
        count: 1,
        balances: {
            usd: Acd(100000000) // 'unlimited' USD, lock demand adjusted with WANTS_TO_LOCK_AMOUNT
        },
        params: {
            WANTS_TO_LOCK_AMOUNT: Acd(5000), // how much they want to lock
            WANTS_TO_LOCK_AMOUNT_GROWTH_PA: Pt(1), // increase in demand % pa.
            CHANCE_TO_LOCK: Pt(1), // always relock all ACD balance (initial liquidity provider)
            INTEREST_SENSITIVITY: Pt(
                2
            ) /* how sensitive is the locker for marketLockInterestRate ?
                                    linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */,
            CHANCE_TO_SELL_ALL_ACD: Pt(1) /* if  doesn't want lock then what chance in a day that they sell their ACD */
        }
    },
    randomLocker: {
        type: "LockerBasic",
        count: 30,
        balances: {
            usd: Acd(100000000) // 'unlimited' USD, lock demand adjusted with WANTS_TO_LOCK_AMOUNT
        },
        params: {
            WANTS_TO_LOCK_AMOUNT: Acd(5000), // how much they want to lock
            WANTS_TO_LOCK_AMOUNT_GROWTH_PA: Pt(2), // increase in demand % pa.
            CHANCE_TO_LOCK: Pt(0.3), // relock by chance % of days when no lock and  lock interest rates compelling
            INTEREST_SENSITIVITY: Pt(
                1
            ) /* how sensitive is the locker for marketLockInterestRate ?
                                  linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */,
            CHANCE_TO_SELL_ALL_ACD: Pt(
                0.1
            ) /* if  doesn't want lock then what chance in a day that they sell their ACD */
        }
    },
    allSellBorrower: {
        type: "BorrowerBasic",
        count: 5,
        balances: {
            eth: Acd(500000) // unlimited ETH - demand adjusted with params
        },
        params: {
            ETH_BALANCE_GROWTH_PA: Pt(0) /* ETH balance  grows daily by pa. % to simulate growth */,
            USD_BALANCE_GROWTH_PA: Pt(0) /* USD balance grows daily by pa. % to simulate growth */,
            WANTS_TO_BORROW_AMOUNT: Acd(5000), // how much they want to borrow
            WANTS_TO_BORROW_AMOUNT_GROWTH_PA: Pt(2), // increase in demand % pa.
            CHANCE_TO_TAKE_LOAN: Pt(1), // % chance to take a loan on a day (on top of chances based on marketrates
            CHANCE_TO_SELL_ALL_ACD: Pt(1), // immediately sells full ACD balance
            INTEREST_SENSITIVITY: Pt(
                2
            ) /* how sensitive is the borrower for marketLoanInterestRate ?
                                    linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */
        }
    },
    randomKeeperBorrower: {
        type: "BorrowerBasic",
        count: 50,
        balances: {
            eth: Acd(500000) // unlimited ETH - demand adjusted with params
        },
        params: {
            ETH_BALANCE_GROWTH_PA: Pt(0) /* ETH balance  grows daily by pa. % to simulate growth */,
            USD_BALANCE_GROWTH_PA: Pt(0) /* USD balance grows daily by pa. % to simulate growth */,
            WANTS_TO_BORROW_AMOUNT: Acd(5000), // how much they want to borrow
            WANTS_TO_BORROW_AMOUNT_GROWTH_PA: Pt(2), // increase in demand % pa.
            CHANCE_TO_TAKE_LOAN: Pt(0.05), // % chance to take a loan on a day (on top of chances based on marketrates
            CHANCE_TO_SELL_ALL_ACD: Pt(0.1), // % chance to sell all ACD balance (unless repayment is due soon)
            INTEREST_SENSITIVITY: Pt(
                2
            ) /* how sensitive is the borrower for marketLoanInterestRate ?
                                    linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */
        }
    },
    // actor: { type: 'ExchangeTester', balances: { eth: 10000, acd: 10000 } }
    /* ReserveBasic is continuosly intervening by buying/selling ACD from/to reserve accounts
        as long there is any ETH/ACD in the reserves
        The behaviour of reserve can be changed by params and initial balances
        or changing the actor type.
        It's is special actor, don't change the name of it ('reserve').
        Leave this actor as last so that end of day snapshots are reflecting after intervention state on graphs.
    */
    reserve: { type: "ReserveBasic", count: 1, balances: { acd: Acd(0), eth: Eth(0) } } //reserve acd //reserve eth
};

module.exports = {
    actors,
    augmintOptions
};
