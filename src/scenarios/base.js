'use strict';

const augmintOptions = {
    balances: { interestEarnedPool: 5000 /* genesis */ },
    params: {
        loanToLockRatioLoanLimit: 2, // don't allow new loans if it's more
        loanToLockRatioLockLimit: 1.5, // don't allow new locks if it's less
        exchangeFeePercentage: 0.003,
        marketLoanInterestRate: 0.14, // what do we compete with?  actor's demand for loans depends on it
        marketLockInterestRate: 0.06, // what do we compete with? actor's demand for locks depends on it
        lockedAcdInterestPercentage: 0.08,
        lockTimeInDays: 30,
        ethUsdTrendSampleDays: 5, // how many days to inspect for rates.ethToUsdTrend calculation)
        loanProduct: {
            minimumLoanInAcd: 100,
            loanCollateralRatio: 0.6,
            interestPt: 0.12, // p.a.
            repaymentPeriodInDays: 60,
            defaultFeePercentage: 0.05
        }
    }
};

const actors = {
    /* ReserveBasic is continuosly intervening by buying/selling ACD from/to reserve accounts
        as long there is any ETH/ACD in the reserves
        The behaviour of reserve can be changed by params and initial balances
        or changing the actor type.
        It's is special actor, don't change the name of it ('reserve').
    */
    reserve: { type: 'ReserveBasic', balances: { acd: 100000 /* genesis acd */, eth: 0 } },
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
        type: 'LockerBasic',
        balances: {
            usd: 100000000 // 'unlimited' USD, lock demand adjusted with WANTS_TO_LOCK_AMOUNT
        },
        params: {
            WANTS_TO_LOCK_AMOUNT: 10000, // how much they want to lock
            WANTS_TO_LOCK_AMOUNT_GROWTH_PA: 1, // increase in demand % pa.
            CHANCE_TO_LOCK: 1, // always relock all ACD balance (initial liquidity provider)
            INTEREST_SENSITIVITY: 2 /* how sensitive is the locker for marketLockInterestRate ?
                                    linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */,
            CHANCE_TO_SELL_ALL_ACD: 1 /* if  doesn't want lock then what chance in a day that they sell their ACD */
        }
    },
    randomLocker: {
        type: 'LockerBasic',
        count: 50,
        balances: {
            usd: 100000000 // 'unlimited' USD, lock demand adjusted with WANTS_TO_LOCK_AMOUNT
        },
        params: {
            WANTS_TO_LOCK_AMOUNT: 5000, // how much they want to lock
            WANTS_TO_LOCK_AMOUNT_GROWTH_PA: 2, // increase in demand % pa.
            CHANCE_TO_LOCK: 0.05, // relock by chance % of days when no lock and  lock interest rates compelling
            INTEREST_SENSITIVITY: 2 /* how sensitive is the locker for marketLockInterestRate ?
                                    linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */,
            CHANCE_TO_SELL_ALL_ACD: 0.1 /* if  doesn't want lock then what chance in a day that they sell their ACD */
        }
    },
    randomAllSellBorrower: {
        type: 'BorrowerBasic',
        count: 5,
        balances: {
            eth: 500000 // unlimited ETH - demand adjusted with params
        },
        params: {
            ETH_BALANCE_GROWTH_PA: 0 /* ETH balance  grows daily by pa. % to simulate growth */,
            USD_BALANCE_GROWTH_PA: 0 /* USD balance grows daily by pa. % to simulate growth */,
            WANTS_TO_BORROW_AMOUNT: 5000, // how much they want to borrow
            WANTS_TO_BORROW_AMOUNT_GROWTH_PA: 2, // increase in demand % pa.
            CHANCE_TO_TAKE_LOAN: 1, // % chance to take a loan on a day (on top of chances based on marketrates
            CHANCE_TO_SELL_ALL_ACD: 1, // immediately sells full ACD balance
            INTEREST_SENSITIVITY: 2 /* how sensitive is the borrower for marketLoanInterestRate ?
                                    linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */
        }
    },
    randomKeeperBorrower: {
        type: 'BorrowerBasic',
        count: 50,
        balances: {
            eth: 500000 // unlimited ETH - demand adjusted with params
        },
        params: {
            ETH_BALANCE_GROWTH_PA: 0 /* ETH balance  grows daily by pa. % to simulate growth */,
            USD_BALANCE_GROWTH_PA: 0 /* USD balance grows daily by pa. % to simulate growth */,
            WANTS_TO_BORROW_AMOUNT: 5000, // how much they want to borrow
            WANTS_TO_BORROW_AMOUNT_GROWTH_PA: 2, // increase in demand % pa.
            CHANCE_TO_TAKE_LOAN: 0.05, // % chance to take a loan on a day (on top of chances based on marketrates
            CHANCE_TO_SELL_ALL_ACD: 0.1, // % chance to sell all ACD balance (unless repayment is due soon)
            INTEREST_SENSITIVITY: 2 /* how sensitive is the borrower for marketLoanInterestRate ?
                                    linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */
        }
    }
    // actor: { type: 'ExchangeTester', balances: { eth: 10000, acd: 10000 } }
};

module.exports = {
    actors,
    augmintOptions
};
