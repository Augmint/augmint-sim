'use strict';
const clock = require('./clock.js');
let printEachIteration = false;
let printEachMove = true;

let simulationState;
let logTextArea;

const augmintStatusHeader = [
    ' ethUsd',
    ' netAcdDemand',
    ' acdReserve',
    ' ethReserve',
    ' acdFeesEarned',
    ' lockedAcdPool',
    ' openLoansAcd',
    ' defaultedLoansAcd',
    ' interestEarnedPool',
    ' ethFeesEarned',
    ' collateralHeld'
];
const iterationLogHeader = ['day', ' iteration'].concat(augmintStatusHeader);
let iterationLog = new Array(iterationLogHeader);

const movesConsoleLogHeader = [' day', ' iteration', ' actor', ' move', ' params'];
const movesLogHeader = movesConsoleLogHeader.concat(augmintStatusHeader);
let movesLog = new Array(movesLogHeader);

function init(_simulationState, _logTextArea) {
    simulationState = _simulationState;
    logTextArea = _logTextArea;
}

function addToLogTextArea(text) {
    return new Promise(resolve => {
        logTextArea.value += text;
        logTextArea.scrollTop = logTextArea.scrollHeight;
        resolve();
    });
}

function print(objToPrint) {
    addToLogTextArea(JSON.stringify(objToPrint));
    console.log(objToPrint);
}

function toCsv(_array) {
    let ret = '';
    for (let i = 0; i < _array.length; i++) {
        if (ret != '') {
            ret += '\n';
        }
        let line = _array[i][0];
        for (let j = 1; j < _array[i].length; j++) {
            if (typeof _array[i][j] === 'object') {
                line += '\t ' + JSON.stringify(_array[i][j]);
            } else {
                line += '\t ' + _array[i][j];
            }
        }
        ret += line;
    }
    return ret;
}

function getAugmintStatusLog() {
    const augmint = simulationState().augmint;
    return [
        augmint.rates.ethToUsd,
        augmint.netAcdDemand,
        augmint.reserveAcd,
        augmint.reserveEth,
        augmint.balances.acdFeesEarned,
        augmint.balances.lockedAcdPool,
        augmint.balances.openLoansAcd,
        augmint.balances.defaultedLoansAcd,
        augmint.balances.interestEarnedPool,
        augmint.balances.ethFeesEarned,
        augmint.balances.collateralHeld
    ];
}

function logMove(actor, move, params) {
    const daysPassed = clock.getDay();
    const logItem = [daysPassed, simulationState().meta.iteration, actor, move, params];
    if (printEachMove) {
        if (movesLog.length === 1) {
            addToLogTextArea('MOVE, ' + movesConsoleLogHeader + '\n');
        }
        addToLogTextArea('MOVE, ' + toCsv(new Array(logItem)) + '\n');
    }
    movesLog.push(logItem.concat(getAugmintStatusLog()));
}

function logIteration() {
    const daysPassed = clock.getDay();
    const logItem = [daysPassed, simulationState().meta.iteration].concat(getAugmintStatusLog());
    if (printEachIteration) {
        if (iterationLog.length === 1) {
            addToLogTextArea('ITERATION, ' + iterationLogHeader + '\n');
        }
        addToLogTextArea('ITERATION ' + toCsv(new Array(logItem)) + '\n');
    }
    logMove('simulation', 'New iteration', '');
    iterationLog.push(logItem);
}

function printIterationLog() {
    addToLogTextArea('===== ITERATION LOG =====\n' + toCsv(iterationLog) + '\n' + '===== /ITERATION LOG =====\n\n');
}

function printMovesLog() {
    addToLogTextArea('===== MOVES LOG =====\n' + toCsv(movesLog) + '\n' + '===== /MOVES LOG =====\n\n');
}

module.exports = {
    init,
    logIteration,
    logMove,
    print,
    printIterationLog,
    printMovesLog
};
