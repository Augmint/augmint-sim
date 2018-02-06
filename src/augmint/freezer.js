// allows freezing/unfreezing of funds

'use strict';

//const AugmintError = require('../augmint/augmint.error.js');
const augmint = require('./augmint.js');
const clock = require('../lib/clock.js');

const ONE_DAY_IN_SECS = 24 * 60 * 60;
const locks = augmint.locks;
// just using a simple counter for id-ing locks:
let counter = 0;

function lockACD(actorId, acdAmount) {
    if (acdAmount > augmint.maxLockableAmount || acdAmount < augmint.params.minimumLockAmount) {
        console.warn(
            `actor (id: ${actorId} tried to lock ${acdAmount} but the max: ${augmint.maxLockableAmount}. and min: ${
                augmint.params.minimumLockAmount
            }. Augmint rejected lock.`
        );
        return false;
    }
    const interestPt = (1 + augmint.params.lockedAcdInterestPercentage) ** (augmint.params.lockTimeInDays / 365) - 1;
    const interestInAcd = acdAmount * interestPt;

    if (augmint.actors[actorId].balances.acd < acdAmount) {
        console.warn(
            `actor (id: ${actorId} tried to lock ${acdAmount} but actor's balance is ${
                augmint.actors[actorId].balances.acd
            }. Augmint rejected lock.`
        );
        return false;
    }

    if (augmint.balances.interestEarnedPool < interestInAcd) {
        console.warn(
            `actor (id: ${actorId} tried to lock ${acdAmount} but interestEarnedPool balance is ${
                augmint.balances.interestEarnedPool
            } and lock's interest would be ${interestInAcd}. Augmint rejected lock.`
        );
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

    return true;
}

function releaseACD(actorId, lockId) {
    if (!locks[actorId] || !locks[actorId][lockId]) {
        console.warn(
            `Release lock failed, tried to release a non existent lock. actorId: ${actorId} lockId: ${lockId}`
        );
        return false;
    }

    const lock = locks[actorId][lockId];
    const currentTime = clock.getTime();
    if (lock.lockedUntil > currentTime) {
        console.warn(
            `Release lock failed, tried to release a lock which is not available yet.
             loan.repayBy: ${lock.lockedUntil} currentTime: ${currentTime} ${actorId} lockId: ${lockId}`
        );
        return false;
    }

    // move acd lock -> user
    augmint.balances.lockedAcdPool -= lock.acdValue;
    augmint.actors[actorId].balances.acd += lock.acdValue;

    // FIXME: uncomment these once changed to BigNumber
    // // sanity check:
    // if (augmint.balances.lockedAcdPool < 0) {
    //     throw new AugmintError('lockedAcdPool has gone negative: ', augmint.balances.lockedAcdPool);
    // }

    // remove lock:
    delete locks[actorId][lockId];
    return true;
}

// allows actors to query their locks:
function getLocksForActor(actorId) {
    return locks[actorId];
}

module.exports = {
    lockACD,
    releaseACD,
    getLocksForActor
};
