
// the augmint exchange

'use strict';

const augmint = require('./augmint.js');

function buyACD(actorId, acdAmount) {

    const ethAmount = Math.floor(acdAmount * augmint.params.acdPriceInEth);
    const feesInAcd = Math.floor(acdAmount * augmint.params.exchangeFeePercentage);

    if (augmint.actorBalances[actorId].eth < ethAmount) {
        return false;
    }

    if (augmint.balances.acdReserve < acdAmount) {
        return false;
    }

    // actor eth -> reserves
    augmint.actorBalances[actorId].eth -= ethAmount;
    augmint.balances.ethReserve += ethAmount;

    // reserve acd -> actor
    // fees -> augmint fees earned
    augmint.balances.acdReserve -= acdAmount;
    augmint.actorBalances[actorId].acd += (acdAmount - feesInAcd);
    augmint.balances.acdFeesEarned += feesInAcd;

}

function sellACD(actorId, acdAmount) {

    const ethAmount = Math.floor(acdAmount * augmint.params.acdPriceInEth);
    const feesInEth = Math.floor(ethAmount * augmint.params.exchangeFeePercentage);

    if (augmint.actorBalances[actorId].acd < acdAmount) {
        return false;
    }

    if (augmint.balances.ethReserve < ethAmount) {
        return false;
    }

    // actor acd -> reserves
    augmint.actorBalances[actorId].acd -= acdAmount;
    augmint.balances.acdReserve += acdAmount;

    // reserve eth -> actor
    // fees -> augmint fees earned
    augmint.balances.ethReserve -= ethAmount;
    augmint.actorBalances[actorId].eth += (ethAmount - feesInEth);
    augmint.balances.ethFeesEarned += feesInEth;

}

module.exports = {
    buyACD,
    sellACD
};
