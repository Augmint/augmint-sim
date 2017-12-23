// keeps track of loans

'use strict';

const AugmintError = require('../augmint/augmint.error.js');
const augmint = require('./augmint.js');
const clock = require('../lib/clock.js');
const logger = require('../lib/logger.js');

const ONE_DAY_IN_SECS = 24 * 60 * 60;
const loanProducts = augmint.loanProducts;
const loans = augmint.loans;
// just gonna use a counter for id-ing loans:
let counter = 0;

function createLoanProduct(prod) {
    loanProducts.push({
        id: prod.id ? prod.id : loanProducts.length,
        minimumLoanInAcd: prod.minimumLoanInAcd,
        loanCollateralRatio: prod.loanCollateralRatio,
        interestPt: prod.interestPt,
        repaymentPeriodInDays: prod.repaymentPeriodInDays,
        defaultFeePercentage: prod.defaultFeePercentage
    });
}

function updateLoanProduct(prod) {
    // TODO: it works with only one loan product but we are fine with that for now
    prod.id = loanProducts.length;
    loanProducts.pop();
    createLoanProduct(prod);
}

function getLoanProducts() {
    return loanProducts;
}

function takeLoan(actorId, loanProductId, loanAmountInAcd) {
    const loanProduct = loanProducts[loanProductId];

    if (!loanProduct) {
        throw new AugmintError('takeLoan() error: Invalid loanProduct Id:' + loanProductId);
    }

    if (loanAmountInAcd < loanProduct.minimumLoanInAcd) {
        return false;
    }

    const collateralInEth = augmint.exchange.convertAcdToEth(loanAmountInAcd) / loanProduct.loanCollateralRatio;
    const interestPt = (1 + loanProduct.interestPt) ** (loanProduct.repaymentPeriodInDays / 365) - 1;
    const premiumInAcd = loanAmountInAcd * interestPt;
    const repaymentDue = premiumInAcd + loanAmountInAcd;
    const repayBy = clock.getTime() + loanProduct.repaymentPeriodInDays * ONE_DAY_IN_SECS;

    if (augmint.actors[actorId].balances.eth < collateralInEth) {
        console.error(
            'takeLoan() eth balance below collateral required ',
            actorId,
            'Balance (ETH) ' + augmint.actors[actorId].balances.eth,
            'Collateral required (ETH): ' + collateralInEth,
            'Loan wanted (ACD): ' + loanAmountInAcd,
            'ethToAcd: ' + augmint.rates.ethToAcd
        );
        return false;
    }

    // move collateral user -> augmint
    augmint.actors[actorId].balances.eth -= collateralInEth;
    augmint.balances.collateralHeld += collateralInEth;

    // MINT acd -> user/interest pool
    augmint.actors[actorId].balances.acd += loanAmountInAcd;
    augmint.balances.interestHoldingPool += premiumInAcd;

    augmint.balances.openLoansAcd += loanAmountInAcd + premiumInAcd;
    const loanId = counter;
    counter++;

    // save loan:
    loans[actorId] = loans[actorId] || {};
    loans[actorId][loanId] = {
        id: loanId,
        collateralInEth,
        repayBy,
        loanAmountInAcd,
        premiumInAcd,
        repaymentDue,
        defaultFeePercentage: loanProduct.defaultFeePercentage
    };

    return loanId;
}

function repayLoan(actorId, loanId) {
    if (!loans[actorId] || !loans[actorId][loanId]) {
        throw new AugmintError('repayLoan() error. Invalid actorId (' + actorId + ') or loanId(' + loanId + ')');
    }

    const loan = loans[actorId][loanId];

    if (augmint.actors[actorId].balances.acd < loan.repaymentDue) {
        console.error(
            'repayLoan() ACD balance of ',
            actorId,
            ' balance: ',
            augmint.actors[actorId].balances.acd,
            'is not enough to repay ',
            loan.repaymentDue
        );
        return false;
    }

    // repayment acd -> BURN acd
    augmint.actors[actorId].balances.acd -= loan.repaymentDue;
    // FIXME: uncomment these once changed to BigNumber
    // // sanity check (NB: totalAcd is calculated on the fly by a getter)
    // if (augmint.totalAcd < 0) {
    //     throw new AugmintError('totalAcd has gone negative: ', augmint.totalAcd);
    // }

    // move collateral augmint -> user
    augmint.balances.collateralHeld -= loan.collateralInEth;
    augmint.actors[actorId].balances.eth += loan.collateralInEth;
    // FIXME: uncomment these once changed to BigNumber
    // // sanity check
    // if (augmint.balances.collateralHeld < 0) {
    //     throw new AugmintError('collateralHeld has gone negative: ', augmint.balances.collateralHeld);
    // }

    // move interest from holding pool -> earned
    augmint.balances.interestHoldingPool -= loan.premiumInAcd;
    augmint.balances.interestEarnedPool += loan.premiumInAcd;

    augmint.balances.openLoansAcd -= loan.repaymentDue;

    // FIXME: uncomment these once changed to BigNumber
    // // sanity check
    // if (augmint.balances.interestHoldingPool < 0) {
    //     throw new AugmintError('interestHoldingPool has gone negative: ', augmint.balances.interestHoldingPool);
    // }

    // remove loan
    delete loans[actorId][loanId];
    return true;
}

function collectDefaultedLoan(actorId, loanId) {
    if (!loans[actorId] || !loans[actorId][loanId]) {
        return false;
    }

    const loan = loans[actorId][loanId];

    if (loan.repayBy >= clock.getTime()) {
        return false;
    }

    const targetDefaultFeeInEth =
        augmint.exchange.convertAcdToEth(loan.loanAmountInAcd) * (1 + loan.defaultFeePercentage);
    const actualDefaultFeeInEth = Math.min(loan.collateralInEth, targetDefaultFeeInEth);

    // move collateral -> augmint reserves/user
    augmint.balances.collateralHeld -= loan.collateralInEth;
    augmint.actors.reserve.balances.eth += actualDefaultFeeInEth;
    augmint.actors[actorId].balances.eth += loan.collateralInEth - actualDefaultFeeInEth;
    // FIXME: uncomment these once changed to BigNumber
    // // sanity check
    // if (augmint.balances.collateralHeld < 0) {
    //     throw new AugmintError('collateralHeld has gone negative: ', augmint.balances.collateralHeld);
    // }

    // move interest holding pool -> reserve
    augmint.balances.interestHoldingPool -= loan.premiumInAcd;
    augmint.actors.reserve.balances.acd += loan.premiumInAcd;

    augmint.balances.openLoansAcd -= loan.repaymentDue;
    augmint.balances.defaultedLoansAcd += loan.repaymentDue;
    // FIXME: uncomment these once changed to BigNumber
    // // sanity check (NB: interestHoldingPool < 0 can only come about through an error in logic, not market forces)
    // if (augmint.balances.interestHoldingPool < 0) {
    //     throw new AugmintError('interestHoldingPool has gone negative: ', augmint.balances.interestHoldingPool);
    // }

    // remove loan
    delete loans[actorId][loanId];
    logger.logMove(actorId, 'collectDefaultedLoan', { loanId: loanId, repaymentDue: loan.repaymentDue });
}

function collectAllDefaultedLoans() {
    const now = clock.getTime();

    Object.keys(loans).forEach(actorId => {
        Object.keys(loans[actorId]).forEach(loanId => {
            const loan = loans[actorId][loanId];

            if (loan && loan.repayBy < now) {
                collectDefaultedLoan(actorId, loanId);
            }
        });
    });
}

function getLoansForActor(actorId) {
    return loans[actorId];
}

module.exports = {
    createLoanProduct,
    updateLoanProduct,
    getLoanProducts,
    takeLoan,
    repayLoan,
    collectDefaultedLoan,
    collectAllDefaultedLoans,
    getLoansForActor
};
