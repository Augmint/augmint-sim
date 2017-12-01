
'use strict';

const augmint = require('../augmint/augmint.js');
const loanManager = require('../augmint/loan.manager.js');
const clock = require('./clock.js');

function run(actors, timeStep, iterations = -1) {

    while (iterations--) {

        const now = clock.getTime();

        loanManager.collectAllDefaultedLoans();

        actors.forEach((actor) => {
            actor.executeMoves(now);
        });

        clock.incrementBy(timeStep);

    }

}

module.exports = {
    run
};
