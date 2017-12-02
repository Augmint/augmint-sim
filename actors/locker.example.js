
'use strict';

const Actor = require('./actor.js');

class LockerExample extends Actor {
    
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {

        if (now === 0) {
            // locker buys 1000 acd and then locks it all
            this.buyACD(1000);
            this.lockACD(this.acdBalance);
        } else if (this.locks[0] && now >= this.locks[0].lockedUntil) {
            // unlocks ACD:
            this.releaseACD(this.locks[0].id);
        } else if (this.acdBalance) {
            // sells ACD:
            this.sellACD(this.acdBalance);
        }
        
    }

}

module.exports = LockerExample;
