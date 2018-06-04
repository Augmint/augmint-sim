"use strict"
;(function (GLOBAL) {

let Big,
DP = 20,
RM = 1,
P = {},
UNDEFINED = void 0;

function _Big_() {

        function parse(x, n) {
            x.number = Number(parseFloat(n));
        }

        function Big(n) {
            var x = this;

            if (!(x instanceof Big)) return n === UNDEFINED ? _Big_() : new Big(n);

            if (n instanceof Big) {
                x.number = n.number;
            } else {
                parse(x, n);
            }

            x.constructor = Big;
        }
        Big.prototype = P;
        Big.DP = DP;
        Big.RM = RM;
        return Big;
    }

    function roundTo(n, digits) {
        if (digits === undefined) {
            digits = 0;
        }

        var multiplicator = Math.pow(10, digits);
        n = parseFloat((n * multiplicator).toFixed(11));
        return Math.round(n) / multiplicator;
    }

    P.round = function(dp,rm) {
        let Big = this.constructor;
        let returnValue = new Big(this);
        returnValue.number = roundTo(this.number,dp);
        return returnValue;
    };

    P.add = function(number) {
        let Big = this.constructor;
        let returnValue = new Big(this);
        returnValue.number =  this.number+number;
        return returnValue;
    };

    P.sub = function(number) {
        let Big = this.constructor;
        let returnValue = new Big(this);
        returnValue.number = this.number-number;
        return returnValue;
    };

    P.mul = function(number) {
        let Big = this.constructor;
        let returnValue = new Big(this);
        returnValue.number = this.number*number;
        return returnValue;
    };

    P.div = function(number) {
        let Big = this.constructor;
        let returnValue = new Big(this);
        returnValue.number = roundTo(this.number/number,Big.DP);
        return returnValue;
    };

    P.gt = function(number) {
        return this.number>number;
    };

    P.gte = function(number) {
        return this.number>=number;
    };

    P.lt = function(number) {
        return this.number<number;
    };

    P.lte = function(number) {
        return this.number<=number;
    };

    P.eq = function(number) {
        return this.number==number;
    };

    P.toString = function () {
        return this.number.toString();
    };

    P.valueOf = function () {
        return  Number(this.number);
    };

    P.toJSON = function () {
        return this.number.toString();
    };

    Big = _Big_();
    Big["default"] = Big.Big = Big;
    module.exports = Big;

})(this);
