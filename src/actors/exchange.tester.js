// just an actor for testing the exchange:

'use strict';

const ONE_DAY_IN_SECS = 24 * 60 * 60;

const Actor = require('./actor.js');
const defaultParams = {};

class ExchangeTester extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.setKey('stage', 1);
    }

    executeMoves(state) {
        const { currentTime } = state.meta;
        // gonna take action every 10 days:
        const currentStage = Math.floor(currentTime / (10 * ONE_DAY_IN_SECS));

        if (currentStage !== this.getKey('stage')) {
            return;
        }

        switch (currentStage) {
        case 1:
            this.buyACD(1000);
            break;
        case 2:
            this.buyACD(1000);
            break;
        case 3:
            this.sellACD(1500);
            break;
        case 4:
            this.sellACD(1500);
            break;
        case 5:
            this.buyACD(1000);
            break;
        default:
        }

        this.setKey('stage', this.getKey('stage') + 1);
    }
}

module.exports = ExchangeTester;
