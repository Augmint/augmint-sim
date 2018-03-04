"use strict";
const bigNums = require("../lib/bigNums.js");
const Acd = bigNums.BigAcd;
const PT1 = bigNums.PT1;
const ACD0 = bigNums.ACD0;
const ETH0 = bigNums.ETH0;

const Actor = require("./actor.js");
const defaultParams = {};

class ReserveBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
    }

    executeMoves(state) {
        // TODO: add some delay in intervention (ie intervene only after a couple of ticks)
        const acdDemand = this.getAcdDemand();

        if (acdDemand.eq(ACD0) && this.acdBalance.gt(ETH0)) {
            this.burnAcd(this.acdBalance);
        } else if (acdDemand.lt(ACD0) && this.ethBalance.gt(ETH0)) {
            const maxBuyableAcdFromReserveEth = this.convertEthToAcd(this.ethBalance)
                .mul(PT1.sub(state.augmint.params.exchangeFeePercentage))
                .round(bigNums.ACD_DP, 0);

            const buyAmount = Acd(Math.min(maxBuyableAcdFromReserveEth, -acdDemand));

            if (buyAmount.gt(ACD0)) {
                this.buyACD(buyAmount);
            }
        } else if (acdDemand.gt(ACD0)) {
            const newIssueNeeded = Acd(Math.max(acdDemand, 0));

            if (newIssueNeeded.gt(ACD0)) {
                this.issueAcd(newIssueNeeded);
            }

            this.sellACD(acdDemand);
        }
    }
}

module.exports = ReserveBasic;
