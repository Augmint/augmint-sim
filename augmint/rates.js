'use strict';
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const START = 100;
const rates = require('./rates.json');
const augmint = require('./augmint.js');

function updateRates(now) {
    const day = Math.floor(now / ONE_DAY_IN_SECS) + START;
    if (!rates[day]) {
        throw new Error(
            'No ETH/USD historic price available for day ' +
                day +
                '\nLast date available: ' +
                rates[day - 1].date +
                '\nStarted on day ' +
                START +
                ' on ' +
                rates[START].date
        );
    }
    augmint.rates.ethToAcd = rates[day].open;
    augmint.rates.ethToUsd = rates[day].open;
}

module.exports = {
    updateRates
};
