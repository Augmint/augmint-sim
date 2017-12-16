'use strict';

const TIME_STEP = 60 * 60 * 4; // 4 hours

const simulation = require('./simulation.js');
const loanManager = require('../augmint/loan.manager.js');
const logger = require('./logger.js');
const graphs = require('./graphs.js');
const AugmintError = require('../augmint/augmint.error.js');

// DOM elements
const clockElem = document.querySelector('.clock');
const pauseBtn = document.querySelector('.pause-btn');
const dumpStateBtn = document.querySelector('.dumpState-btn');
const dumpIterationLogBtn = document.querySelector('.dumpIterationLog-btn');
const dumpMovesLogBtn = document.querySelector('.dumpMovesLog-btn');
const toggleLogBtn = document.querySelector('.toggleLog-btn');
const logWrapper = document.querySelector('.log-wrapper');
const logTextArea = document.querySelector('.log-textarea');
const inputs = Array.from(document.querySelectorAll('.sim-inputs input'));
const graphsWrapper = document.querySelector('.graphs-wrapper');
const errorMsg = document.querySelector('.error-msg');

let lastRender = -1;
let paused = true;
let logVisible = false;

function updateParamsFromUI() {
    const params = {};

    inputs.forEach(input => {
        const value = Number.parseFloat(input.value) || 0;
        const key = input.dataset.key;

        if (!key) {
            return;
        }

        params[key] = value;
    });

    simulation.patchAugmintParams(params);
}

function togglePause() {
    paused = !paused;

    if (paused) {
        // pausing sim:
        pauseBtn.innerHTML = 'Start';
        inputs.forEach(input => {
            input.disabled = false;
        });
    } else {
        // restarting sim:
        pauseBtn.innerHTML = 'Pause';
        inputs.forEach(input => {
            input.disabled = true;
        });
        updateParamsFromUI();
    }
}

function toggleLog() {
    logVisible = !logVisible;

    if (logVisible) {
        logWrapper.style.display = 'block';
        toggleLogBtn.innerHTML = 'Hide log';
    } else {
        logWrapper.style.display = 'none';
        toggleLogBtn.innerHTML = 'Show log';
    }
}

function init() {
    graphs.init(graphsWrapper);
    logger.init(logTextArea);

    pauseBtn.addEventListener('click', togglePause);

    dumpStateBtn.addEventListener('click', () => {
        updateParamsFromUI();
        logger.print(simulation.getState());
    });

    dumpIterationLogBtn.addEventListener('click', () => {
        logger.printIterationLog();
    });

    dumpMovesLogBtn.addEventListener('click', () => {
        logger.printMovesLog();
    });

    toggleLogBtn.addEventListener('click', toggleLog);

    updateParamsFromUI();

    // TODO: have proper start up stuff:
    simulation.patchAugmintBalances({
        interestEarnedPool: 500 /* genesis */
    });
    simulation.patchAugmintParams({ exchangeFeePercentage: 0.003 });
    simulation.addActors({
        reserve: { type: 'ReserveBasic', balances: { acd: 50000 /* genesis acd */, eth: 0 } },
        alwaysLocker: {
            type: 'LockerBasic',
            balances: {
                eth: 50000000 /* "unlimited" ETH, we set an initial one-off initial conversion
                                with maxAcdToConvert set in always.locker.js */
            }
        },
        alwaysBorrower: {
            type: 'BorrowerBasic',

            balances: {
                eth: 50000000 /* "unlimited" ETH, we adjust loan demand with
                                maxLoanAcdAmount set in always.borrower.js */
            }
        },
        randomBorrower: {
            type: 'BorrowerBasic',

            balances: {
                eth: 50000000 /* "unlimited" ETH, we adjust loan demand with
                                maxLoanAcdAmount & CHANCE_TO_TAKE_LOAN set in random.borrower.js */
            },
            params: {
                MAX_LOAN_AMOUNT_ACD: 3000,
                CHANCE_TO_TAKE_LOAN: 0.01
            }
        }
        // actor: { type: 'ExchangeTester', balances: { eth: 10000, acd: 10000 } }
    });

    // TODO: do this nicer
    loanManager.createLoanProduct(
        Number.parseFloat(document.getElementById('minimumLoanInAcd').value), // minimumLoanInAcd
        Number.parseFloat(document.getElementById('loanCollateralRatio').value), // loanCollateralRatio
        Number.parseFloat(document.getElementById('loanInterestPt').value), // interestPt pa.
        Number.parseFloat(document.getElementById('repaymentPeriodInDays').value), // repaymentPeriodInDays
        Number.parseFloat(document.getElementById('defaultFeePercentage').value) // defaultFeePercentage
    );
}

function render() {
    const state = simulation.getState();
    const daysPassed = state.meta.currentDay;

    // only re-render once per day:
    if (daysPassed > lastRender) {
        lastRender = daysPassed;
        clockElem.innerHTML = daysPassed;
        graphs.update(state.meta.currentTime, state.augmint);
    }
}

function mainLoop() {
    if (!paused) {
        try {
            simulation.incrementBy(TIME_STEP);
        } catch (err) {
            if (err instanceof AugmintError) {
                console.error(err);
                errorMsg.innerHTML = '<p>AugmintError: ' + err.message + '</p>';
                togglePause();
            } else {
                throw err;
            }
        }
        render();
    }

    requestAnimationFrame(mainLoop);
}

window.addEventListener('load', () => {
    init();
    mainLoop();
});
