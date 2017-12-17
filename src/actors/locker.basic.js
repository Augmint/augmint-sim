'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    RELEASE_DELAY_DAYS: 2,
    CHANCE_TO_LOCK: 1,
    INITIAL_ACD_CONVERTED: 10000
};

class LockerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.acdConverted = 0;
    }

    executeMoves(state) {
        const { currentTime } = state.meta;
        let acdToConvert = Math.min(
            this.convertEthToAcd(this.ethBalance),
            this.params.INITIAL_ACD_CONVERTED - this.acdConverted
        );

        if (acdToConvert > 0 && state.utils.byChanceInADay(this.params.CHANCE_TO_LOCK)) {
            if (this.buyACD(acdToConvert)) {
                this.acdConverted += acdToConvert;
            }
        }
        let lockAmount = Math.min(this.acdBalance, this.getMaxLockableAcd());
        //console.debug('AlwaysLocker locked: ', lockAmount, this.acdBalance, this.getMaxLockableAcd());
        if (lockAmount > 0) {
            this.lockACD(lockAmount);
        }

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
