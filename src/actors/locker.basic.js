'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    RELEASE_DELAY_DAYS: 1,
    WANTS_TO_LOCK_AMOUNT: 10000, // how much they want to lock
    WANTS_TO_LOCK_AMOUNT_GROWTH_PA: 0.5, // increase in demand % pa.
    CHANCE_TO_LOCK: 1,
    INTEREST_SENSITIVITY: 2 /* how sensitive is the locker for marketLockInterestRate ?
                            linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */,
    CHANCE_TO_SELL_ALL_ACD: 1 /* if  doesn't want lock then what chance in a day that they sell their ACD */
};

class LockerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.wantToLock = false;
        this.wantToLockAmount = 0;
    }

    executeMoves(state) {
        const { currentTime } = state.meta;
        const augmintInterest = state.augmint.params.lockedAcdInterestPercentage;
        const marketInterest = state.augmint.params.marketLockInterestRate;

        if (
            this.wantToLockAmount <= 0 ||
            this.lastAugmintInterest != augmintInterest ||
            this.lastMarketInterest != marketInterest
        ) {
            const marketChance = Math.min(1, augmintInterest / (marketInterest * this.params.INTEREST_SENSITIVITY));

            this.wantToLock = state.utils.byChanceInADay(this.params.CHANCE_TO_LOCK * marketChance);
            const acdAvailable = this.convertUsdToAcd(this.usdBalance) + this.acdBalance;
            this.wantToLockAmount = this.wantToLock
                ? Math.min(acdAvailable, this.getMaxLockableAcd(), this.params.WANTS_TO_LOCK_AMOUNT)
                : 0;
        }

        /* release lock RELEASE_DELAY_DAYS later than could unlock */
        for (let i = 0; i < this.locks.length; i++) {
            if (
                this.locks[i] &&
                currentTime >= this.locks[i].lockedUntil + this.params.RELEASE_DELAY_DAYS * ONE_DAY_IN_SECS
            ) {
                // unlocks ACD:
                this.releaseACD(this.locks[i].id);
            }
        }

        /* Buy ACD for next lock */
        if (this.acdBalance < this.wantToLockAmount && state.augmint.lockingAllowed) {
            this.buyEthWithUsd(this.wantToLockAmount - this.acdBalance);
            this.buyACD(this.wantToLockAmount - this.acdBalance);
        }

        // Let's lock
        let lockAmountNow = Math.min(this.wantToLockAmount, this.acdBalance);
        if (lockAmountNow > 0) {
            if (this.lockACD(lockAmountNow)) {
                this.wantToLockAmount -= lockAmountNow;
            }
        }

        /* sell ACD left on balance */
        if (this.acdBalance > 0 && state.utils.byChanceInADay(this.params.CHANCE_TO_SELL_ALL_ACD)) {
            this.sellACD(this.acdBalance);
        }

        /* sell ETH balance to USD */
        if (this.ethBalance > 0) {
            this.sellEthForUsd(this.convertEthToUsd(this.ethBalance));
        }

        /* Increase demand */
        if (state.meta.iteration % state.params.stepsPerDay === 0) {
            this.params.WANTS_TO_LOCK_AMOUNT *= (1 + this.params.WANTS_TO_LOCK_AMOUNT_GROWTH_PA) ** (1 / 365);
        }
        super.executeMoves(state);
    }
}

module.exports = LockerBasic;
