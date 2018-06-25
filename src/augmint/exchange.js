// the augmint exchange

"use strict";

const AugmintError = require("../augmint/augmint.error.js");
const augmint = require("./augmint.js");
const logger = require("../lib/logger.js");
const orderBook = augmint.orderBook;

const { ACD0, ACD_DP, ETH_DP, Eth } = require("../lib/augmintNums.js");
const { ROUND_DOWN, ROUND_HALF_UP } = require("../lib/fixedDecimal.js");

function convertEthToUsd(ethAmount) {
    return augmint.rates.ethToUsd.mul(ethAmount).round(ACD_DP, ROUND_HALF_UP);
}

function convertUsdToEth(usdAmount) {
    return Eth(usdAmount).div(augmint.rates.ethToUsd);
}

function convertAcdToEth(acdAmount) {
    return Eth(acdAmount).div(augmint.rates.ethToAcd);
}

function convertEthToAcd(ethAmount) {
    return augmint.rates.ethToAcd.mul(ethAmount).round(ACD_DP, ROUND_HALF_UP);
}

function convertUsdToAcd(usdAmount) {
    return usdAmount; /* TODO: make this a conversion? via ethToAcd and ethToUsd or new usdToAcd */
}

function buyACD(actorId, acdAmount) {
    if (acdAmount.lte(0)) {
        console.warn(`${actorId} tried to buy ${acdAmount} ACD`);
        return false;
    }
    const totalEthAmount = convertAcdToEth(acdAmount);

    if (augmint.actors[actorId].balances.eth.lt(totalEthAmount)) {
        console.warn(
            `buyAcd order failed. Tried to buy ${acdAmount} (=${totalEthAmount} ETH) but only has ${
                augmint.actors[actorId].balances.eth
            } ETH. actorId: ${actorId}`
        );
        return false;
    }

    // eth: buyer -> exchange
    augmint.actors[actorId].balances.eth = augmint.actors[actorId].balances.eth.sub(totalEthAmount);
    augmint.balances.exchangeEth = augmint.balances.exchangeEth.add(totalEthAmount);

    const sellOrders = orderBook.sell;

    while (acdAmount.gt(0) && sellOrders[0]) {
        // since we're shifted elements out of the array, as orders
        // get fulfilled, we're always looking at the first element
        const sellOrder = sellOrders[0];
        const sellAmount = sellOrder.amount.gt(acdAmount) ? acdAmount : sellOrder.amount;

        let ethAmount = convertAcdToEth(sellAmount);

        if (orderBook.buy.length === 0 && sellAmount.eq(acdAmount)) {
            // if it this the only buy order and it would be fully filled from the sellorder then we deal with rounding diff
            // (issue only in sim b/c we store Acd amount instead of eth amount for buy Acd order)
            const roundingDiff = ethAmount.sub(augmint.balances.exchangeEth);
            if (roundingDiff.mul(10 ** ETH_DP).gt(2)) {
                throw new Error(
                    `buyAcd orderfill eth amount rounding difference is too high: ${roundingDiff.toFixed(ETH_DP)}`
                );
            }
            ethAmount = augmint.balances.exchangeEth;
        }

        const feesInAcd = sellAmount.mul(augmint.params.exchangeFeePercentage).round(ACD_DP, ROUND_DOWN);

        // reduce remaining buy order:
        acdAmount = acdAmount.sub(sellAmount);
        // reduce existing sell order:
        sellOrder.amount = sellOrder.amount.sub(sellAmount);

        // eth: exchange -> seller
        augmint.balances.exchangeEth = augmint.balances.exchangeEth.sub(ethAmount);
        augmint.actors[sellOrder.actorId].balances.eth = augmint.actors[sellOrder.actorId].balances.eth.add(ethAmount);

        // acd: exchange -> buyer (minus fees)
        augmint.balances.exchangeAcd = augmint.balances.exchangeAcd.sub(sellAmount);
        augmint.actors[actorId].balances.acd = augmint.actors[actorId].balances.acd.add(sellAmount).sub(feesInAcd);
        augmint.balances.acdFeesEarned = augmint.balances.acdFeesEarned.add(feesInAcd);

        logger.logMove(actorId, "Order fill  buyACD", {
            seller: sellOrder.actorId,
            buyer: actorId,
            ethAmount: ethAmount,
            acdAmount: sellAmount,
            ethToAcd: augmint.rates.ethToAcd,
            sellerNewEthBal: augmint.actors[sellOrder.actorId].balances.eth,
            buyerNewAcdBal: augmint.actors[actorId].balances.acd,
            exchangeEth: augmint.balances.exchangeEth,
            exchangeAcd: augmint.balances.exchangeAcd
        });

        if (sellOrder.amount.eq(0)) {
            // the buy order has consumed all of this sell order so remove it:
            sellOrders.shift();
        }

        // sanity check:
        if (sellOrder.amount.lt(0)) {
            throw new AugmintError("sellOrder.amount has gone negative:" + sellOrder.amount.toString());
        }
    }

    // sanity check:
    if (augmint.balances.exchangeEth.lt(0)) {
        throw new Error("exchangeEth has gone negative." + augmint.balances.exchangeEth);
    }

    // sanity check:
    if (augmint.balances.exchangeAcd.lt(0)) {
        throw new AugmintError("exchangeAcd has gone negative: " + augmint.balances.exchangeAcd);
    }

    if (acdAmount.gt(0)) {
        // we have acd from the buy order left over, so add to order book:
        orderBook.buy.push({
            amount: acdAmount,
            actorId: actorId
        });

        logger.logMove(actorId, "ACD Buy order (unfilled)", {
            buyer: actorId,
            acdAmount: acdAmount,
            buyerNewAcdBal: augmint.actors[actorId].balances.acd,
            buyerNewEthBal: augmint.actors[actorId].balances.eth,
            exchangeEth: augmint.balances.exchangeEth,
            exchangeAcd: augmint.balances.exchangeAcd
        });
    }

    return true;
}

function sellACD(actorId, acdAmount) {
    if (augmint.actors[actorId].balances.acd.lt(acdAmount) || acdAmount.lt(0)) {
        console.warn(
            `sellAcd for ${actorId} failed, actor balance of ${
                augmint.actors[actorId].balances.acd
            } is less than sell amount of ${acdAmount} or sellAmount is 0`
        );
        return false;
    }

    // acd: seller -> exchange
    augmint.actors[actorId].balances.acd = augmint.actors[actorId].balances.acd.sub(acdAmount);
    augmint.balances.exchangeAcd = augmint.balances.exchangeAcd.add(acdAmount);

    const buyOrders = orderBook.buy;

    while (acdAmount.gt(0) && buyOrders[0]) {
        // since we're shifted elements out of the array, as orders
        // get fulfilled, we're always looking at the first element
        const buyOrder = buyOrders[0];
        const buyAmount = buyOrder.amount.gt(acdAmount) ? acdAmount : buyOrder.amount;

        let ethAmount = convertAcdToEth(buyAmount);

        if (buyOrders.length === 1 && buyOrder.amount.eq(buyAmount)) {
            // if it will fully fill the last buyorder then we deal with rounding diff
            // (issue only in sim b/c we store Acd amount instead of eth amount for buy Acd order)
            const roundingDiff = ethAmount.sub(augmint.balances.exchangeEth);
            if (roundingDiff.mul(10 ** ETH_DP).gt(2)) {
                throw new Error(
                    `sellACD orderfill eth amount rounding difference is too high: ${roundingDiff.toFixed(ETH_DP)}`
                );
            }
            ethAmount = augmint.balances.exchangeEth;
        }

        const feesInEth = ethAmount.mul(augmint.params.exchangeFeePercentage).round(ETH_DP, ROUND_DOWN);

        // reduce remaining sell order:
        acdAmount = acdAmount.sub(buyAmount);
        // reduce existing buy order:
        buyOrder.amount = buyOrder.amount.sub(buyAmount);

        // eth: exchange -> seller (minus fees)
        augmint.balances.exchangeEth = augmint.balances.exchangeEth.sub(ethAmount);
        augmint.actors[actorId].balances.eth = augmint.actors[actorId].balances.eth.add(ethAmount).sub(feesInEth);
        augmint.balances.ethFeesEarned = augmint.balances.ethFeesEarned.add(feesInEth);

        // acd: exchange -> buyer
        augmint.balances.exchangeAcd = augmint.balances.exchangeAcd.sub(buyAmount);
        augmint.actors[buyOrder.actorId].balances.acd = augmint.actors[buyOrder.actorId].balances.acd.add(buyAmount);

        logger.logMove(actorId, "Order fill sellACD", {
            buyer: buyOrder.actorId,
            seller: actorId,
            ethAmount: ethAmount,
            acdAmount: buyAmount,
            ethToAcd: augmint.rates.ethToAcd,
            buyerNewAcdBal: augmint.actors[buyOrder.actorId].balances.acd,
            sellerNewEthBal: augmint.actors[actorId].balances.eth,
            exchangeEth: augmint.balances.exchangeEth,
            exchangeAcd: augmint.balances.exchangeAcd
        });

        if (buyOrder.amount.eq(0)) {
            // the buy order has consumed all of this sell order so remove it:
            buyOrders.shift();
        }

        // sanity check:
        if (buyOrder.amount.lt(0)) {
            throw new AugmintError("buyOrder.amount has gone negative:" + buyOrder.amount.toString());
        }
    }

    // sanity check:
    if (augmint.balances.exchangeEth.lt(0)) {
        throw new Error("exchangeEth has gone negative:" + augmint.balances.exchangeEth);
    }

    // sanity check:
    if (augmint.balances.exchangeAcd.lt(0)) {
        throw new AugmintError("exchangeAcd has gone negative: " + augmint.balances.exchangeAcd);
    }

    if (acdAmount.gt(0)) {
        // we have acd from the sell order left over, so add to order book:
        orderBook.sell.push({
            amount: acdAmount,
            actorId: actorId
        });

        logger.logMove(actorId, "ACD Sell order (unfilled)", {
            seller: actorId,
            acdAmount: acdAmount,
            sellerNewAcdBal: augmint.actors[actorId].balances.acd,
            sellerNewEthBal: augmint.actors[actorId].balances.eth,
            exchangeEth: augmint.balances.exchangeEth,
            exchangeAcd: augmint.balances.exchangeAcd
        });
    }

    return true;
}

function convertReserveEthToAcd(acdAmount) {
    // SELL ETH from reserve and issue ACD  TODO: reconsider the accounting of this
    if (augmint.actors["reserve"].balances.eth.lt(this.convertAcdToEth(acdAmount))) {
        throw new AugmintError(
            `convertReserveEthToAcd:  reserve ETH balance of ${
                augmint.actors["reserve"].balances.eth
            } ETH is not enough to buy ${acdAmount} ACD`
        );
    }

    augmint.actors["reserve"].balances.eth = augmint.actors["reserve"].balances.eth.sub(
        this.convertAcdToEth(acdAmount)
    );
    augmint.actors["reserve"].balances.acd = augmint.actors["reserve"].balances.acd.add(acdAmount);

    return true;
}

function sellEthForUsd(actorId, ethAmount) {
    const usdAmount = convertEthToUsd(ethAmount);
    if (ethAmount.gt(augmint.actors[actorId].balances.eth)) {
        console.warn(
            "insufficient ETH balance to sell ETH " + actorId,
            " usdAmount:" + usdAmount,
            " ethAmount: " + ethAmount,
            "eth balance: " + augmint.actors[actorId].balances.eth
        );
        return false;
    }
    augmint.actors[actorId].balances.eth = augmint.actors[actorId].balances.eth.sub(ethAmount);
    augmint.actors[actorId].balances.usd = augmint.actors[actorId].balances.usd.add(usdAmount);
    return true;
}

function buyEthWithUsd(actorId, usdAmount) {
    const ethAmount = convertUsdToEth(usdAmount);
    if (usdAmount.gt(augmint.actors[actorId].balances.usd)) {
        console.warn(
            "insufficient USD balance to buy ETH " + actorId,
            " usdAmount:" + usdAmount,
            " ethAmount: " + ethAmount,
            "eth balance: ",
            augmint.actors[actorId].balances.eth
        );
        return false;
    }
    augmint.actors[actorId].balances.eth = augmint.actors[actorId].balances.eth.add(ethAmount);
    augmint.actors[actorId].balances.usd = augmint.actors[actorId].balances.usd.sub(usdAmount);

    return true;
}

function getActorSellAcdOrdersSum(actorId) {
    return orderBook.sell.reduce((sum, sellOrder) => {
        const amount = sellOrder.actorId == actorId ? sellOrder.amount : ACD0;
        return sum.add(amount);
    }, ACD0);
}

function getActorBuyAcdOrdersSum(actorId) {
    return orderBook.buy.reduce((sum, buyOrder) => {
        const amount = buyOrder.actorId == actorId ? buyOrder.amount : ACD0;
        return sum.add(amount);
    }, ACD0);
}

module.exports = {
    buyACD,
    sellACD,
    convertReserveEthToAcd,
    convertAcdToEth,
    convertEthToAcd,
    sellEthForUsd,
    buyEthWithUsd,
    convertEthToUsd,
    convertUsdToEth,
    convertUsdToAcd,
    getActorSellAcdOrdersSum,
    getActorBuyAcdOrdersSum
};
