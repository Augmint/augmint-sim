// the augmint exchange

'use strict';

//const AugmintError = require('../augmint/augmint.error.js');
const augmint = require('./augmint.js');
const logger = require('../lib/logger.js');
const orderBook = augmint.orderBook;

function convertEthToUsd(ethAmount) {
    return ethAmount * augmint.rates.ethToUsd;
}

function convertUsdToEth(usdAmount) {
    return usdAmount / augmint.rates.ethToUsd;
}

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
        logger.logMove(augmint, actorId, 'Order match', {
            buyer: actorId,
            seller: sellOrder.actorId,
            ethAmount: ethAmount,
            acdAmount: sellAmount,
            ethToAcd: augmint.rates.ethToAcd
        });

        if (!sellOrder.amount) {
            // the buy order has consumed all of this sell order so remove it:
            sellOrders.shift();
        }
    }

    // FIXME: uncomment these once changed to BigNumber
    // // sanity check:
    // if (augmint.balances.exchangeEth < 0) {
    //     throw new AugmintError('exchangeEth has gone negative.' + augmint.balances.exchangeEth);
    // }
    //
    // // sanity check:
    // if (augmint.balances.exchangeAcd < 0) {
    //     throw new AugmintError('exchangeAcd has gone negative: ' + augmint.balances.exchangeAcd);
    // }

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
        logger.logMove(augmint, actorId, 'Order match', {
            buyer: buyOrder.actorId,
            seller: actorId,
            ethAmount: ethAmount,
            acdAmount: buyAmount,
            ethToAcd: augmint.rates.ethToAcd
        });

        if (!buyOrder.amount) {
            // the buy order has consumed all of this sell order so remove it:
            buyOrders.shift();
        }
    }

    // FIXME: uncomment these once changed to BigNumber
    // // sanity check:
    // if (augmint.balances.exchangeEth < 0) {
    //     throw new AugmintError('exchangeEth has gone negative:' + augmint.balances.exchangeEth);
    // }
    //
    // // sanity check:
    // if (augmint.balances.exchangeAcd < 0) {
    //     throw new AugmintError('exchangeAcd has gone negative: ' + augmint.balances.exchangeAcd);
    // }

    if (acdAmount) {
        // we have acd from the sell order left over, so add to order book:
        orderBook.sell.push({
            amount: acdAmount,
            actorId: actorId
        });
    }
    return true;
}

function sellEthForUsd(actorId, usdAmount) {
    const ethAmount = convertUsdToEth(usdAmount);
    if (ethAmount > augmint.actors[actorId].balances.eth) {
        console.error(
            'insufficient ETH balance to sell ETH ' + actorId,
            ' usdAmount:' + usdAmount,
            'eth balance: ',
            augmint.actors[actorId].balances.eth
        );
        return false;
    }
    augmint.actors[actorId].balances.eth -= ethAmount;
    augmint.actors[actorId].balances.usd += usdAmount;
    return true;
}

function buyEthWithUsd(actorId, usdAmount) {
    const ethAmount = convertUsdToEth(usdAmount);
    if (usdAmount > augmint.actors[actorId].balances.usd) {
        console.error(
            'insufficient USD balance to buy ETH ' + actorId,
            ' usdAmount:' + usdAmount,
            'eth balance: ',
            augmint.actors[actorId].balances.eth
        );
        return false;
    }
    augmint.actors[actorId].balances.eth += ethAmount;
    augmint.actors[actorId].balances.usd -= usdAmount;
    return true;
}

function convertAcdToEth(acdAmount) {
    return acdAmount / augmint.rates.ethToAcd;
}

function convertEthToAcd(ethAmount) {
    return ethAmount * augmint.rates.ethToAcd;
}

function convertUsdToAcd(usdAmount) {
    return usdAmount; /* TODO: make this a conversion? via ethToAcd and ethToUsd or new usdToAcd */
}

function getActorSellAcdOrdersSum(actorId) {
    return orderBook.sell.reduce((sum, sellOrder) => {
        let reserveAmount = sellOrder.actorId == actorId ? sellOrder.amount : 0;
        return sum + reserveAmount;
    }, 0);
}

module.exports = {
    buyACD,
    sellACD,
    convertAcdToEth,
    convertEthToAcd,
    sellEthForUsd,
    buyEthWithUsd,
    convertEthToUsd,
    convertUsdToEth,
    convertUsdToAcd,
    getActorSellAcdOrdersSum
};
