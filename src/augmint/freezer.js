// allows freezing/unfreezing of funds

"use strict";

const bigNums = require("../lib/bigNums.js");
const Pt = bigNums.BigPt;
const PT1 = bigNums.PT1;

const AugmintError = require("../augmint/augmint.error.js");
const augmint = require("./augmint.js");
const clock = require("../lib/clock.js");

const ONE_DAY_IN_SECS = 24 * 60 * 60;
//const locks = augmint.locks;
// just using a simple counter for id-ing locks:
let counter = 0;

function lockACD(actorId, acdAmount) {
    if (acdAmount.gt(augmint.maxLockableAmount) || acdAmount.lt(augmint.params.minimumLockAmount)) {
        console.warn(
            `actor (id: ${actorId} tried to lock ${acdAmount} but the max: ${augmint.maxLockableAmount}. and min: ${
                augmint.params.minimumLockAmount
            }. Augmint rejected lock.`
        );
        return false;
    }

    if (augmint.actors[actorId].balances.acd.lt(acdAmount)) {
        console.warn(
            `actor (id: ${actorId} tried to lock ${acdAmount} but actor's balance is ${
                augmint.actors[actorId].balances.acd
            }. Augmint rejected lock.`
        );
        return false;
    }

    const interestPt = Pt(
        augmint.params.lockedAcdInterestPercentage.add(PT1) ** (augmint.params.lockTimeInDays / 365) - 1
    );
    const interestInAcd = acdAmount.mul(interestPt).round(bigNums.ACD_DP, 0); // ROUND_DOWN

    if (augmint.balances.interestEarnedPool.lt(interestInAcd)) {
        console.warn(
            `actor (id: ${actorId} tried to lock ${acdAmount} but interestEarnedPool balance is ${
                augmint.balances.interestEarnedPool
            } and lock's interest would be ${interestInAcd}. Augmint rejected lock.`
        );
        return false;
    }

    // move acd user -> lock
    augmint.balances.interestEarnedPool = augmint.balances.interestEarnedPool.sub(interestInAcd);
    augmint.actors[actorId].balances.acd = augmint.actors[actorId].balances.acd.sub(acdAmount);
    augmint.balances.lockedAcdPool = augmint.balances.lockedAcdPool.add(acdAmount);

    const lockId = counter;
    counter++;

    // create lock
    augmint.locks[actorId] = augmint.locks[actorId] || {};
    augmint.locks[actorId][lockId] = {
        id: lockId,
        lockedAmount: acdAmount,
        acdValue: interestInAcd.add(acdAmount),
        lockedUntil: clock.getTime() + augmint.params.lockTimeInDays * ONE_DAY_IN_SECS
    };

    return true;
}

function releaseACD(actorId, lockId) {
    if (!augmint.locks[actorId] || !augmint.locks[actorId][lockId]) {
        console.warn(
            `Release lock failed, tried to release a non existent lock. actorId: ${actorId} lockId: ${lockId}`
        );
        return false;
    }

    const lock = augmint.locks[actorId][lockId];
    const currentTime = clock.getTime();
    if (lock.lockedUntil > currentTime) {
        console.warn(
            `Release lock failed, tried to release a lock which is not available yet.
             loan.repayBy: ${lock.lockedUntil} currentTime: ${currentTime} ${actorId} lockId: ${lockId}`
        );
        return false;
    }

    // move acd lock -> user
    augmint.balances.lockedAcdPool = augmint.balances.lockedAcdPool.sub(lock.lockedAmount);
    augmint.actors[actorId].balances.acd = augmint.actors[actorId].balances.acd.add(lock.acdValue);

    // sanity check:
    if (augmint.balances.lockedAcdPool.lt(0)) {
        throw new AugmintError("lockedAcdPool has gone negative: ", augmint.balances.lockedAcdPool);
    }

    // remove lock:
    delete augmint.locks[actorId][lockId];
    return true;
}

// allows actors to query their locks:
function getLocksForActor(actorId) {
    return augmint.locks[actorId];
}

module.exports = {
    lockACD,
    releaseACD,
    getLocksForActor
};
