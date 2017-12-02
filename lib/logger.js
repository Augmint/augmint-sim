'use strict';

const augmint = require('../augmint/augmint.js');
const freezer = require('../augmint/freezer.js');
const loanManager = require('../augmint/loan.manager.js');

let log = new Array();
log.push([
    'iteration',
    'acdReserve',
    'acdFeesEarned',
    'lockedAcdPool',
    'interestHoldingPool',
    'interestEarnedPool',
    'ethReserve',
    'ethFeesEarned',
    'collateralHeld',
    'freezer.counter',
    'loanManager.counter'
]);
function logState(iteration) {
    log.push([
        iteration,
        augmint.balances.acdReserve,
        augmint.balances.acdFeesEarned,
        augmint.balances.lockedAcdPool,
        augmint.balances.interestHoldingPool,
        augmint.balances.interestEarnedPool,
        augmint.balances.ethReserve,
        augmint.balances.ethFeesEarned,
        augmint.balances.collateralHeld,
        freezer.counter,
        loanManager.counter
    ]);
}

function printLog() {
    console.log('===== STATUS LOG =====');
    for (let i = 0; i < log.length; i++) {
        let out = log[i][0];
        for (let j = 1; j < log[i].length; j++) {
            out += ', ' + log[i][j];
        }
        console.log(out);
    }
    console.log('===== /STATUS LOG =====')
}

function logMove( actor, move, params) {
    console.log( ' Move: ', move, ' actor: ', actor, ' Params: ', params);
}

module.exports = {
    logState,
    logMove,
    printLog
};
