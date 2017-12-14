'use strict';

const ONE_DAY_IN_SECS = 24 * 60 * 60;
const TIME_STEP = 60 * 60 * 4; // 4 hours

const simulation = require('./simulation.js');
const graphs = require('./graphs.js');
const AugmintError = require('../augmint/augmint.error.js');

// DOM elements
const clockElem = document.querySelector('.clock');
const pauseBtn = document.querySelector('.pause-btn');
const dumpStateBtn = document.querySelector('.dump-btn');
const inputs = Array.from(document.querySelectorAll('.sim-inputs input'));
const graphsWrapper = document.querySelector('.graphs-wrapper');
const errorMsg = document.querySelector('.error-msg');

let lastRender = -1;
let paused = true;

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

function init() {
    graphs.init(graphsWrapper);

    pauseBtn.addEventListener('click', togglePause);

    dumpStateBtn.addEventListener('click', () => {
        updateParamsFromUI();
        console.log(simulation.getState());
    });

    updateParamsFromUI();

    // TODO: have proper start up stuff:
    simulation.patchAugmintBalances({
        interestEarnedPool: 5000
    });
    simulation.addActors({
        reserve: { type: 'Reserve', balances: { acd: 10000 } },
        alwaysLocker: { type: 'AlwaysLocker', balances: { eth: 500 } }
    });
    // simulation.addActors({
    //     actor: { type: 'ExchangeTester', balances: { eth: 10000, acd: 10000 } }
    // });
}

function render() {
    const state = simulation.getState();
    const daysPassed = Math.floor(state.meta.currentTime / ONE_DAY_IN_SECS);

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
