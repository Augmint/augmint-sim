'use strict';

const Actor = require('./actor.js');

class RandomBorrower extends Actor {
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {
        // TODO
    }
}

module.exports = RandomBorrower;
