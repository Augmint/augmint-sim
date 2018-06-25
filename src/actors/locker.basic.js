"use strict";
const { ACD0, PT0, Acd, Pt } = require("../lib/augmintNums.js");

const Actor = require("./actor.js");
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    RELEASE_DELAY_DAYS: 1,
    WANTS_TO_LOCK_AMOUNT: Acd(10000), // how much they want to lock
    WANTS_TO_LOCK_AMOUNT_GROWTH_PA: Pt(0.5), // increase in demand % pa.
    CHANCE_TO_LOCK: Pt(1),
    INTEREST_SENSITIVITY: Pt(
        2
    ) /* how sensitive is the locker for marketLockInterestRate ?
                            linear, marketChance = augmintInterest / (marketInterest * INTEREST_SENSITIVITY)  */,
    CHANCE_TO_SELL_ALL_ACD: Pt(1) /* if  doesn't want lock then what chance in a day that they sell their ACD */
};

class LockerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.waitingForBuyOrder = false;
        this.canLockAmount = ACD0;
        this.aimingToLockAmount = ACD0;
        this.lastAugmintInterest = PT0;
        this.lastMarketInterest = PT0;
    }

    executeMoves(state) {
        const { currentTime } = state.meta;
        const augmintInterest = state.augmint.params.lockedAcdInterestPercentage;
        const marketInterest = state.augmint.params.marketLockInterestRate;
        const acdAvailable = this.convertUsdToAcd(this.usdBalance)
            .add(this.acdBalance)
            .add(this.ownAcdOrdersSum);
        const maxLockableAmount = state.augmint.maxLockableAmount;
        const marketChance = Math.min(1, augmintInterest.div(marketInterest * this.params.INTEREST_SENSITIVITY));

        /* if there is no lock then calculate if we want to take a loan */
        if (this.locks.length === 0 && !this.waitingForBuyOrder) {
            const wantsToLock = state.utils.byChanceInADay(this.params.CHANCE_TO_LOCK * marketChance);
            this.aimingToLockAmount = wantsToLock
                ? Acd(Math.min(acdAvailable, this.params.WANTS_TO_LOCK_AMOUNT))
                : ACD0;
        }

        /* if want to lock and market/augmint conditions changed
            then (re)calculate if we want to take a loan and how much */
        if (
            this.aimingToLockAmount.gt(ACD0) &&
            (!augmintInterest.eq(this.lastAugmintInterest) || !marketInterest.eq(this.lastMarketInterest))
        ) {
            // console.log(`** day: ${state.meta.currentDay} (it: ${state.meta.iteration}) ** recalc aimingToLockAmount`);
            this.aimingToLockAmount = Acd(Math.min(acdAvailable, this.params.WANTS_TO_LOCK_AMOUNT));
            // TODO: recalculate if with new conditions we still want with new interest conditions
            //   (requires marketchance calcualtion refactor)
        }

        /* calc / recalc how much we can actually lock */
        if (this.aimingToLockAmount.gt(ACD0)) {
            this.canLockAmount = Acd(Math.min(this.aimingToLockAmount, maxLockableAmount));
            this.canLockAmount = this.canLockAmount.lt(state.augmint.params.minimumLockAmount)
                ? ACD0
                : this.canLockAmount;

            // console.debug(
            //     `** day: ${state.meta.currentDay} (it: ${
            //         state.meta.iteration
            //     }) ** Willing to LOCK. this.canLockAmount: ${this.canLockAmount}  aimingToLockAmount: ${
            //         this.aimingToLockAmount
            //     } maxLockableAmount: ${maxLockableAmount} acdAvailable: ${acdAvailable} minimumLockAmount: ${
            //         state.augmint.params.minimumLockAmount
            //     }`
            // );
        } else {
            this.canLockAmount = ACD0;
        }

        // Buy ACD for lock we want
        if (this.acdBalance.lt(this.canLockAmount)) {
            // need to always calculate the amount required because canLockAmount might have changed
            //  since the iteration it was calculated and the first order was placed
            //        (augmint or market params changed after the order was placed)
            const needToBuy = this.canLockAmount.sub(this.acdBalance).sub(this.ownAcdOrdersSum);

            if (needToBuy.gt(ACD0)) {
                // console.debug(
                //     `** day: ${state.meta.currentDay} (it: ${
                //         state.meta.iteration
                //     }) ** ACD BUY. needToBuy: ${needToBuy} canLockAmount: ${this.canLockAmount} acdBalance: ${
                //         this.acdBalance
                //     } ownAcdOrdersSum: ${this.ownAcdOrdersSum}`
                // );
                this.buyEthWithUsd(needToBuy);
                this.buyACD(needToBuy);
                this.waitingForBuyOrder = true;
            }
        }

        /* Lock if we want and can */
        if (this.canLockAmount.gt(ACD0) && this.acdBalance.gte(this.canLockAmount)) {
            // console.debug(
            //     `** day: ${state.meta.currentDay} (it: ${state.meta.iteration}) ** GOING to LOCK. canLockAmount: ${
            //         this.canLockAmount
            //     } maxLockableAmount: ${maxLockableAmount} acdBalance: ${this.acdBalance}`
            // );

            if (this.lockACD(this.canLockAmount)) {
                this.aimingToLockAmount = ACD0;
                this.canLockAmount = ACD0;
                this.waitingForBuyOrder = false;
                this.wantToLock = false;
            } else {
                console.error("Cound't lock"); // just in case... this shouldn't happen and lockAcd logs warnings too
            }
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

        /* sell ACD which we don't want to lock  */
        if (
            this.aimingToLockAmount.lt(this.acdBalance) &&
            state.utils.byChanceInADay(this.params.CHANCE_TO_SELL_ALL_ACD && this.acdBalance > 0)
        ) {
            // console.debug(
            //     `** day: ${state.meta.currentDay} (it: ${state.meta.iteration}) ** Selling ACD. this.canLockAmount: ${
            //         this.canLockAmount
            //     }  aimingToLockAmount: ${this.aimingToLockAmount} acdBalance: ${
            //         this.acdBalance
            //     } maxLockableAmount: ${maxLockableAmount} acdAvailable: ${acdAvailable} minimumLockAmount: ${
            //         state.augmint.params.minimumLockAmount
            //     }`
            // );

            this.sellACD(this.acdBalance.sub(this.aimingToLockAmount));
        }

        /* sell ETH balance to USD */
        if (this.ethBalance.gt(ACD0)) {
            this.sellEthForUsd(this.ethBalance);
        }

        /* Increase lock demand */
        if (state.meta.iteration % state.params.stepsPerDay === 0) {
            this.params.WANTS_TO_LOCK_AMOUNT = this.params.WANTS_TO_LOCK_AMOUNT.mul(
                this.params.WANTS_TO_LOCK_AMOUNT_GROWTH_PA.add(1) ** (1 / 365)
            );
        }

        /* save market conditions to be able to check in next iteration if they changed */
        this.lastAugmintInterest = augmintInterest;
        this.lastMarketInterest = marketInterest;
        this.lastMaxLockableAmount = maxLockableAmount;

        super.executeMoves(state);
    }
}

module.exports = LockerBasic;
