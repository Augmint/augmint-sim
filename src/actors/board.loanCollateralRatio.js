"use strict";
/* loanCollateralRatio adjustment based on ETH/USD trend
 TODO: log moves and params it changes
 TODO: add params of intervention
*/
const Actor = require("./actor.js");
const loanManager = require("../augmint/loan.manager.js");
const defaultParams = {
    HIGH_COLLATERAL_RATIO: 0.3, // collateral ratio when ETH/USD trend above high trigger
    MID_COLLATERAL_RATIO: 0.6, // collateral ratio when ETH/USD trend b/w low & high triggers
    LOW_COLLATERAL_RATIO: 0.8, // collateral ratio when ETH/USD trend < low trigger
    TREND_TRIGGER_LOW: 0.003, // ETH/USD trend: least squares abs(m) value (price normalised to 0-1)
    TREND_TRIGGER_HIGH: 0.008, // ETH/USD trend: least squares abs(m) value (price normalised to 0-1)
    MIN_DAYS_BEFORE_RAISE: 3 // how many days to wait from last change before raising COLLATERAL ratio
};

class MoneteryBoardBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
        this.lastChanged = 0;
    }

    executeMoves(state) {
        const loanProduct = loanManager.getLoanProducts()[0];
        let newRatio = loanProduct.loanCollateralRatio;
        const trend = Math.abs(state.augmint.rates.ethToUsdTrend);
        if (trend >= this.params.TREND_TRIGGER_HIGH) {
            newRatio = this.params.HIGH_COLLATERAL_RATIO;
        } else if (trend <= this.params.TREND_TRIGGER_LOW) {
            newRatio = this.params.LOW_COLLATERAL_RATIO;
        } else {
            newRatio = this.params.MID_COLLATERAL_RATIO;
        }
        if (
            (newRatio > loanProduct.loanCollateralRatio &&
                this.lastChanged + this.params.MIN_DAYS_BEFORE_RAISE < state.meta.currentDay) ||
            newRatio < loanProduct.loanCollateralRatio
        ) {
            //console.log(this.lastChanged, state.meta.currentDay, loanProduct.loanCollateralRatio, newRatio);
            this.lastChanged = state.meta.currentDay;
            loanProduct.loanCollateralRatio = newRatio;
            loanManager.updateLoanProduct(loanProduct);
        }
    }
}

module.exports = MoneteryBoardBasic;
