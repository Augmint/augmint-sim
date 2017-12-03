'use strict';

let simulation;
let log = new Array([
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
let moves = new Array([
    'iteration',
    'move',
    'actor',
    'params'
])

function setSimulation(_simulation) {
    simulation = _simulation;
}
function logState() {
    let st = simulation.getState();
    log.push([
        st.meta.iteration,
        st.augmint.balances.acdReserve,
        st.augmint.balances.acdFeesEarned,
        st.augmint.balances.lockedAcdPool,
        st.augmint.balances.interestHoldingPool,
        st.augmint.balances.interestEarnedPool,
        st.augmint.balances.ethReserve,
        st.augmint.balances.ethFeesEarned,
        st.augmint.balances.collateralHeld,
        st.freezer.counter,
        st.loanManager.counter
    ]);
}

function printLog() {
    console.log('===== MOVES LOG =====');
    console.log(toCsv(moves));
    console.log('===== /MOVES LOG =====')
    console.log('===== STATUS LOG =====');
    console.log(toCsv(log));
    console.log('===== /STATUS LOG =====')
}

function toCsv(_array) {
    let ret = "";
    for (let i = 0; i < _array.length; i++) {
        if( ret != "") { ret +=  "\n"; }
        let line = _array[i][0];
        for (let j = 1; j < _array[i].length; j++) {
            if ( typeof _array[i][j] === 'object' ) {
                line += ', ' + JSON.stringify(_array[i][j]);
            } else {
                line += ', ' + _array[i][j];
            }
        }
        ret += line;
    }
    return ret;
}

function logMove( actor, move, params) {
    let st = simulation.getState();
    moves.push( [  st.meta.iteration, move, actor,  params ]);
}

module.exports = {
    setSimulation,
    logState,
    logMove,
    printLog
};
