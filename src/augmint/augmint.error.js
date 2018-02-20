"use strict";

function AugmintError(message) {
    if (!(this instanceof AugmintError)) {
        return new AugmintError(message);
    }

    // plain-english/human-readable message describing the error
    this.message = message || "";

    Error.captureStackTrace(this, AugmintError);
}

AugmintError.prototype = Object.create(Error.prototype);
AugmintError.prototype.name = "AugmintError";

module.exports = AugmintError;
