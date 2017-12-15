'use strict';

const Actor = require('./actor.js');

class Reserve extends Actor {
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {
        // TODO: add some delay in intervention (ie intervene only after a couple of ticks)
        const acdDemand = this.getAcdDemand();
        if (acdDemand < 0) {
            this.buyACD(
                Math.min(this.convertEthToAcd(this.ethBalance), -acdDemand) //+ this.getAugmintBalance('openLoansAcd')
            );
        } else if (acdDemand > 0) {
            this.sellACD(Math.min(this.acdBalance, acdDemand));
        }
    }
}

module.exports = Reserve;
