// allows freezing/unfreezing of funds

'use strict';

const ONE_DAY_IN_SECS = 24 * 60 * 60;

const augmint = require('./augmint.js');
const clock = require('../lib/clock.js');

const locks = {};
// just using a simple counter for id-ing locks:
let counter = 0;

function lockACD(actorId, acdAmount) {
    const interestPt = (1 + augmint.params.lockedAcdInterestPercentage) ** (augmint.params.lockTimeInDays / 365) - 1;
    const interestInAcd = acdAmount * interestPt;

    if (augmint.actors[actorId].balances.acd < acdAmount) {
        return false;
    }

    if (augmint.balances.interestEarnedPool < interestInAcd) {
        return false;
    }

    // move acd user -> lock
    augmint.balances.interestEarnedPool -= interestInAcd;
    augmint.actors[actorId].balances.acd -= acdAmount;
    augmint.balances.lockedAcdPool += interestInAcd + acdAmount;

    const lockId = counter;
    counter++;

    // create lock
    locks[actorId] = locks[actorId] || {};
    locks[actorId][lockId] = {
        id: lockId,
        acdValue: interestInAcd + acdAmount,
        lockedUntil: clock.getTime() + augmint.params.lockTimeInDays * ONE_DAY_IN_SECS
    };

    return lockId;
}

function releaseACD(actorId, lockId) {
    if (!locks[actorId] || !locks[actorId][lockId]) {
        return false;
    }

    const lock = locks[actorId][lockId];

    if (lock.lockedUntil > clock.getTime()) {
        return false;
    }

    // move acd lock -> user
    augmint.balances.lockedAcdPool -= lock.acdValue;
    augmint.actors[actorId].balances.acd += lock.acdValue;
    // sanity check:
    if (augmint.balances.lockedAcdPool < 0) {
        throw new Error('lockedAcdPool has gone negative.');
    }

    // remove lock:
    delete locks[actorId][lockId];
}

// allows actors to query their locks:
function getLocksForActor(actorId) {
    return locks[actorId];
}

function getMaxLockableAcd() {
    const interestPt = (1 + augmint.params.lockedAcdInterestPercentage) ** (augmint.params.lockTimeInDays / 365) - 1;
    const maxAmount = Math.floor(augmint.balances.interestEarnedPool / interestPt);
    return maxAmount;
}

module.exports = {
    lockACD,
    releaseACD,
    getLocksForActor,
    getMaxLockableAcd
};
