"use strict";
const { FixedDecimal } = require("../lib/fixedDecimal.js");

const ACD_DP = 2;
const ETH_DP = 8;
const PT_DP = 6;

function FixedAcd(n) {
    return new FixedDecimal(n, ACD_DP);
}
function FixedEth(n) {
    return new FixedDecimal(n, ETH_DP);
}
function FixedPt(n) {
    return new FixedDecimal(n, PT_DP);
}

// Big value constants, for performance - see: https://jsperf.com/big TODO: do we still need this?
const ACD0 = new FixedAcd(0);
const ETH0 = new FixedEth(0);
const PT0 = new FixedPt(0);
const PT1 = new FixedPt(1);

module.exports = {
    Acd: n => FixedAcd(n),
    Eth: n => FixedEth(n),
    Pt: n => FixedPt(n),
    get ACD_DP() {
        return ACD_DP;
    },
    get ETH_DP() {
        return ETH_DP;
    },
    get PT_DP() {
        return PT_DP;
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
