// just a directory of actors to allow them to be referenced by name

'use strict';

module.exports = {
    RandomLocker: require('./random.locker.js'),
    RandomBorrower: require('./random.borrower.js'),
    ExchangeTester: require('./exchange.tester.js')
};
