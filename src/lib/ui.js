'use strict';

const simulation = require('./simulation.js');
const loanManager = require('../augmint/loan.manager.js');
const logger = require('./logger.js');
const rates = require('../augmint/rates.js');
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
const ratesDropDown = document.querySelector('.rates-dropdown');
const inputs = Array.from(document.querySelectorAll('.sim-inputs input'));
const graphsWrapper = document.querySelector('.graphs-wrapper');
const errorMsg = document.querySelector('.error-msg');

let lastRender = -1;
let paused = true;
let logVisible = false;
let benchmarkStart;
let benchmarkItCt;

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
        let runTime = Date.now() - benchmarkStart;
        pauseBtn.innerHTML = 'Continue';
        inputs.forEach(input => {
            input.disabled = false;
        });

        console.debug(
            'Benchmark: iterations/sec: ',
            benchmarkItCt / (runTime / 1000),
            'iteration count:' + benchmarkItCt + ' running time: ' + runTime + 'ms'
        );
    } else {
        // restarting sim:
        benchmarkStart = Date.now();
        benchmarkItCt = 0;
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

function ratesDropDownOnChange(newDay) {
    rates.setDay(newDay);
}

function populateRatesDropDown() {
    return new Promise(resolve => {
        for (let i = 0; i < rates.rates.length; i += 7) {
            let el = document.createElement('option');
            el.textContent = rates.rates[i].date + ' | ' + Math.round(rates.rates[i].close * 10000) / 10000;
            el.value = i;
            ratesDropDown.appendChild(el);
        }
        resolve();
    });
}

function init() {
    graphs.init(graphsWrapper);
    logger.init(logTextArea);

    populateRatesDropDown();

    pauseBtn.addEventListener('click', togglePause);

    ratesDropDown.addEventListener('change', () => ratesDropDownOnChange(ratesDropDown.value));

    dumpStateBtn.addEventListener('click', () => {
        updateParamsFromUI();
        logger.print(simulation.getState());
    });

    dumpIterationLogBtn.addEventListener('click', () => {
        logger.printIterationLog();
    });

    dumpMovesLogBtn.addEventListener('click', () => {
        let startPos = logTextArea.textLength;
        logger.printMovesLog();
        logTextArea.focus();
        let endPos = logTextArea.textLength;
        startPos += logTextArea.value.substring(startPos, endPos).indexOf('\n') + 1;
        endPos = startPos + logTextArea.value.substring(startPos, endPos - 2).lastIndexOf('\n');
        logTextArea.selectionStart = startPos;
        logTextArea.selectionEnd = endPos;
        document.execCommand('copy');
        alert('Moves log CSV copied to clipboard');
    });

    toggleLogBtn.addEventListener('click', toggleLog);

    updateParamsFromUI();

    // TODO: have proper start up stuff:
    simulation.patchAugmintBalances({
        interestEarnedPool: 3000 /* genesis */
    });
    simulation.patchAugmintParams({ exchangeFeePercentage: 0.003 });
    simulation.addActors({
        reserve: { type: 'ReserveBasic', balances: { acd: 50000 /* genesis acd */, eth: 0 } },
        alwaysLocker: {
            type: 'LockerBasic',
            balances: {
                eth: 50000000 /* "unlimited" ETH, demand adjusted with CHANCE_TO_LOCK & INITIAL_ACD_CONVERTED */
            }
        },
        randomLocker: {
            type: 'LockerBasic',
            count: 2,
            balances: {
                eth: 50000000 /* "unlimited" ETH, demand adjusted with CHANCE_TO_LOCK & INITIAL_ACD_CONVERTED */,
                CHANCE_TO_LOCK: 0.1
            }
        },
        alwaysBorrower: {
            type: 'BorrowerBasic',

            balances: {
                eth: 50000000 /* "unlimited" ETH, demand adjusted with CHANCE_TO_TAKE_LOAN & CHANCE_TO_TAKE_LOAN  */
            },
            params: {
                MAX_LOAN_AMOUNT_ACD: 1000,
                CHANCE_TO_TAKE_LOAN: 1, // always takes a loan when there isn't one
                CHANCE_TO_SELL_ALL_ACD: 1 // immediately sells full ACD balance
            }
        },
        randomBorrower: {
            type: 'BorrowerBasic',
            count: 2,
            balances: {
                eth: 50000000 /* "unlimited" ETH, demand adjusted with CHANCE_TO_TAKE_LOAN & CHANCE_TO_TAKE_LOAN  */
            },
            params: {
                MAX_LOAN_AMOUNT_ACD: 3000,
                CHANCE_TO_TAKE_LOAN: 0.05, // % chance to take a loan
                CHANCE_TO_SELL_ALL_ACD: 0.1 // % chance to sell all ACD balance (unless repayment is due soon)
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
    let doFrame = false;
    let start = Date.now();
    while (!paused && !doFrame) {
        benchmarkItCt++;
        try {
            simulation.incrementBy();
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
        doFrame = Date.now() - start > 10;
    }
    requestAnimationFrame(mainLoop);
}

window.addEventListener('load', () => {
    init();
    mainLoop();
});
