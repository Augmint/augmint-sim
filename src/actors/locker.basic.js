'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    RELEASE_DELAY_DAYS: 10,
    CHANCE_TO_LOCK: 1,
    INITIAL_ACD_TO_CONVERT: 1000,
    INTEREST_SENSITIVITY: 0.5 /* how sensitive is the locker for marketLockInterestRate ?
                                linear, chance = INTEREST_SENSITIVITY * marketRateAdventagePt
                                TODO: make this a curve and to a param which makes more sense
                                        + do we need CHANCE_TO_LOCK since we have this?    */,
    INTEREST_ADVANTAGE_PT_POINT_ADJUSTMENT: 0.05 /* locks with a small chance even when interestadvantage is 0 or less.
                                                    e.g. 0.01 then it calculates with 1% adv. when 0% advantage
                                                     TODO: make it better */
};

class LockerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.acdConverted = 0;
    }

    executeMoves(state) {
        const { currentTime } = state.meta;

        const augmintInterest = state.augmint.params.lockedAcdInterestPercentage;
        const marketInterest = state.augmint.params.marketLoanInterestRate;

        const interestAdvantagePt =
            (marketInterest - augmintInterest) / marketInterest + this.params.INTEREST_ADVANTAGE_PT_POINT_ADJUSTMENT;
        const marketChance = Math.min(1, interestAdvantagePt * this.params.INTEREST_SENSITIVITY);

        //console.log(marketInterest, augmintInterest, interestAdvantagePt, marketChance * state.meta.stepsPerDay);

        const wantToLock = state.utils.byChanceInADay(this.params.CHANCE_TO_LOCK * marketChance);

        /* Buy a total of INITIAL_ACD_CONVERTED */
        let acdToConvert = Math.min(
            this.convertEthToAcd(this.ethBalance),
            this.params.INITIAL_ACD_TO_CONVERT - this.acdConverted
        );
        if (acdToConvert > 0 && wantToLock) {
            if (this.buyACD(acdToConvert)) {
                this.acdConverted += acdToConvert;
            }
        }

        /* lock full ACD balance if no lock and by CHANCE_TO_LOCK */
        const lockAmount = Math.min(this.acdBalance, this.getMaxLockableAcd());
        if (lockAmount > 0 && wantToLock) {
            this.lockACD(lockAmount);
        }

        /* release lock RELEASE_DELAY_DAYS later than could unlock */
        if (
            this.locks[0] &&
            currentTime >= this.locks[0].lockedUntil + this.params.RELEASE_DELAY_DAYS * ONE_DAY_IN_SECS
        ) {
            // unlocks ACD:
            this.releaseACD(this.locks[0].id);
        }
    }
}

module.exports = LockerBasic;
