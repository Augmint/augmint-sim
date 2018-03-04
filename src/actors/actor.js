// a class which encapulates an actor's behaviour, and an interface with which to interact with augmint etc.

"use strict";
const bigNums = require("../lib/bigNums.js");
const Acd = bigNums.BigAcd;
const ACD0 = bigNums.ACD0;
const ETH0 = bigNums.ETH0;
const Eth = bigNums.BigEth;
const Pt = bigNums.BigPt;

const augmint = require("../augmint/augmint.js");
const loanManager = require("../augmint/loan.manager.js");
const logger = require("../lib/logger.js");
const freezer = require("../augmint/freezer.js");
const exchange = require("../augmint/exchange.js");
const defaultParams = {
    ETH_BALANCE_GROWTH_PA: Pt(0) /* ETH balance  grows daily by pa. % to simulate growth */,
    USD_BALANCE_GROWTH_PA: Pt(0) /* USD balance grows daily by pa. % to simulate growth */
};

class Actor {
    constructor(id, balances = {}, state = null, _params) {
        this.id = id;
        augmint.actors[this.id] = {
            balances: {
                eth: balances.eth || ETH0,
                acd: balances.acd || ACD0,
                usd: balances.usd || ACD0
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
            this.ethBalance = this.ethBalance.mul(
                Pt(this.ethBalance.mul(this.params.ETH_BALANCE_GROWTH_PA.add(1)) ** (1 / 365))
            );
            this.usdBalance = this.usdBalance.mul(Pt(this.params.USD_BALANCE_GROWTH_PA.add(1) ** (1 / 365)));
        }
    }

    // STATE:
    // NB: I'm storing all state in augmint/loan manager/etc for the sake of making pausing/replaying etc. easier
    get acdBalance() {
        return augmint.actors[this.id].balances.acd || ACD0;
    }

    get ethBalance() {
        return augmint.actors[this.id].balances.eth || ETH0;
    }

    set ethBalance(newBal) {
        augmint.actors[this.id].balances.eth = Eth(newBal);
    }

    get usdBalance() {
        return augmint.actors[this.id].balances.usd || 0;
    }

    set usdBalance(newBal) {
        augmint.actors[this.id].balances.usd = Acd(newBal);
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
        const ret = exchange.buyACD(this.id, acdAmount);
        logger.logMove(this.id, "buyAcd order", { acdAmount: acdAmount.toString(), ret });
        return ret;
    }

    sellACD(acdAmount) {
        const ret = exchange.sellACD(this.id, acdAmount);
        logger.logMove(this.id, "sellAcd order", { acdAmount: acdAmount.toString(), ret });
        return ret;
    }

    issueAcd(acdAmount) {
        // only reserve actors should call it
        const ret = augmint.issueAcd(acdAmount);
        logger.logMove(this.id, "Reserve Issued ACD", {
            acdAmount: acdAmount.toString(),
            newReserveBalance: ret.toString()
        });
        return ret;
    }

    burnAcd(acdAmount) {
        // only reserve actors should call it
        const ret = augmint.burnAcd(acdAmount);
        logger.logMove(this.id, "Reserve Burned ACD", {
            acdAmount: acdAmount.toString(),
            newReserveBalance: ret.toString()
        });
        return ret;
    }

    buyEthWithUsd(usdAmount) {
        const ret = exchange.buyEthWithUsd(this.id, usdAmount);
        logger.logMove(this.id, "buyEth with USD order", { usdAmount: usdAmount.toString(), ret });
        return ret;
    }

    sellEthForUsd(ethAmount) {
        const ret = exchange.sellEthForUsd(this.id, ethAmount);
        logger.logMove(this.id, "sellEth for USD order", { ethAmount: ethAmount.toString(), ret });
        return ret;
    }

    lockACD(acdAmount) {
        const ret = freezer.lockACD(this.id, acdAmount);
        logger.logMove(this.id, "lockACD", { acdAmount: acdAmount.toString(), ret });
        return ret;
    }

    releaseACD(lockId) {
        const ret = freezer.releaseACD(this.id, lockId);
        logger.logMove(this.id, "releaseACD", { lockId, ret });
        return ret;
    }

    takeLoan(loanProductId, loanAmountInAcd) {
        const ret = loanManager.takeLoan(this.id, loanProductId, loanAmountInAcd);
        logger.logMove(this.id, "takeLoan", {
            loanProductId,
            loanAmountInAcd: loanAmountInAcd.toString(),
            ret
        });
        return ret;
    }

    repayLoan(loanId) {
        const ret = loanManager.repayLoan(this.id, loanId);
        logger.logMove(this.id, "repayLoan", { loanId, ret });
        return ret;
    }

    convertReserveEthToAcd(acdAmount) {
        const ret = exchange.convertReserveEthToAcd(acdAmount);
        logger.logMove(this.id, "convertReserveEthToAcd", {
            acdAmount: acdAmount.toString(),
            acdBalance: this.acdBalance.toString(),
            ret
        });
        return ret;
    }
}

module.exports = Actor;
