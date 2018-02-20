// a class which encapulates an actor's behaviour, and an interface with which to interact with augmint etc.

"use strict";

const augmint = require("../augmint/augmint.js");
const loanManager = require("../augmint/loan.manager.js");
const logger = require("../lib/logger.js");
const freezer = require("../augmint/freezer.js");
const exchange = require("../augmint/exchange.js");
const defaultParams = {
    ETH_BALANCE_GROWTH_PA: 0 /* ETH balance  grows daily by pa. % to simulate growth */,
    USD_BALANCE_GROWTH_PA: 0 /* USD balance grows daily by pa. % to simulate growth */
};

class Actor {
    constructor(id, balances = {}, state = null, _params) {
        this.id = id;
        augmint.actors[this.id] = {
            balances: {
                eth: balances.eth || 0,
                acd: balances.acd || 0,
                usd: balances.usd || 0
            },
            state: state || {},
            type: this.constructor.name,
            params: Object.assign({}, defaultParams, _params)
        };
    }

    // BEHAVIOUR
    executeMoves(state) {
        // to be implemented by child classes

        /* Call super.executeMoves(state) in child for these: */
        /* Add balance growth */
        if (state.meta.iteration % state.params.stepsPerDay === 0) {
            this.ethBalance *= (1 + this.params.ETH_BALANCE_GROWTH_PA) ** (1 / 365);
            this.usdBalance *= (1 + this.params.USD_BALANCE_GROWTH_PA) ** (1 / 365);
        }
    }

    // STATE:
    // NB: I'm storing all state in augmint/loan manager/etc for the sake of making pausing/replaying etc. easier
    get acdBalance() {
        return augmint.actors[this.id].balances.acd || 0;
    }

    get ethBalance() {
        return augmint.actors[this.id].balances.eth || 0;
    }

    set ethBalance(newBal) {
        augmint.actors[this.id].balances.eth = newBal;
    }

    get usdBalance() {
        return augmint.actors[this.id].balances.usd || 0;
    }

    set usdBalance(newBal) {
        augmint.actors[this.id].balances.usd = newBal;
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

    get ownAcdOrdersSum() {
        return augmint.exchange.getActorBuyAcdOrdersSum(this.id);
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

    convertAcdToEth(acdAmount) {
        return exchange.convertAcdToEth(acdAmount);
    }

    convertEthToAcd(ethAmount) {
        return exchange.convertEthToAcd(ethAmount);
    }

    convertEthToUsd(ethAmount) {
        return exchange.convertEthToUsd(ethAmount);
    }

    convertUsdToEth(usdAmount) {
        return exchange.convertUsdToEth(usdAmount);
    }

    convertUsdToAcd(usdAmount) {
        return exchange.convertUsdToAcd(usdAmount);
    }

    // MOVE SET:
    buyACD(acdAmount) {
        let ret = exchange.buyACD(this.id, acdAmount);
        logger.logMove(this.id, "buyAcd order", { acdAmount: acdAmount });
        return ret;
    }

    sellACD(acdAmount) {
        let ret = exchange.sellACD(this.id, acdAmount);
        logger.logMove(this.id, "sellAcd order", { acdAmount: acdAmount });
        return ret;
    }

    issueAcd(acdAmount) {
        // only reserve actors should call it
        const ret = augmint.issueAcd(acdAmount);
        logger.logMove(this.id, "Reserve Issued ACD", { acdAmount: acdAmount, newReserveBalance: ret });
        return ret;
    }

    burnAcd(acdAmount) {
        // only reserve actors should call it
        const ret = augmint.burnAcd(acdAmount);
        logger.logMove(this.id, "Reserve Burned ACD", { acdAmount: acdAmount, newReserveBalance: ret });
        return ret;
    }

    buyEthWithUsd(usdAmount) {
        let ret = exchange.buyEthWithUsd(this.id, usdAmount);
        logger.logMove(this.id, "buyEth order", { usdAmount: usdAmount });
        return ret;
    }

    sellEthForUsd(usdAmount) {
        let ret = exchange.sellEthForUsd(this.id, usdAmount);
        logger.logMove(this.id, "sellEth order", { usdAmount: usdAmount });
        return ret;
    }

    lockACD(acdAmount) {
        let ret = freezer.lockACD(this.id, acdAmount);
        logger.logMove(this.id, "lockACD", { acdAmount: acdAmount });
        return ret;
    }

    releaseACD(lockId) {
        let ret = freezer.releaseACD(this.id, lockId);
        logger.logMove(this.id, "releaseACD", { lockId: lockId });
        return ret;
    }

    takeLoan(loanProductId, loanAmountInAcd) {
        let ret = loanManager.takeLoan(this.id, loanProductId, loanAmountInAcd);
        logger.logMove(this.id, "takeLoan", {
            loanProductId: loanProductId,
            loanAmountInAcd: loanAmountInAcd
        });
        return ret;
    }

    repayLoan(loanId) {
        let ret = loanManager.repayLoan(this.id, loanId);
        logger.logMove(this.id, "repayLoan", { loanId: loanId });
        return ret;
    }

    convertReserveEthToAcd(acdAmount) {
        logger.logMove(this.id, "convertReserveEthToAcd", { acdAmount: acdAmount, acdBalance: this.acdBalance });
        return exchange.convertReserveEthToAcd(acdAmount);
    }
}

module.exports = Actor;
