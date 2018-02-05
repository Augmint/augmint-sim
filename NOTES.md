### questions/thoughts:

* are we going to allow wiggle room for loan repayment deadline? (this is more of a UI issue. i.e. '3 month' = 3 month and a few days)
* man, the eth/acd price (set by the eth/usd price) really has to be rock solid
* do we really need to keep all these different earning pools separate?
* default fee always has to be larger than the loan premium fee?

### TODO

* Use AugmintError in all the right places
* Have state history (only updating after a simulation loop has run without error)
* better tracking/indexing of loans/locks (would prefer to avoid using delete for performance, but probably too soon to worry about it)
* module for generating normally distributed numbers? - will be useful for distributing funds to actors
* helpers for init of augmint and actors, and displaying/formatting state
* ability to step through history as well as start/stop/rewind etc. (probably hold all state in augmint.js then)
* use BigInt and start using Wei etc. properly to avoid floating point math
* move all state to augmint.js (loans etc.)
* actor directory
