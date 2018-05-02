"use strict";
const FixedDecimal = require("../lib/fixedDecimal.js");
const FixedAcd = FixedDecimal(); // ACD values
const FixedEth = FixedDecimal(); // ETH values
const FixedPt = FixedDecimal(); // percent values (0.12 = 12%)

FixedAcd.DP = 2;
FixedAcd.RM = 1;

FixedEth.DP = 8;
FixedEth.RM = 1;

FixedPt.DP = 6;
FixedPt.RM = 1;

// Big value constants, for performance - see: https://jsperf.com/big
const ACD0 = new FixedAcd("0");
const ETH0 = new FixedEth("0");
const PT0 = new FixedPt("0");
const PT1 = new FixedPt("1");

module.exports = {
    FixedAcd: n => new FixedAcd(n).round(FixedAcd.DP, FixedAcd.RM), // to enforce decimalplaces
    FixedEth: n => new FixedEth(n).round(FixedEth.DP, FixedEth.RM), // to enforce decimalplaces,
    FixedPt: n => new FixedPt(n).round(FixedPt.DP, FixedPt.RM), // to enforce decimalplaces
    get ACD_DP() {
        return FixedAcd.DP;
    },
    get ETH_DP() {
        return FixedEth.DP;
    },
    get PT_DP() {
        return FixedPt.DP;
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
