// keeps track of loans

"use strict";

const AugmintError = require("../augmint/augmint.error.js");
const augmint = require("./augmint.js");
const clock = require("../lib/clock.js");
const logger = require("../lib/logger.js");

const ONE_DAY_IN_SECS = 24 * 60 * 60;
// const loanProducts = augmint.loanProducts;s
const loans = augmint.loans;
// just gonna use a counter for id-ing loans:
let counter = 0;

function createLoanProduct(prod) {
    augmint.loanProducts.push({
        id: prod.id ? prod.id : augmint.loanProducts.length,
        minimumLoanInAcd: prod.minimumLoanInAcd,
        loanCollateralRatio: prod.loanCollateralRatio,
        interestPt: prod.interestPt,
        repaymentPeriodInDays: prod.repaymentPeriodInDays,
        defaultFeePercentage: prod.defaultFeePercentage
    });
}

function updateLoanProduct(prod) {
    // TODO: it works with only one loan product but we are fine with that for now
    prod.id = augmint.loanProducts.length;
    augmint.loanProducts.pop();
    createLoanProduct(prod);
}

function getLoanProducts() {
    return augmint.loanProducts;
}

function takeLoan(actorId, loanProductId, loanAmountInAcd) {
    if (loanAmountInAcd > augmint.maxBorrowableAmount(loanProductId)) {
        console.warn(
            `takeLoan() failed. Actor (${actorId}) tried to get ${loanAmountInAcd} for product id ${loanProductId}
                but the max borrowable amount is ${augmint.maxBorrowableAmount(loanProductId)}.`
        );
        return false;
    }

    const loanProduct = augmint.loanProducts[loanProductId];

    if (!loanProduct) {
        throw new AugmintError("takeLoan() error: Invalid loanProduct Id:" + loanProductId);
    }

    if (loanAmountInAcd < loanProduct.minimumLoanInAcd) {
        console.warn(
            `takeLoan() failed. Actor (${actorId}) tried to get ${loanAmountInAcd} but the minimum borrowable amount is ${
                loanProduct.minimumLoanInAcd
            } for product id ${loanProductId}.`
        );
        return false;
    }

    const collateralInEth = augmint.exchange.convertAcdToEth(loanAmountInAcd) / loanProduct.loanCollateralRatio;
    const interestPt = (1 + loanProduct.interestPt) ** (loanProduct.repaymentPeriodInDays / 365) - 1;
    const premiumInAcd = loanAmountInAcd * interestPt;
    const repaymentDue = premiumInAcd + loanAmountInAcd;
    const repayBy = clock.getTime() + loanProduct.repaymentPeriodInDays * ONE_DAY_IN_SECS;

    if (augmint.actors[actorId].balances.eth < collateralInEth) {
        console.error(
            "takeLoan() eth balance below collateral required ",
            actorId,
            "Balance (ETH) " + augmint.actors[actorId].balances.eth,
            "Collateral required (ETH): " + collateralInEth,
            "Loan wanted (ACD): " + loanAmountInAcd,
            "ethToAcd: " + augmint.rates.ethToAcd
        );
        return false;
    }

    // move collateral user -> augmint
    augmint.actors[actorId].balances.eth -= collateralInEth;
    augmint.balances.collateralHeld += collateralInEth;

    // MINT acd -> user/interest pool
    augmint.actors[actorId].balances.acd += loanAmountInAcd;

    augmint.balances.openLoansAcd += loanAmountInAcd;
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
        throw new AugmintError("repayLoan() error. Invalid actorId (" + actorId + ") or loanId(" + loanId + ")");
    }

    const loan = loans[actorId][loanId];

    if (augmint.actors[actorId].balances.acd < loan.repaymentDue) {
        console.warn(
            `actor (id: ${actorId} tried to repay ${loan.repaymentDue} but actor's balance is ${
                augmint.actors[actorId].balances.acd
            } loanId: ${loanId}. Augmint rejected lock.`
        );
        return false;
    }

    // burn loan amount (disbursed) acd and move interest to interestEarned
    augmint.actors[actorId].balances.acd -= loan.repaymentDue;
    augmint.balances.interestEarnedPool += loan.premiumInAcd;

    augmint.balances.openLoansAcd -= loan.loanAmountInAcd;
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

    // remove loan
    delete loans[actorId][loanId];
    return true;
}

function collectDefaultedLoan(actorId, loanId) {
    if (!loans[actorId] || !loans[actorId][loanId]) {
        console.warn(`Collection failed, tried to collect a non existent loan. actorId: ${actorId} loanId: ${loanId}`);
        return false;
    }

    const loan = loans[actorId][loanId];
    const currentTime = clock.getTime();

    if (loan.repayBy >= currentTime) {
        console.warn(
            `Collection failed, tried to collect a loan which is not defaulted yet.
             loan.repayBy: ${loan.repayBy} currentTime: ${currentTime} ${actorId} loanId: ${loanId}`
        );
        return false;
    }

    const targetDefaultFeeInEth = augmint.exchange.convertAcdToEth(loan.repaymentDue) * (1 + loan.defaultFeePercentage);
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

    augmint.balances.openLoansAcd -= loan.loanAmountInAcd;
    augmint.balances.defaultedLoansAcd += loan.repaymentDue;

    // remove loan
    delete loans[actorId][loanId];
    logger.logMove(actorId, "collectDefaultedLoan", { loanId: loanId, repaymentDue: loan.repaymentDue });
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
