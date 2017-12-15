// the augmint exchange

'use strict';

const augmint = require('./augmint.js');
const orderBook = augmint.orderBook;

function buyACD(actorId, acdAmount) {
    if (acdAmount <= 0) {
        return false;
    }
    const totalEthAmount = acdAmount / augmint.rates.ethToAcd;

    if (augmint.actors[actorId].balances.eth < totalEthAmount) {
        return false;
    }

    // eth: buyer -> exchange
    augmint.actors[actorId].balances.eth -= totalEthAmount;
    augmint.balances.exchangeEth += totalEthAmount;

    const sellOrders = orderBook.sell;

    while (acdAmount > 0 && sellOrders[0]) {
        // since we're shifted elements out of the array, as orders
        // get fulfilled, we're always looking at the first element
        const sellOrder = sellOrders[0];
        const sellAmount = sellOrder.amount > acdAmount ? acdAmount : sellOrder.amount;
        const ethAmount = sellAmount / augmint.rates.ethToAcd;
        const feesInAcd = sellAmount * augmint.params.exchangeFeePercentage;

        // reduce remaining buy order:
        acdAmount -= sellAmount;
        // reduce existing sell order:
        sellOrder.amount -= sellAmount;

        // eth: exchange -> seller
        augmint.balances.exchangeEth -= ethAmount;
        augmint.actors[sellOrder.actorId].balances.eth += ethAmount;

        // acd: exchange -> buyer (minus fees)
        augmint.balances.exchangeAcd -= sellAmount;
        augmint.actors[actorId].balances.acd += sellAmount - feesInAcd;
        augmint.balances.acdFeesEarned += feesInAcd;

        if (!sellOrder.amount) {
            // the buy order has consumed all of this sell order so remove it:
            sellOrders.shift();
        }
    }

    // sanity check:
    if (augmint.balances.exchangeEth < 0) {
        throw new Error('exchangeEth has gone negative.');
    }

    // sanity check:
    if (augmint.balances.exchangeAcd < 0) {
        throw new Error('exchangeAcd has gone negative.');
    }

    if (acdAmount) {
        // we have acd from the buy order left over, so add to order book:
        orderBook.buy.push({
            amount: acdAmount,
            actorId: actorId
        });
    }
    return true;
}

function sellACD(actorId, acdAmount) {
    if (augmint.actors[actorId].balances.acd < acdAmount || acdAmount <= 0) {
        return false;
    }

    // acd: seller -> exchange
    augmint.actors[actorId].balances.acd -= acdAmount;
    augmint.balances.exchangeAcd += acdAmount;

    const buyOrders = orderBook.buy;

    while (acdAmount > 0 && buyOrders[0]) {
        // since we're shifted elements out of the array, as orders
        // get fulfilled, we're always looking at the first element
        const buyOrder = buyOrders[0];
        const buyAmount = buyOrder.amount > acdAmount ? acdAmount : buyOrder.amount;
        const ethAmount = buyAmount / augmint.rates.ethToAcd;
        const feesInEth = ethAmount * augmint.params.exchangeFeePercentage;

        // reduce remaining sell order:
        acdAmount -= buyAmount;
        // reduce existing buy order:
        buyOrder.amount -= buyAmount;

        // eth: exchange -> seller (minus fees)
        augmint.balances.exchangeEth -= ethAmount;
        augmint.actors[actorId].balances.eth += ethAmount - feesInEth;
        augmint.balances.ethFeesEarned += feesInEth;

        // acd: exchange -> buyer
        augmint.balances.exchangeAcd -= buyAmount;
        augmint.actors[buyOrder.actorId].balances.acd += buyAmount;

        if (!buyOrder.amount) {
            // the buy order has consumed all of this sell order so remove it:
            buyOrders.shift();
        }
    }

    // sanity check:
    if (augmint.balances.exchangeEth < 0) {
        throw new Error('exchangeEth has gone negative.');
    }

    // sanity check:
    if (augmint.balances.exchangeAcd < 0) {
        throw new Error('exchangeAcd has gone negative.');
    }

    if (acdAmount) {
        // we have acd from the sell order left over, so add to order book:
        orderBook.sell.push({
            amount: acdAmount,
            actorId: actorId
        });
    }
    return true;
}

function convertAcdToEth(acdAmount) {
    return acdAmount / augmint.rates.ethToAcd;
}

function convertEthToAcd(ethAmount) {
    return ethAmount * augmint.rates.ethToAcd;
}

module.exports = {
    buyACD,
    sellACD,
    convertAcdToEth,
    convertEthToAcd
};
