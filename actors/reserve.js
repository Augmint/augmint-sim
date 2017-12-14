'use strict';

const Actor = require('./actor.js');

class Reserve extends Actor {
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {
        if (now === 0) {
            this.sellACD(this.acdBalance);
        }
    }
}

module.exports = Reserve;
