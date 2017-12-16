// just a directory of actors to allow them to be referenced by name

'use strict';

module.exports = {
    ReserveBasic: require('./reserve.basic.js'),
    RandomLocker: require('./random.locker.js'),
    RandomBorrower: require('./random.borrower.js'),
    ExchangeTester: require('./exchange.tester.js'),
    LockerBasic: require('./locker.basic.js'),
    BorrowerBasic: require('./borrower.basic.js')
};
