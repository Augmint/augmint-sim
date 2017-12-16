'use strict';

const Actor = require('./actor.js');
const defaultParams = {};

class ReserveBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
    }

    executeMoves(state) {
        // TODO: add some delay in intervention (ie intervene only after a couple of ticks)
        const acdDemand = this.getAcdDemand();
        if (acdDemand < 0 && this.ethBalance > 0) {
            this.buyACD(
                Math.min(this.convertEthToAcd(this.ethBalance), -acdDemand) //+ this.getAugmintBalance('openLoansAcd')
            );
        } else if (acdDemand > 0 && this.acdBalance) {
            this.sellACD(Math.min(this.acdBalance, acdDemand));
        }
    }
}

module.exports = ReserveBasic;
