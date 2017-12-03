
'use strict';

const logger = require('./logger.js');
const augmint = require('../augmint/augmint.js');
const freezer = require('../augmint/augmint.js');
const loanManager = require('../augmint/loan.manager.js');
const clock = require('./clock.js');
const ActorDirectory = require('../actors/actor.directory.js');
let meta = {} ;
let actors = {};

function run(_actors, timeStep, iterations = -1) {
    meta = { iteration : 0, timeStep: timeStep, iterations: iterations};
    actors = _actors;
    logger.setSimulation(this);
    while (iterations--) {

        const now = clock.getTime();

        // actors make their moves:
        actors.forEach((actor) => {
            actor.executeMoves(now);
        });

        // system updates:
        loanManager.collectAllDefaultedLoans();
        logger.logState(this);
        clock.incrementBy(timeStep);
        meta.iteration++;
    }

    logger.printLog();
}

// TODO: finish this, and include a setter
function getState() {

    return {
        meta: meta,
        augmint: {
            params: augmint.params,
            balances: augmint.balances,
            loanProducts: [],
            locks: {},
            loans: {}
        },
        loanManager:  loanManager,
        freezer: freezer,
        actors: actors
    };

}

module.exports = {
    run,
    getState
};
