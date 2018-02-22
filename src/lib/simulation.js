"use strict";

const augmint = require("../augmint/augmint.js");
const exchange = require("../augmint/exchange.js");
const loanManager = require("../augmint/loan.manager.js");
const logger = require("./logger.js");
const clock = require("./clock.js");
const rates = require("../augmint/rates.js");
const ActorDirectory = require("../actors/actor.directory.js");
const RandomSeed = require("random-seed");

const params = {};
let iteration = 0;
let random = new RandomSeed(params.randomSeed);

const actors = new Set();

function setSimulationParams(_params) {
    if (_params.randomSeed != params.randomSeed) {
        // new seed, to be tested...
        random = new RandomSeed(_params.randomSeed);
    }
    Object.assign(params, _params);
    params.stepsPerDay = 24 / (params.timeStep / 60 / 60);
}

function patchAugmintParams(params) {
    loanManager.updateLoanProduct(params.loanProduct); // it will create if it doesn't exists yet
    Object.assign(augmint.params, params);
}

function patchAugmintBalances(balances) {
    Object.assign(augmint.balances, balances);
}

function init(initParams) {
    augmint.exchange = exchange; // TODO: dirty hack. make this and/or augmint a class?
    setSimulationParams(initParams.simulationParams);
    patchAugmintBalances(initParams.augmintOptions.balances);
    patchAugmintParams(initParams.augmintOptions.params);
}

function byChanceInADay(dailyChance) {
    return random.random() < dailyChance / params.stepsPerDay;
}

function byChance(chance) {
    return random.random() < chance;
}

function getState() {
    return {
        meta: {
            currentTime: clock.getTime(),
            currentDay: clock.getDay(),
            timeStep: params.timeStep,
            stepsPerDay: params.stepsPerDay,
            iteration: iteration
        },
        augmint: augmint,
        exchange: exchange,
        utils: { byChanceInADay: byChanceInADay, byChance: byChance }, // TODO: do it nicer. maybe make simulation a class
        params: params
    };
}

function incrementBy(_timeStep = params.timeStep) {
    logger.logIteration();
    rates.updateRates(getState());
    // actors make their moves:
    actors.forEach(actor => {
        actor.executeMoves(getState());
    });

    // system updates:
    loanManager.collectAllDefaultedLoans();
    clock.incrementBy(_timeStep);
    iteration++;
}

function addActors(newActors) {
    Object.keys(newActors).forEach(actorId => {
        const actor = newActors[actorId];
        const count = actor.count;
        for (let i = 0; i < count; i++) {
            const name = count > 1 ? actorId + "_" + (i + 1) : actorId;
            actors.add(new ActorDirectory[actor.type](name, actor.balances, actor.state, actor.params));
        }
    });
}

function addActorsFromGui(newActors) {
    newActors.forEach(actor => {
        const count = actor.count;
        for (let i = 0; i < count; i++) {
            const name = count > 1 ? actor.id + "_" + (i + 1) : actor.id;
            actors.add(new ActorDirectory[actor.constructor.name](name, actor.balances, actor.state, actor.parameters));
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
    // addActors,
    addActorsFromGui,
    setSimulationParams,
    getState,
    patchAugmintParams,
    patchAugmintBalances,
    setState,
    byChanceInADay
};
