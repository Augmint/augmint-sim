'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    RELEASE_DELAY_DAYS: 1,
    CHANCE_TO_LOCK: 1,
    INTEREST_SENSITIVITY: 0.5 /* how sensitive is the locker for marketLockInterestRate ?
                                linear, chance = INTEREST_SENSITIVITY * marketRateAdventagePt
                                TODO: make this a curve and to a param which makes more sense
                                        + do we need CHANCE_TO_LOCK since we have this?    */,
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
            const interestAdvantagePt = (augmintInterest - marketInterest) / marketInterest;
            const marketChance = Math.min(1, interestAdvantagePt * this.params.INTEREST_SENSITIVITY);

            this.wantToLock = state.utils.byChanceInADay(this.params.CHANCE_TO_LOCK * marketChance);
            const acdAvailable = this.convertUsdToAcd(this.usdBalance) + this.acdBalance;
            this.wantToLockAmount = this.wantToLock
                ? Math.min(acdAvailable * marketChance, this.getMaxLockableAcd(), acdAvailable)
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
        if (this.acdBalance < this.wantToLockAmount) {
            this.buyEthWithUsd(this.wantToLockAmount - this.acdBalance);
            this.buyACD(this.wantToLockAmount - this.acdBalance);
        }

        // Let's lock
        let lockAmountNow = Math.min(this.wantToLockAmount, this.acdBalance);
        if (lockAmountNow > 0) {
            if (this.lockACD(lockAmountNow)) {
                this.lockAmount -= lockAmountNow;
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

        super.executeMoves(state);
    }
}

module.exports = LockerBasic;
