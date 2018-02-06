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
        this.waitingForBuyOrder = false;
        this.wantToLockAmount = 0;
    }

    executeMoves(state) {
        const { currentTime } = state.meta;
        const augmintInterest = state.augmint.params.lockedAcdInterestPercentage;
        const marketInterest = state.augmint.params.marketLockInterestRate;
        const acdAvailable = this.convertUsdToAcd(this.usdBalance) + this.acdBalance;
        const maxLockableAmount = state.augmint.maxLockableAmount;

        /* if there is no lock and we widn't already placed a buy ACD order for USD
           or market/augmint conditions changed then (re)calculate if we want to take a loan and how much */
        if (
            (this.locks.length === 0 && !this.waitingForBuyOrder) ||
            ((this.lastAugmintInterest != augmintInterest ||
                this.lastMarketInterest != marketInterest ||
                this.lastMaxLockableAmount != maxLockableAmount) &&
                this.wantToLockAmount > 0)
        ) {
            const marketChance = Math.min(1, augmintInterest / (marketInterest * this.params.INTEREST_SENSITIVITY));
            const wantToLock = state.utils.byChanceInADay(this.params.CHANCE_TO_LOCK * marketChance);
            const aimingToLockAmount = wantToLock ? Math.min(acdAvailable, this.params.WANTS_TO_LOCK_AMOUNT) : 0;

            /* calc how much we can lock */
            if (aimingToLockAmount > 0) {
                this.wantToLockAmount = Math.min(aimingToLockAmount, acdAvailable, maxLockableAmount);
                this.wantToLockAmount =
                    this.wantToLockAmount < state.augmint.params.minimumLockAmount ? 0 : this.wantToLockAmount;

                console.debug(
                    `**** Willing to LOCK. this.wantToLockAmount: ${
                        this.wantToLockAmount
                    }  maxLockableAmount: ${maxLockableAmount} acdAvailable: ${acdAvailable} minimumLockAmount: ${
                        state.augmint.params.minimumLockAmount
                    }`
                );
            } else {
                this.wantToLockAmount = 0;
            }
            this.waitingForBuyOrder = false; // reset it in order to recaulculate how much ACD we need to buy on exchange
            this.lastAugmintInterest = augmintInterest;
            this.lastMarketInterest = marketInterest;
            this.lastMaxLockableAmount = maxLockableAmount;
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

        // Buy ACD for lock we want
        if (this.acdBalance < this.wantToLockAmount) {
            // need to always calculate the amount rquired because wantToLockAmount might have changed
            //        (augmint or market params changed after the order was placed)
            //  since the iteration it was calculated and the first order was placed
            const needToBuy = this.wantToLockAmount - this.acdBalance - this.ownAcdOrdersSum;
            if (needToBuy > 0) {
                this.buyEthWithUsd(needToBuy);
                this.buyACD(needToBuy);
                this.waitingForBuyOrder = true;
            }
        }

        /* Lock if we want and can */
        if (this.wantToLockAmount > 0 && this.acdBalance >= this.wantToLockAmount) {
            console.debug(
                `**** GOING to LOCK. lockAmountNow: ${
                    this.wantToLockAmount
                } maxLockableAmount: ${maxLockableAmount} acdBalance: ${this.acdBalance}`
            );

            if (this.lockACD(this.wantToLockAmount)) {
                this.waitingForBuyOrder = false;
            } else {
                console.error('Cound\'t lock'); // just in case... this shouldn't happen and lockAcd logs warnings too
            }
        }

        /* sell ACD which we don't want to lock  */
        if (
            !this.waitingForBuyOrder &&
            state.utils.byChanceInADay(this.params.CHANCE_TO_SELL_ALL_ACD && this.acdBalance > 0)
        ) {
            this.sellACD(this.acdBalance);
        }

        /* sell ETH balance to USD */
        if (this.ethBalance > 0) {
            this.sellEthForUsd(this.convertEthToUsd(this.ethBalance));
        }

        /* Increase lock demand */
        if (state.meta.iteration % state.params.stepsPerDay === 0) {
            this.params.WANTS_TO_LOCK_AMOUNT *= (1 + this.params.WANTS_TO_LOCK_AMOUNT_GROWTH_PA) ** (1 / 365);
        }
        super.executeMoves(state);
    }
}

module.exports = LockerBasic;
