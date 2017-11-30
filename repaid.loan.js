
'use strict';

const ONE_DAY_IN_SECS = 24 * 60 * 60;

const augmint = require('./augmint/augmint.js');
const loanManager = require('./augmint/loan.manager.js');
const exchange = require('./augmint/exchange.js');
const freezer = require('./augmint/freezer.js');
const clock = require('./lib/clock.js');

// init augmint state/set initial conditions
Object.assign(augmint.balances, {
    acdReserve: 1150,
    interestEarnedPool: 1000
});
Object.assign(augmint.params, {
    acdPriceInEth: 1,
    exchangeFeePercentage: 0,
    lockedAcdInterestPercentage: 0.1,
    lockTime: ONE_DAY_IN_SECS * 10 // 10 days
});
augmint.totalAcd = 2150;

loanManager.createLoanProduct(0, 0.5, 0.15, ONE_DAY_IN_SECS * 5, 0.05);

// init actors
augmint.actorBalances['borrower'] = { acd: 0, eth: 2150 };
augmint.actorBalances['locker'] = { acd: 0, eth: 1000 };

// START:

// locker buys and then locks 1000 ACD
exchange.buyACD('locker', 1000);
freezer.lockAcd('locker', 1000);

// borrower gets 1000 ACD loan and sells it
loanManager.takeLoan('borrower', 0, 1000);  // HACK: right now i know the loan product i want has id 0
exchange.sellACD('borrower', 1000);

clock.incrementBy(ONE_DAY_IN_SECS);

// borrower buys 1150 ACD and repays loan
exchange.buyACD('borrower', 1150);
loanManager.repayLoan('borrower', 1);  // HACK: again, i know the id here

clock.incrementBy(ONE_DAY_IN_SECS * 10);

// unlock funds and sell:
freezer.releaseAcd('locker', 0);  // HACK: again, known id
exchange.sellACD('locker', 1100);

console.log(JSON.stringify(augmint, null, '  '));
