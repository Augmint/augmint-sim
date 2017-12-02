
'use strict';

const Actor = require('./actor.js');

class BorrowerExample extends Actor {
    
    constructor(id, balances, state) {
        super(id, balances, state);
    }

    executeMoves(now) {

        if (now > 0 && !this.getKey('loanTakenAt')) {
            // borrower gets 1000 ACD loan and sells it for eth
            this.takeLoan(this.getLoanProducts()[0].id, 1000);
            this.sellACD(this.acdBalance);
            this.setKey('loanTakenAt', now);
            return;
        }

        // repay loan later:
        if (this.getKey('loanTakenAt') && this.loans[0] && !this.getKey('shouldDefault')) {
            // borrower buys 1150 ACD and repays loan
            this.buyACD(1150);
            this.repayLoan(this.loans[0].id);
        }

    }

}

module.exports = BorrowerExample;
