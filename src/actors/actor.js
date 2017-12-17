// a class which encapulates an actor's behaviour, and an interface with which to interact with augmint etc.

'use strict';

const augmint = require('../augmint/augmint.js');
const loanManager = require('../augmint/loan.manager.js');
const logger = require('../lib/logger.js');
const freezer = require('../augmint/freezer.js');
const exchange = require('../augmint/exchange.js');
const defaultParams = {};

class Actor {
    constructor(id, balances = {}, state = null, _params) {
        this.id = id;
        augmint.actors[this.id] = {
            balances: {
                eth: balances.eth || 0,
                acd: balances.acd || 0
            },
            state: state || {},
            type: this.constructor.name,
            params: Object.assign({}, defaultParams, _params)
        };
    }

    // BEHAVIOUR
    executeMoves(state) {
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
        if (!loansHashMap) {
            return [];
        }
        return Object.keys(loansHashMap).map(lockId => {
            return loansHashMap[lockId];
        });
    }

    get locks() {
        const locksHashMap = freezer.getLocksForActor(this.id);
        if (!locksHashMap) {
            return [];
        }
        return Object.keys(locksHashMap).map(lockId => {
            return locksHashMap[lockId];
        });
    }

    get params() {
        return augmint.actors[this.id].params;
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

    getAugmintBalance(name) {
        return augmint.balances[name];
    }

    getAcdDemand() {
        return augmint.netAcdDemand;
    }

    getLoanProducts() {
        return loanManager.getLoanProducts();
    }

    getMaxLockableAcd() {
        return freezer.getMaxLockableAcd();
    }

    convertAcdToEth(acdAmount) {
        return exchange.convertAcdToEth(acdAmount);
    }

    convertEthToAcd(ethAmount) {
        return exchange.convertEthToAcd(ethAmount);
    }

    // MOVE SET:
    buyACD(acdAmount) {
        let ret = exchange.buyACD(this.id, acdAmount);
        logger.logMove(augmint, this.id, 'buyAcd order', { acdAmount: acdAmount });
        return ret;
    }

    sellACD(acdAmount) {
        let ret = exchange.sellACD(this.id, acdAmount);
        logger.logMove(augmint, this.id, 'sellAcd order', { acdAmount: acdAmount });
        return ret;
    }

    lockACD(acdAmount) {
        let ret = freezer.lockACD(this.id, acdAmount);
        logger.logMove(augmint, this.id, 'lockACD', { acdAmount: acdAmount });
        return ret;
    }

    releaseACD(lockId) {
        let ret = freezer.releaseACD(this.id, lockId);
        logger.logMove(augmint, this.id, 'releaseACD', { lockId: lockId });
        return ret;
    }

    takeLoan(loanProductId, loanAmountInAcd) {
        let ret = loanManager.takeLoan(this.id, loanProductId, loanAmountInAcd);
        logger.logMove(augmint, this.id, 'takeLoan', {
            loanProductId: loanProductId,
            loanAmountInAcd: loanAmountInAcd
        });
        return ret;
    }

    repayLoan(loanId) {
        let ret = loanManager.repayLoan(this.id, loanId);
        logger.logMove(augmint, this.id, 'repayLoan', { loanId: loanId });
        return ret;
    }
}

module.exports = Actor;
