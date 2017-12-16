'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    RELEASE_DELAY_DAYS: 3,
    CHANCE_TO_LOCK: 1,
    INITIAL_ACD_CONVERTED: 10000
};
let acdConverted = 0;

class LockerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
    }

    executeMoves(now) {
        let acdToConvert = Math.min(
            this.convertEthToAcd(this.ethBalance),
            this.params.INITIAL_ACD_CONVERTED - acdConverted
        );

        if (acdToConvert > 0 && Math.random() < this.params.CHANCE_TO_LOCK) {
            if (this.buyACD(acdToConvert)) {
                acdConverted += acdToConvert;
            }
        }
        let lockAmount = Math.min(this.acdBalance, this.getMaxLockableAcd());
        //console.debug('AlwaysLocker locked: ', lockAmount, this.acdBalance, this.getMaxLockableAcd());
        if (lockAmount > 0) {
            this.lockACD(lockAmount);
        }

        if (this.locks[0] && now >= this.locks[0].lockedUntil + this.params.RELEASE_DELAY_DAYS * ONE_DAY_IN_SECS) {
            // unlocks ACD:
            this.releaseACD(this.locks[0].id);
        }
    }
}

module.exports = LockerBasic;
