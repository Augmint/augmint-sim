
// keeps track of loans

'use strict';

const augmint = require('./augmint.js');
const clock = require('../lib/clock.js');

const loanProducts = {};
const loans = {};
// just gonna use a counter for id-ing loans and loanProducts:
let counter = 0;

function createLoanProduct(minimumLoanInAcd, loanCollateralRatio, premiumPercentage, repaymentPeriod, defaultFeePercentage) {

    const loanProductId = counter;
    counter++;

    loanProducts[counter] = {
        active: true,
        minimumLoanInAcd,
        loanCollateralRatio,
        premiumPercentage,
        repaymentPeriod,
        defaultFeePercentage
    };
    
    return loanProductId;

}

function removeLoanProduct(loanId) {

    if (!loanProducts[loanId]) {
        return false;
    }

    loanProducts[loanId].active = false;

}

function takeLoan(actorId, loanProductId, loanAmountInAcd) {

    const loan = loanProducts[loanProductId];

    if (!loan) {
        return false;
    }

    if (!loan.active) {
        return false;
    }

    if (loanAmountInAcd < loan.minimumLoanInAcd) {
        return false;
    }

    const collateralInEth = Math.floor(loanAmountInAcd * augmint.params.acdPriceInEth / loan.loanCollateralRatio);
    const premiumInAcd = Math.floor(loanAmountInAcd * loan.premiumPercentage);
    const repayBy = clock.getTime() + loan.repaymentPeriod;

    if (augmint.actorBalances[actorId].eth < collateralInEth) {
        return false;
    }

    // move collateral user -> augmint
    augmint.actorBalances[actorId].eth -= collateralInEth;
    augmint.balances.collateralHeld += collateralInEth;

    // MINT acd -> user/interest pool
    augmint.actorBalances[actorId].acd += loanAmountInAcd;
    augmint.balances.interestHoldingPool += premiumInAcd;
    // track state of acd created:
    augmint.totalAcd += (loanAmountInAcd + premiumInAcd);

    const loanId = counter;
    counter++;

    // save loan:
    loans[actorId] = loans[actorId] || {};
    loans[actorId][loanId] = {
        collateralInEth,
        repayBy,
        loanAmountInAcd,
        premiumInAcd,
        defaultFeePercentage: loan.defaultFeePercentage
    };

    return loanId;

}

function repayLoan(actorId, loanId) {

    if (!loans[actorId] || !loans[actorId][loanId]) {
        return false;
    }

    const loan = loans[actorId][loanId];

    if (loan.repayBy < clock.getTime()) {
        return false;
    }

    const repaymentDue = loan.loanAmountInAcd + loan.premiumInAcd;

    if (augmint.actorBalances[actorId].acd < repaymentDue) {
        return false;
    }

    // repayment acd -> BURN acd
    augmint.actorBalances[actorId].acd -= repaymentDue;
    // track state of acd burned:
    augmint.totalAcd -= repaymentDue;
    // sanity check
    if (augmint.totalAcd < 0) {
        throw new Error('totalAcd has gone negative');
    }

    // move collateral augmint -> user
    augmint.balances.collateralHeld -= loan.collateralInEth;
    augmint.actorBalances[actorId].eth += loan.collateralInEth;
    // sanity check
    if (augmint.balances.collateralHeld < 0) {
        throw new Error('collateralHeld has gone negative');
    }

    // move interest from holding pool -> earned
    augmint.balances.interestHoldingPool -= loan.premiumInAcd;
    augmint.balances.interestEarnedPool += loan.premiumInAcd;
    // sanity check
    if (augmint.balances.interestHoldingPool < 0) {
        throw new Error('interestHoldingPool has gone negative');
    }

    // remove loan
    delete loans[actorId][loanId];

}

function collectDefaultedLoan(actorId, loanId) {

    if (!loans[actorId] || !loans[actorId][loanId]) {
        return false;
    }

    const loan = loans[actorId][loanId];

    if (loan.repayBy >= clock.getTime()) {
        return false;
    }

    const targetDefaultFeeInEth = Math.floor(loan.loanAmountInAcd * augmint.params.acdPriceInEth * (1 + loan.defaultFeePercentage));
    const actualDefaultFeeInEth = Math.min(loan.collateralInEth, targetDefaultFeeInEth);

    // move collateral -> augmint reserves/user
    augmint.balances.collateralHeld -= loan.collateralInEth;
    augmint.balances.ethReserve += actualDefaultFeeInEth;
    augmint.actorBalances[actorId].eth += loan.collateralInEth - actualDefaultFeeInEth;
    // sanity check
    if (augmint.balances.collateralHeld < 0) {
        throw new Error('collateralHeld has gone negative');
    }

    // move interest holding pool -> reserve
    augmint.balances.interestHoldingPool -= loan.premiumInAcd;
    augmint.balances.acdReserve += loan.premiumInAcd;
    // sanity check (NB: interestHoldingPool < 0 can only come about through an error in logic, not market forces)
    if (augmint.balances.interestHoldingPool < 0) {
        throw new Error('interestHoldingPool has gone negative');
    }

    // remove loan
    delete loans[actorId][loanId];

}

function collectAllDefaultedLoans() {

    const now = clock.getTime();

    Object.keys(loans).forEach((actorId) => {
        Object.keys(loans[actorId]).forEach((loanId) => {

            const loan = loans[actorId][loanId];

            if (loan && loan.repayBy < now) {
                collectDefaultedLoan(actorId, loanId)
            }

        });
    });

}

function getLoansForActor(actorId) {

    return loans[actorId];

}

module.exports = {
    createLoanProduct,
    removeLoanProduct,
    takeLoan,
    repayLoan,
    collectDefaultedLoan,
    collectAllDefaultedLoans,
    getLoansForActor
};
