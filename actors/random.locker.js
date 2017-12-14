'use strict';

const Actor = require('./actor.js');

class RandomLocker extends Actor {
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {
        if (this.acdBalance && Math.random() > 0.995) {
            this.lockACD(this.acdBalance);
        }

        if (this.locks[0] && now >= this.locks[0].lockedUntil) {
            // unlocks ACD:
            this.releaseACD(this.locks[0].id);
        }
    }
}

module.exports = RandomLocker;
