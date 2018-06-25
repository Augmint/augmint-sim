"use strict";

const ROUND_HALF_UP = 1;
const ROUND_DOWN = 0;
const ROUND_UP = 3;
const DEFAULT_ROUNDING_MODE = ROUND_HALF_UP;

class FixedDecimal {
    constructor(n, dp, rm) {
        this.dp = dp;
        this.number = this.roundTo(n, dp, rm === undefined ? DEFAULT_ROUNDING_MODE : rm);
    }

    roundTo(n, dp, rm) {
        if (dp === undefined) {
            dp = 0;
        }

        if (rm === undefined) {
            rm = DEFAULT_ROUNDING_MODE;
        }

        const multiplicator = Math.pow(10, dp);

        switch (rm) {
        case ROUND_HALF_UP:
            return Math.round(n * multiplicator) / multiplicator;

        case ROUND_DOWN:
            return Math.floor(n * multiplicator) / multiplicator;

        case ROUND_UP:
            return Math.ceil(n * multiplicator) / multiplicator;

        default:
            throw new Error("Rounding mode is not supported : " + rm);
        }
    }

    round(dp, rm) {
        return new FixedDecimal(this.number, dp, rm);
    }

    add(number) {
        return new FixedDecimal(this.number + number, this.dp);
    }

    sub(number) {
        return new FixedDecimal(this.number - number, this.dp);
    }

    mul(number) {
        return new FixedDecimal(this.number * number, this.dp);
    }

    div(number, dp, rm) {
        return new FixedDecimal(
            this.number / number,
            dp === undefined ? this.dp : dp,
            rm === undefined ? DEFAULT_ROUNDING_MODE : rm
        );
    }

    gt(number) {
        return this.number > number;
    }

    gte(number) {
        return this.number >= number;
    }

    lt(number) {
        return this.number < number;
    }

    lte(number) {
        return this.number <= number;
    }

    eq(number) {
        return this.number == number;
    }

    toString() {
        return this.number.toString();
    }

    valueOf() {
        return this.number;
    }

    toJSON() {
        return this.number.toString();
    }
}

module.exports = {
    get ROUND_HALF_UP() {
        return ROUND_HALF_UP;
    },
    get ROUND_DOWN() {
        return ROUND_DOWN;
    },
    get ROUND_UP() {
        return ROUND_DOWN;
    },
    FixedDecimal
};
