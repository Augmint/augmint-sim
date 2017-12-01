
'use strict';

const augmint = require('../augmint/augmint.js');
const loanManager = require('../augmint/loan.manager.js');
const freezer = require('../augmint/freezer.js');
const exchange = require('../augmint/exchange.js');

class Actor {
    
    constructor(id, eth = 0, acd = 0) {
        this.id = id;
        augmint.actorBalances[this.id] = { eth, acd };
        augmint.actorState[this.id] = {};
    }

    // STATE:
    // NB: I'm storing all state in augmint/loan manager/etc for the sake of making pausing/replaying etc. easier
    get acdBalance() {
        return augmint.actorBalances[this.id].acd || 0;
    }

    get ethBalance() {
        return augmint.actorBalances[this.id].eth || 0;
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
        return augmint.actorState[this.id][key];
    }

    setKey(key, value) {
        augmint.actorState[this.id][key] = value;
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
        return exchange.buyACD(this.id, acdAmount)
    }

    sellACD(acdAmount) {
        return exchange.sellACD(this.id, acdAmount)
    }

    lockACD(acdAmount) {
        return freezer.lockACD(this.id, acdAmount);
    }

    releaseACD(lockId) {
        return freezer.releaseACD(this.id, lockId);
    }

    takeLoan(loanProductId, loanAmountInAcd) {
        return loanManager.takeLoan(this.id, loanProductId, loanAmountInAcd);
    }

    repayLoan(loanId) {
        return loanManager.repayLoan(this.id, loanId);
    }

}

module.exports = Actor;
