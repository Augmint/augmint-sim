
'use strict';

const ONE_DAY_IN_SECS = 24 * 60 * 60;

const augmint = require('./augmint/augmint.js');
const loanManager = require('./augmint/loan.manager.js');
const BorrowerExample = require('./actors/borrower.example.js');
const LockerExample = require('./actors/locker.example.js');
const simulation = require('./lib/simulation.js');

// init augmint state/set initial conditions
Object.assign(augmint.balances, {
    acdReserve: 1150,
    ethReserve: 100,
    interestEarnedPool: 1000
});
Object.assign(augmint.params, {
    acdPriceInEth: 1,
    exchangeFeePercentage: 0,
    lockedAcdInterestPercentage: 0.1,
    lockTime: ONE_DAY_IN_SECS * 10 // 10 days
});

loanManager.createLoanProduct(0, 0.5, 0.15, ONE_DAY_IN_SECS * 5, 0.05);

// init actors
const actors = [
    new BorrowerExample('borrower', 2150, 0, true),
    new LockerExample('locker', 1000)
];

simulation.run(actors, ONE_DAY_IN_SECS, 12);

console.log(JSON.stringify(augmint, null, '  '));
