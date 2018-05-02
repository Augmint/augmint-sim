// keeps track of loans

"use strict";

const AugmintError = require("../augmint/augmint.error.js");
const augmint = require("./augmint.js");
const clock = require("../lib/clock.js");
const logger = require("../lib/logger.js");

const bigNums = require("../lib/bigNums.js");
const Eth = bigNums.FixedEth;
const PT1 = bigNums.PT1;
const Pt = bigNums.FixedPt;

const ONE_DAY_IN_SECS = 24 * 60 * 60;
//const loanProducts = augmint.loanProducts;
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
    if (loanAmountInAcd.gt(augmint.maxBorrowableAmount(loanProductId))) {
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

    if (loanAmountInAcd.lt(loanProduct.minimumLoanInAcd)) {
        console.warn(
            `takeLoan() failed. Actor (${actorId}) tried to get ${loanAmountInAcd} but the minimum borrowable amount is ${
                loanProduct.minimumLoanInAcd
            } for product id ${loanProductId}.`
        );
        return false;
    }

    const collateralInEth = augmint.exchange.convertAcdToEth(loanAmountInAcd).div(loanProduct.loanCollateralRatio); // we should use ROUND_DOWN (0) here
    const interestPt = Pt(loanProduct.interestPt.add(PT1) ** (loanProduct.repaymentPeriodInDays / 365) - 1);
    const premiumInAcd = loanAmountInAcd.mul(interestPt).round(bigNums.ACD_DP, 0); // ROUND_DOWN
    const repaymentDue = premiumInAcd.add(loanAmountInAcd);
    const repayBy = clock.getTime() + loanProduct.repaymentPeriodInDays * ONE_DAY_IN_SECS;

    if (augmint.actors[actorId].balances.eth.lt(collateralInEth)) {
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
    augmint.actors[actorId].balances.eth = augmint.actors[actorId].balances.eth.sub(collateralInEth);
    augmint.balances.collateralHeld = augmint.balances.collateralHeld.add(collateralInEth);

    // MINT acd -> user/interest pool
    augmint.actors[actorId].balances.acd = augmint.actors[actorId].balances.acd.add(loanAmountInAcd);

    augmint.balances.openLoansAcd = augmint.balances.openLoansAcd.add(loanAmountInAcd);
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
        repaymentDueWithCost: repaymentDue.add(augmint.params.loanRepaymentCost),
        defaultFeePercentage: loanProduct.defaultFeePercentage
    };

    return loanId;
}

function repayLoan(actorId, loanId) {
    if (!loans[actorId] || !loans[actorId][loanId]) {
        throw new AugmintError("repayLoan() error. Invalid actorId (" + actorId + ") or loanId(" + loanId + ")");
    }

    const loan = loans[actorId][loanId];

    if (augmint.actors[actorId].balances.acd.lt(loan.repaymentDue)) {
        console.warn(
            `actor (id: ${actorId} tried to repay ${loan.repaymentDue} but actor's balance is ${
                augmint.actors[actorId].balances.acd
            } loanId: ${loanId}. Augmint rejected repay.`
        );
        return false;
    }

    const collateralValueInAcd = augmint.exchange.convertEthToAcd(loan.collateralInEth);
    if (loan.repaymentDue.gt(collateralValueInAcd)) {
        console.warn(
            `actor (id: ${actorId} is repaying ${loan.repaymentDue} but collateral value is only ${collateralValueInAcd}
        loanId: ${loanId}. Augmint allowed repay but it's an unlikely behaviour. Check actor's code.`
        );
    }

    // burn loan amount (disbursed) acd and move interest to interestEarned
    augmint.actors[actorId].balances.acd = augmint.actors[actorId].balances.acd.sub(loan.repaymentDue);
    augmint.balances.interestEarnedPool = augmint.balances.interestEarnedPool.add(loan.premiumInAcd);

    augmint.balances.openLoansAcd = augmint.balances.openLoansAcd.sub(loan.loanAmountInAcd);

    // sanity check (NB: totalAcd is calculated on the fly by a getter)
    if (augmint.totalAcd.lt(0)) {
        throw new AugmintError("totalAcd has gone negative: ", augmint.totalAcd);
    }

    // move collateral augmint -> user
    augmint.balances.collateralHeld = augmint.balances.collateralHeld.sub(loan.collateralInEth);
    augmint.actors[actorId].balances.eth = augmint.actors[actorId].balances.eth.add(loan.collateralInEth);

    // sanity check
    if (augmint.balances.collateralHeld.lt(0)) {
        throw new AugmintError("collateralHeld has gone negative: ", augmint.balances.collateralHeld);
    }

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

    const targetDefaultFeeInEth = augmint.exchange
        .convertAcdToEth(loan.repaymentDue)
        .mul(loan.defaultFeePercentage.add(1))
        .round(bigNums.ETH_DP, 0); // ROUND_DOWN
    const actualDefaultFeeInEth = Eth(Math.min(loan.collateralInEth, targetDefaultFeeInEth)); // we should use ROUND_DOWN (0) here

    // move collateral -> augmint reserves/user
    augmint.balances.collateralHeld = augmint.balances.collateralHeld.sub(loan.collateralInEth);
    augmint.actors.reserve.balances.eth = augmint.actors.reserve.balances.eth.add(actualDefaultFeeInEth);
    augmint.actors[actorId].balances.eth = augmint.actors[actorId].balances.eth
        .add(loan.collateralInEth)
        .sub(actualDefaultFeeInEth);

    // sanity check
    if (augmint.balances.collateralHeld.lt(0)) {
        throw new AugmintError("collateralHeld has gone negative: ", augmint.balances.collateralHeld);
    }

    augmint.balances.openLoansAcd = augmint.balances.openLoansAcd.sub(loan.loanAmountInAcd);
    augmint.balances.defaultedLoansAcd = augmint.balances.defaultedLoansAcd.add(loan.repaymentDue);

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

function clearObject(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            // console.log(JSON.stringify(obj, null, 3));
            delete obj[prop];
        }
    }
}

function clearAllLoans() {
    clearObject(loans);
}

module.exports = {
    createLoanProduct,
    updateLoanProduct,
    getLoanProducts,
    takeLoan,
    repayLoan,
    collectDefaultedLoan,
    collectAllDefaultedLoans,
    getLoansForActor,
    clearAllLoans
};
