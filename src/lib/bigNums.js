"use strict";
const Big = require("big.js");
const BigAcd = Big(); // ACD values
const BigEth = Big(); // ETH values
const BigPt = Big(); // percent values (0.12 = 12%)

BigAcd.DP = 2;
BigAcd.RM = 1;

BigEth.DP = 8;
BigEth.RM = 1;

BigPt.DP = 6;
BigPt.RM = 1;

module.exports = {
    BigAcd: n => new BigAcd(n).div(1), // to enforce decimalplaces
    BigEth: n => BigEth(n).div(1), // to enforce decimalplaces,
    BigPt: n => BigPt(n).div(1), // to enforce decimalplaces
    get ACD_DP() {
        return BigAcd.DP;
    },
    get ETH_DP() {
        return BigEth.DP;
    },
    get PT_DP() {
        return BigPt.DP;
    }
};
