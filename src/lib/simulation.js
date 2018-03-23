"use strict";

const augmint = require("../augmint/augmint.js");
const exchange = require("../augmint/exchange.js");
const loanManager = require("../augmint/loan.manager.js");
const clock = require("./clock.js");
const rates = require("../augmint/rates.js");
const ActorDirectory = require("../actors/actor.directory.js");
const RandomSeed = require("random-seed");

const params = {};
let iteration = 0;
let random = new RandomSeed(params.randomSeed);

const actors = new Set();

function setSimulationParams(_params) {
    // console.log("_params.randomSeed:" + _params.randomSeed);
    // console.log("params.randomSeed:" + params.randomSeed);
    // console.log(_params.randomSeed != params.randomSeed);

    // if (_params.randomSeed != params.randomSeed) {
    // console.error("new randomseed created");
    // new seed, to be tested...
    random = new RandomSeed(_params.randomSeed);
    // }
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

function showLog() {
    // console.log(JSON.stringify(Array.from(actors), null, 3));
    // console.log(JSON.stringify(Array.from(actors.keys()), null, 3));
    // console.log(JSON.stringify(Array.from(actors.values()), null, 3));
    // console.log("actors:");
    // let actLog = "";
    // for (var it = actors.values(), val = null; (val = it.next().value); ) {
    //     actLog += JSON.stringify(val, null, 3).replace(/\\"/g, "\"");
    // }
    // console.log(actLog);
}

function clearActors() {
    // // console.log("actors:");
    // let actLog = "";
    // for (var it = actors.values(), val = null; (val = it.next().value); ) {
    //     actLog += JSON.stringify(val, null, 3).replace(/\\"/g, "\"");
    // }
    // // console.log(actLog);
}

function init(initParams) {
    // console.log("before init");
    // augmint.debugState();
    // showLog();
    // this.getState(true);
    iteration = 0;
    clock.setTime(0);

    // for (var it = actors.values(), val = null; (val = it.next().value); ) {
    //     if (val.locks.length > 0) {
    //         // console.log(val.id + ":" + JSON.stringify(val.locks[0].id));
    //         console.log(val.id + ":" + JSON.stringify(val));
    //         val.releaseACD(val.locks[0].id);
    //     }
    // }
    clearActors();
    actors.clear();
    loanManager.clearAllLoans();

    augmint.init();
    augmint.exchange = exchange; // TODO: dirty hack. make this and/or augmint a class?
    setSimulationParams(initParams.simulationParams);
    patchAugmintBalances(initParams.augmintOptions.balances);
    // console.error("initparams:");
    // console.error(JSON.stringify(initParams.augmintOptions.params, null, 3));
    patchAugmintParams(initParams.augmintOptions.params);
    console.log("after init");
    this.getState(true);
    // augmint.debugState();
    // showLog();
}

function byChanceInADay(dailyChance) {
    return random.random() < dailyChance / params.stepsPerDay;
}

function byChance(chance) {
    return random.random() < chance;
}

function getState(showLog) {
    const a = {
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
    if (showLog) {
        // console.error("getState()");
        // console.log(JSON.stringify(a, null, 3));
    }
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
    console.log("actors from gui");
    newActors.forEach(actor => {
        const count = actor.count;
        for (let i = 0; i < count; i++) {
            const name = count > 1 ? actor.id + "_" + (i + 1) : actor.id;
            actors.add(new ActorDirectory[actor.constructor.name](name, actor.balances, actor.state, actor.parameters));
        }
    });
    showLog();
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
    addActorsFromGui,
    setSimulationParams,
    getState,
    patchAugmintParams,
    patchAugmintBalances,
    setState,
    byChanceInADay
};
