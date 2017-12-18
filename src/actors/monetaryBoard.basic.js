'use strict';
// work in progress, first pass, dumb monetary board...
// TODO: log moves and params it changes
// TODO: add params of intervention
const Actor = require('./actor.js');
const defaultParams = {};

class MoneteryBoardBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
    }

    executeMoves(state) {
        //const acdDemand = this.getAcdDemand();
        if (state.augmint.balances.lockedAcdPool >= state.augmint.balances.openLoansAcd) {
            state.augmint.params.lockedAcdInterestPercentage *= 0.99;
        } else {
            state.augmint.params.lockedAcdInterestPercentage *= 1.01;
        }
    }
}

module.exports = MoneteryBoardBasic;
