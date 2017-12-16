'use strict';

const augmint = require('../augmint/augmint.js');
const loanManager = require('../augmint/loan.manager.js');
const logger = require('./logger.js');
const clock = require('./clock.js');
const rates = require('../augmint/rates.js');
const ActorDirectory = require('../actors/actor.directory.js');

const actors = new Set();

function getState() {
    return {
        meta: {
            currentTime: clock.getTime(),
            currentDay: clock.getDay(),
            timeStep: 60 * 60 * 4 // 4 hours
        },
        augmint: augmint
    };
}

function incrementBy(timeStep = getState().meta.timeStep) {
    const now = clock.getTime();
    rates.updateRates();
    // actors make their moves:
    actors.forEach(actor => {
        actor.executeMoves(now);
    });

    // system updates:
    loanManager.collectAllDefaultedLoans();
    logger.logIteration(augmint);
    clock.incrementBy(timeStep);
}

function patchAugmintParams(params) {
    Object.assign(augmint.params, params);
}

function patchAugmintBalances(balances) {
    Object.assign(augmint.balances, balances);
}

function addActors(newActors) {
    Object.keys(newActors).forEach(actorId => {
        const actor = newActors[actorId];
        actors.add(new ActorDirectory[actor.type](actorId, actor.balances, actor.state, actor.params));
    });
}

function setState(state) {
    clock.setTime(state.meta.currentTime || 0);

    actors.clear();
    addActors(state.augmint.actors);

    patchAugmintBalances(state.augmint.balances);

    patchAugmintParams(state.augmint.params);
}

module.exports = {
    incrementBy,
    addActors,
    getState,
    patchAugmintParams,
    patchAugmintBalances,
    setState
};
