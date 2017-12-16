'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const RELEASE_DELAY_DAYS = 3;
let totalAcdToConvert = 10000;

class LockerBasic extends Actor {
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {
        let maxAcdToConvert = Math.min(this.convertEthToAcd(this.ethBalance), totalAcdToConvert);
        totalAcdToConvert -= maxAcdToConvert;
        if (maxAcdToConvert > 0) {
            this.buyACD(maxAcdToConvert);
        }
        let lockAmount = Math.min(this.acdBalance, this.getMaxLockableAcd());
        //console.debug('AlwaysLocker locked: ', lockAmount, this.acdBalance, this.getMaxLockableAcd());
        if (lockAmount > 0) {
            this.lockACD(lockAmount);
        }

        if (this.locks[0] && now >= this.locks[0].lockedUntil + RELEASE_DELAY_DAYS * ONE_DAY_IN_SECS) {
            // unlocks ACD:
            this.releaseACD(this.locks[0].id);
        }
    }
}

module.exports = LockerBasic;
