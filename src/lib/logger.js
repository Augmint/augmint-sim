'use strict';
const clock = require('./clock.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
let printEachIteration = false;
let printEachMove = true;

let iteration = 0;
let logTextArea;

const iterationLogHeader = [
    'day',
    ' iteration',
    ' acdReserve',
    ' acdFeesEarned',
    ' lockedAcdPool',
    ' interestHoldingPool',
    ' interestEarnedPool',
    ' ethReserve',
    ' ethFeesEarned',
    ' collateralHeld'
];
let iterationLog = new Array(iterationLogHeader);
const movesLogHeader = [' day', ' iteration', ' move', ' actor', ' params'];
let movesLog = new Array(movesLogHeader);

function init(_logTextArea) {
    logTextArea = _logTextArea;
}

function addToLogTextArea(text) {
    logTextArea.value += text;
    logTextArea.scrollTop = logTextArea.scrollHeight;
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
                line += ', ' + JSON.stringify(_array[i][j]);
            } else {
                line += ', ' + _array[i][j];
            }
        }
        ret += line;
    }
    return ret;
}

function logMove(actor, move, params) {
    const now = clock.getTime();
    const daysPassed = Math.floor(now / ONE_DAY_IN_SECS);
    const logItem = [daysPassed, iteration, move, actor, params];
    if (printEachMove) {
        if (movesLog.length === 1) {
            addToLogTextArea('MOVE, ' + movesLogHeader + '\n');
        }
        addToLogTextArea('MOVE, ' + toCsv(new Array(logItem)) + '\n');
    }
    movesLog.push(logItem);
}

function logIteration(augmint) {
    const now = clock.getTime();
    const daysPassed = Math.floor(now / ONE_DAY_IN_SECS);
    const logItem = [
        daysPassed,
        iteration,
        augmint.actors.reserve.balances.acd,
        augmint.balances.acdFeesEarned,
        augmint.balances.lockedAcdPool,
        augmint.balances.interestHoldingPool,
        augmint.balances.interestEarnedPool,
        augmint.actors.reserve.balances.eth,
        augmint.balances.ethFeesEarned,
        augmint.balances.collateralHeld
    ];
    if (printEachIteration) {
        if (iterationLog.length === 1) {
            addToLogTextArea('ITERATION, ' + iterationLogHeader + '\n');
        }
        addToLogTextArea('ITERATION ' + toCsv(new Array(logItem)) + '\n');
    }
    iterationLog.push(logItem);
    iteration++;
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
