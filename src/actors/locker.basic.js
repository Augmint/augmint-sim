'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    RELEASE_DELAY_DAYS: 10,
    CHANCE_TO_LOCK: 1,
    INITIAL_ACD_TO_CONVERT: 1000
};

class LockerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.acdConverted = 0;
    }

    executeMoves(state) {
        const { currentTime } = state.meta;
        const wantToLock = state.utils.byChanceInADay(this.params.CHANCE_TO_LOCK);

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
