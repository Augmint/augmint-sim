// just a directory of actors to allow them to be referenced by name

'use strict';

module.exports = {
    Reserve: require('./reserve.js'),
    RandomLocker: require('./random.locker.js'),
    RandomBorrower: require('./random.borrower.js'),
    ExchangeTester: require('./exchange.tester.js'),
    AlwaysLocker: require('./always.locker.js'),
    AlwaysBorrower: require('./always.borrower.js')
};
