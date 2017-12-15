'use strict';

const Actor = require('./actor.js');
const ONE_DAY_IN_SECS = 24 * 60 * 60;
const REPAY_X_DAYS_BEFORE = 1;
const BUY_ACD_X_DAYS_BEFORE_REPAY = 1;
const REPAYMENT_COST_ACD = 5;
const MAX_LOAN_AMOUNT_ACD = 1000;
// TODO: add loan forgotten chance param ( 0.1%?)

class AlwaysBorrower extends Actor {
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {
        if (this.loans.length === 0) {
            let loanAmount = Math.min(this.convertEthToAcd(this.ethBalance), MAX_LOAN_AMOUNT_ACD);
            if (this.takeLoan(0, loanAmount)) {
                console.debug('AlwaysBorrower new loan: ', loanAmount, ' ACD');
                this.sellACD(loanAmount); // TODO: how to simulate keeping some ACD and selling at random moment?
            }
        }

        // TODO: move this to loanManager? Unlikely that anyone would repay a loan if value below repayment
        const collateralValueAcd = this.loans[0] && this.convertEthToAcd(this.loans[0].collateralInEth);
        const repaymentDue = this.loans[0].repaymentDue;
        if (
            this.loans[0] &&
            now >= this.loans[0].repayBy - (BUY_ACD_X_DAYS_BEFORE_REPAY + REPAY_X_DAYS_BEFORE) * ONE_DAY_IN_SECS &&
            repaymentDue < collateralValueAcd + REPAYMENT_COST_ACD
        ) {
            // buys ACD for repayment
            const buyAmount = Math.max(0, repaymentDue - this.acdBalance);
            this.buyACD(buyAmount);
        }

        if (this.loans[0] && now >= this.loans[0].repayBy - REPAY_X_DAYS_BEFORE * ONE_DAY_IN_SECS) {
            if (this.loans[0].repaymentDue < collateralValueAcd + REPAYMENT_COST_ACD) {
                // repays ACD:
                if (this.repayLoan(this.loans[0].id)) {
                    console.debug('Always borrower repaid ', repaymentDue, ' ACD');
                } else {
                    throw new Error(
                        'Always borrower couldn\'t repay.\n' +
                            'repaymentDue: ' +
                            repaymentDue +
                            '\nACD borrower balance: ' +
                            this.acdBalance
                    );
                }
            } else {
                console.debug(
                    'AlwaysBorrower did not repay, collateral value (',
                    collateralValueAcd,
                    ' ACD) is below repaymentDue + repaymentCost of',
                    this.loans[0].repaymentDue + REPAYMENT_COST_ACD,
                    ' ACD'
                );
            }
        }
    }
}

module.exports = AlwaysBorrower;
