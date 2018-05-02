"use strict";

const bigNums = require("../lib/bigNums.js");
const Acd = bigNums.FixedAcd;

const rates = require("./rates.json");
const clock = require("../lib/clock");
const statistical = require("../lib/statistical.js");
const AugmintError = require("../augmint/augmint.error.js");

let dayAdjust = 0;
let ethUsdHist = [];

function updateRates(state) {
    const day = clock.getDay() + dayAdjust;
    const augmint = state.augmint;
    if (!rates[day]) {
        throw new AugmintError(
            "No ETH/USD historic price available for day " +
                day +
                "\nLast date available: " +
                rates[day - 1].date +
                "\ndayAdjust: " +
                dayAdjust
        );
    }
    augmint.rates.ethToAcd = Acd(rates[day].open);
    augmint.rates.ethToUsd = Acd(rates[day].open);
    ethUsdHist.push(augmint.rates.ethToUsd);
    if (ethUsdHist.length > augmint.params.ethUsdTrendSampleDays * state.meta.stepsPerDay) {
        ethUsdHist.shift();
    }

    // scale down prices & populate x
    let scaledHist = [];
    let x = [];
    const maxVal = Math.max(...ethUsdHist);
    for (let i = 0; i < ethUsdHist.length; i++) {
        scaledHist.push(ethUsdHist[i] / maxVal);
        x.push(i);
    }

    const ret = {};
    const fx = statistical.leastSquares(x, scaledHist, ret);
    augmint.rates.ethToUsdTrend = ret.m;
}

function setDay(day) {
    const currentDay = clock.getDay();
    dayAdjust = day - currentDay;
}

module.exports = {
    updateRates,
    setDay,
    rates
};
