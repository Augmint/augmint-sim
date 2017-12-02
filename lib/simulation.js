
'use strict';

const logger = require('./logger.js');
const augmint = require('../augmint/augmint.js');
const loanManager = require('../augmint/loan.manager.js');
const clock = require('./clock.js');
const ActorDirectory = require('../actors/actor.directory.js');
let iteration = 0;

function run(actors, timeStep, iterations = -1) {

    while (iterations--) {

        const now = clock.getTime();

        // actors make their moves:
        actors.forEach((actor) => {
            actor.executeMoves(now);
        });

        // system updates:
        loanManager.collectAllDefaultedLoans();
        logger.logState(iteration);
        clock.incrementBy(timeStep);
        iteration++;
    }

    logger.printLog();
}

// TODO: finish this, and include a setter
function getState() {

    return {
        meta: {
            currentTime: clock.getTime(),
            timeStep: 0
        },
        augmint: {
            params: augmint.params,
            balances: augmint.balances,
            loanProducts: [],
            locks: {},
            loans: {}
        },
        actors: {
            // { balances, state, type, id }
        }
    };

}

module.exports = {
    run,
    iteration
};
