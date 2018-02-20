// just a directory of actors to allow them to be referenced by name

"use strict";

module.exports = {
    ReserveBasic: require("./reserve.basic.js"),
    BoardLoanCollateralRatio: require("./board.loanCollateralRatio.js"),
    ExchangeTester: require("./exchange.tester.js"),
    LockerBasic: require("./locker.basic.js"),
    BorrowerBasic: require("./borrower.basic.js")
};
