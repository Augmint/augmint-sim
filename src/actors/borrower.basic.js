'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const defaultParams = {
    REPAY_X_DAYS_BEFORE: 1,
    BUY_ACD_X_DAYS_BEFORE_REPAY: 1,
    REPAYMENT_COST_ACD: 5, // TODO: this should be global
    MAX_LOAN_AMOUNT_ACD: 1000,
    CHANCE_TO_TAKE_LOAN: 1, // % chance to take loan on a day (when there is no open loan)
    CHANCE_TO_SELL_ALL_ACD: 1 // % chance to sell all acd on a day (unless repayment is due soon)
    // TODO: add loan forgotten chance param ( 0.1%?)
};

class BorrowerBasic extends Actor {
    constructor(id, balances, state, _params = {}) {
        super(id, balances, state, Object.assign({}, defaultParams, _params));
    }

    executeMoves(state) {
        const { currentTime, stepsPerDay } = state.meta;
        const repaymentDue = this.loans[0] ? this.loans[0].repaymentDue + this.params.REPAYMENT_COST_ACD : 0;
        // TODO: move this to loanManager? Unlikely that anyone would repay a loan if value below repayment
        const collateralValueAcd = this.loans[0]
            ? this.loans[0] && this.convertEthToAcd(this.loans[0].collateralInEth)
            : 0;
        const willRepaySoon =
            this.loans[0] &&
            currentTime >=
                this.loans[0].repayBy -
                    (this.params.BUY_ACD_X_DAYS_BEFORE_REPAY + this.params.REPAY_X_DAYS_BEFORE) * ONE_DAY_IN_SECS &&
            repaymentDue < collateralValueAcd;

        /* Get new loan if there is no loan */
        if (this.loans.length === 0 && Math.random() < this.params.CHANCE_TO_TAKE_LOAN / stepsPerDay) {
            let loanAmount = Math.min(this.convertEthToAcd(this.ethBalance), this.params.MAX_LOAN_AMOUNT_ACD);
            this.takeLoan(0, loanAmount);
        }

        /* Sell all ACD (CHANCE_TO_SELL_ALL_ACD) unless repayment is due soon */
        if (this.acdBalance && !willRepaySoon && Math.random() < this.params.CHANCE_TO_SELL_ALL_ACD / stepsPerDay) {
            this.sellACD(this.acdBalance); // TODO: how to simulate keeping some ACD and selling at random moment?
        }

        if (this.loans.length > 0) {
            /* BUY ACD in advance for repayment */

            if (willRepaySoon && this.acdBalance < repaymentDue) {
                // buys ACD for repayment
                const buyAmount = Math.max(0, repaymentDue - this.acdBalance);
                this.buyACD(buyAmount);
            }

            /* Repay REPAY_X_DAYS_BEFORE maturity  */
            if (
                currentTime >= this.loans[0].repayBy - this.params.REPAY_X_DAYS_BEFORE * ONE_DAY_IN_SECS &&
                repaymentDue < collateralValueAcd
            ) {
                // repays ACD:
                if (!this.repayLoan(this.loans[0].id)) {
                    throw new Error(
                        'Always borrower couldn\'t repay.\n' +
                            'repaymentDue: ' +
                            repaymentDue +
                            '\nACD borrower balance: ' +
                            this.acdBalance
                    );
                }
            }
        }
    }
}

module.exports = BorrowerBasic;
