'use strict';

const ONE_DAY_IN_SECS = 24 * 60 * 60;
// in seconds
let time = 0;

function getTime() {
    return time;
}

function getDay() {
    return Math.floor(time / ONE_DAY_IN_SECS);
}

function setTime(newTime) {
    time = newTime;
    return time;
}

function incrementBy(seconds) {
    time += seconds;
    return time;
}

module.exports = {
    ONE_DAY_IN_SECS,
    getTime,
    getDay,
    setTime,
    incrementBy
};
