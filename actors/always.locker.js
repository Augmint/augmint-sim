'use strict';

const Actor = require('./actor.js');

class AlwaysLocker extends Actor {
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {
        if (this.ethBalance > 0) {
            this.buyACD(this.convertEthToAcd(this.ethBalance));
        }
        let lockAmount = Math.min(this.acdBalance, this.getMaxLockableAcd());
        //console.debug('AlwaysLocker locked: ', lockAmount, this.acdBalance, this.getMaxLockableAcd());
        if (lockAmount > 0) {
            this.lockACD(lockAmount);
            console.debug('AlwaysLocker locked: ', lockAmount);
        }

        if (this.locks[0] && now >= this.locks[0].lockedUntil) {
            // unlocks ACD:
            this.releaseACD(this.locks[0].id);
        }
    }
}

module.exports = AlwaysLocker;
