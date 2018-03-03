"use strict";
const bigNums = require("../lib/bigNums.js");
const Acd = bigNums.BigAcd;
const Pt = bigNums.BigPt;

const Actor = require("./actor.js");
const defaultParams = {};

class ReserveBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
    }

    executeMoves(state) {
        // TODO: add some delay in intervention (ie intervene only after a couple of ticks)
        const acdDemand = this.getAcdDemand();

        if (acdDemand.eq(0) && this.acdBalance.gt(0)) {
            this.burnAcd(this.acdBalance);
        } else if (acdDemand.lt(0) && this.ethBalance.gt(0)) {
            const maxBuyableAcdFromReserveEth = this.convertEthToAcd(this.ethBalance)
                .mul(Pt(1).sub(state.augmint.params.exchangeFeePercentage))
                .round(bigNums.ACD_DP, 0);

            const buyAmount = Acd(Math.min(maxBuyableAcdFromReserveEth, -acdDemand));

            if (buyAmount.gt(0)) {
                this.buyACD(buyAmount);
            }
        } else if (acdDemand.gt(0)) {
            const newIssueNeeded = Acd(Math.max(acdDemand, 0));

            if (newIssueNeeded.gt(0)) {
                this.issueAcd(newIssueNeeded);
            }

            this.sellACD(acdDemand);
        }
    }
}

module.exports = ReserveBasic;
