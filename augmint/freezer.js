
// allows freezing/unfreezing of funds

'use strict';

const augmint = require('./augmint.js');
const clock = require('../lib/clock.js');

const locks = {};
// just using a simple counter for id-ing locks:
let counter = 0;

function lockAcd(actorId, acdAmount) {

    const interestInAcd = Math.floor(acdAmount * augmint.params.lockedAcdInterestPercentage);

    if (augmint.actorBalances[actorId].acd < acdAmount) {
        return false;
    }

    if (augmint.balances.interestEarnedPool < interestInAcd) {
        return false;
    }

    // move acd user -> lock
    augmint.balances.interestEarnedPool -= interestInAcd;
    augmint.actorBalances[actorId].acd -= acdAmount;
    augmint.balances.frozenAcdPool += interestInAcd + acdAmount;

    // create lock
    locks[actorId] = locks[actorId] || {};
    locks[actorId][counter] = {
        acdValue: interestInAcd + acdAmount,
        lockedUntil: clock.getTime() + augmint.params.lockTime
    };
    counter++;

}

function releaseAcd(actorId, lockId) {

    if (!locks[actorId] || !locks[actorId][lockId]) {
        return false;
    }

    const lock = locks[actorId][lockId];

    if (lock.lockedUntil > clock.getTime()) {
        return false;
    }

    // move acd lock -> user
    augmint.balances.frozenAcdPool -= lock.acdValue;
    augmint.actorBalances[actorId].acd += lock.acdValue;
    // sanity check:
    if (augmint.balances.frozenAcdPool < 0) {
        throw new Error('frozenAcdPool has gone negative.');
    }

    // remove lock:
    locks[actorId][lockId] = null;

}

function getLocksForActor(actorId) {

    return locks[actorId];
    
}

module.exports = {
    lockAcd,
    releaseAcd,
    getLocksForActor
};
