
// a class which encapulates an actor's behaviour, and an interface with which to interact with augmint etc.

'use strict';

const augmint = require('../augmint/augmint.js');
const loanManager = require('../augmint/loan.manager.js');
const freezer = require('../augmint/freezer.js');
const exchange = require('../augmint/exchange.js');
const logger = require('../lib/logger.js');

class Actor {

    constructor(id, balances = {}, state = null) {
        this.id = id;
        augmint.actors[this.id] = {
            balances: {
                eth: balances.eth || 0,
                acd: balances.acd || 0
            },
            state: state || {}
        };
    }

    // BEHAVIOUR
    executeMoves(now) {

        // to be implemented by child classes

    }

    // STATE:
    // NB: I'm storing all state in augmint/loan manager/etc for the sake of making pausing/replaying etc. easier
    get acdBalance() {
        return augmint.actors[this.id].balances.acd || 0;
    }

    get ethBalance() {
        return augmint.actors[this.id].balances.eth || 0;
    }

    get loans() {
        const loansHashMap = loanManager.getLoansForActor(this.id);
        if (!loansHashMap) { return []; }
        return Object.keys(loansHashMap).map((lockId) => { return loansHashMap[lockId]; });
    }

    get locks() {
        const locksHashMap = freezer.getLocksForActor(this.id);
        if (!locksHashMap) { return []; }
        return Object.keys(locksHashMap).map((lockId) => { return locksHashMap[lockId]; });
    }

    // GENERAL STATE:
    getKey(key) {
        return augmint.actors[this.id].state[key];
    }

    setKey(key, value) {
        augmint.actors[this.id].state[key] = value;
        return value;
    }

    // QUERYING SYSTEMS (e.g. augmint, secondary markets etc.)
    getAugmintParam(name) {

        return augmint.params[name];

    }

    getLoanProducts() {

        return loanManager.getLoanProducts();

    }

    // MOVE SET:
    buyACD(acdAmount) {
        logger.logMove(this.id, "buyAcd", {acdAmount: acdAmount});
        return exchange.buyACD(this.id, acdAmount);
    }

    sellACD(acdAmount) {
        logger.logMove(this.id, "sellAcd", {acdAmount: acdAmount});
        return exchange.sellACD(this.id, acdAmount);
    }

    lockACD(acdAmount) {
        logger.logMove(this.id, "lockACD", {acdAmount: acdAmount});
        return freezer.lockACD(this.id, acdAmount);
    }

    releaseACD(lockId) {
        logger.logMove(this.id, "releaseACD", {lockId: lockId});
        return freezer.releaseACD(this.id, lockId);
    }

    takeLoan(loanProductId, loanAmountInAcd) {
        logger.logMove(
            this.id,
            "takeLoan",
            {loanProductId: loanProductId, loanAmountInAcd: loanAmountInAcd}
        );
        return loanManager.takeLoan(this.id, loanProductId, loanAmountInAcd);
    }

    repayLoan(loanId) {
        logger.logMove(this.id, "repayLoan", {loanId: loanId});
        return loanManager.repayLoan(this.id, loanId);
    }

}

module.exports = Actor;
