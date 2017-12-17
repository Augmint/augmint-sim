'use strict';

const rates = require('./rates.json');
const clock = require('../lib/clock');
const augmint = require('./augmint.js');
const AugmintError = require('../augmint/augmint.error.js');
let dayAdjust = 0;

function updateRates() {
    const day = clock.getDay() + dayAdjust;

    if (!rates[day]) {
        throw new AugmintError(
            'No ETH/USD historic price available for day ' +
                day +
                '\nLast date available: ' +
                rates[day - 1].date +
                '\ndayAdjust: ' +
                dayAdjust
        );
    }
    augmint.rates.ethToAcd = rates[day].open;
    augmint.rates.ethToUsd = rates[day].open;
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
