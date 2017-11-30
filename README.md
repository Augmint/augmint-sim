# augmint-sim
Simulating the augmint system

## TODO

- differentiate between moves that are simple invalid (e.g. actor doesn't have enough funds) and those due to system failures (e.g. because augmint is out of funds etc.)
- better tracking/indexing of loans/locks
- mo-dule for generating normally distributed numbers? - will be useful for distributing funds to actors
- helpers for init of augmint and actors, and displaying/formatting state
- ability to step through history as well as start/stop/rewind etc. (probably hold all state in augmint.js then)
- put all possible moves into moves.js, so there's a directory of moves?
- use BigInt and start using Wei etc. properly to avoid floating point math

## Augmint

### augmint system accounts:

- eth reserve (eth)
- acd reserve (acd)
- collateral holding (eth)
- interest holding pool (acd)
- interest earned pool (acd)
- locked funds (acd)
- acd fees earned pool (acd)
- eth fees earned pool (eth)

### augmint system parameters:

- ACD_PRICE (determined by ETH/USD rate)
- EXCHANGE_FEE (% of exchange amount)
- LOCK_INTEREST_RATE
- ACD_TRANSFER_FEE
- LOAN_PRODUCTS (hash map of LOAN_ID -> (REPAYMENT_PERIOD, COLLATERAL_RATIO, PREMIUM_RATE, DEFAULT_FEE, MIN_LOAN))

### allowed moves/transactions:

- buy (acdAmount) ACD from reserves
- sell (acdAmount) ACD to reserves
- take out loan
- repay loan
- collect defaulted loan
- lock ACD
- unlock ACD
- transfer ACD between users

### questions/thoughts:

- are we going to allow wiggle room for loan repayment deadline? (this is more of a UI issue. i.e. '3 month' = 3 month and a few days)
- man, the eth/acd price (set by the eth/usd price) really has to be rock solid
- do we really need to keep all these different earning pools separate?
