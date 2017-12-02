
'use strict';

// in seconds
let time = 0;

function getTime() {

    return time;

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
    getTime,
    incrementBy
};
