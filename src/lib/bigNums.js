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

// Big value constants, for performance - see: https://jsperf.com/big
const ACD0 = new BigAcd("0");
const ETH0 = new BigEth("0");
const PT0 = new BigPt("0");
const PT1 = new BigPt("1");

module.exports = {
    BigAcd: n => new BigAcd(n).round(BigAcd.DP, BigAcd.RM), // to enforce decimalplaces
    BigEth: n => BigEth(n).round(BigEth.DP, BigEth.RM), // to enforce decimalplaces,
    BigPt: n => BigPt(n).round(BigPt.DP, BigPt.RM), // to enforce decimalplaces
    get ACD_DP() {
        return BigAcd.DP;
    },
    get ETH_DP() {
        return BigEth.DP;
    },
    get PT_DP() {
        return BigPt.DP;
    },
    get ACD0() {
        return ACD0;
    },
    get ETH0() {
        return ETH0;
    },
    get PT0() {
        return PT0;
    },
    get PT1() {
        return PT1;
    }
};
