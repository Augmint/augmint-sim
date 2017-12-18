'use strict';

const augmint = require('../augmint/augmint.js');
const exchange = require('../augmint/exchange.js');
const loanManager = require('../augmint/loan.manager.js');
const logger = require('./logger.js');
const clock = require('./clock.js');
const rates = require('../augmint/rates.js');
const ActorDirectory = require('../actors/actor.directory.js');
const RandomSeed = require('random-seed');

let params = {
    randomSeed: 'change this for different repeatable results. or do not pass for a random seed',
    timeStep: 60 * 60 * 4 // 4 hours
};
params.stepsPerDay = 24 / (params.timeStep / 60 / 60);

let random = new RandomSeed(params.randomSeed);

const actors = new Set();

function init() {
    // TODO: dirty hack. make this and/or augmint a class?
    console.log('init', exchange);
    augmint.exchange = exchange;
}

function byChanceInADay(dailyChance) {
    return random.random() < dailyChance / params.stepsPerDay;
}

function getState() {
    return {
        meta: {
            currentTime: clock.getTime(),
            currentDay: clock.getDay(),
            timeStep: params.timeStep,
            stepsPerDay: params.stepsPerDay
        },
        augmint: augmint,
        exchange: exchange,
        utils: { byChanceInADay: byChanceInADay } // TODO: do it nicer. maybe make simulation a class
    };
}

function setParams(_params) {
    if (_params.randomSeed != params.randomSeed) {
        // new seed, to be tested...
        random = new RandomSeed(_params.randomSeed);
    }
    Object.assign(params, _params);
    params = _params;
    params.stepsPerDay = 24 / (params.timeStep / 60 / 60);
}

function incrementBy(_timeStep = params.timeStep) {
    logger.logIteration(augmint);
    rates.updateRates();
    // actors make their moves:
    actors.forEach(actor => {
        actor.executeMoves(getState());
    });

    // system updates:
    loanManager.collectAllDefaultedLoans();
    clock.incrementBy(_timeStep);
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
        let count = actor.count ? actor.count : 1;
        for (let i = 0; i < count; i++) {
            let name = count > 1 ? actorId + '_' + (i + 1) : actorId;
            actors.add(new ActorDirectory[actor.type](name, actor.balances, actor.state, actor.params));
        }
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
    init,
    incrementBy,
    addActors,
    setParams,
    getState,
    patchAugmintParams,
    patchAugmintBalances,
    setState,
    byChanceInADay
};
