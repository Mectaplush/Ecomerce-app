'use stric';

const statusCodes = require('./statusCodes');
const reasonPhrases = require('./reasonPhrases');

class SuccessResponse {
    constructor({ message, statusCode = statusCodes.OK, reasonPhrasesCode = reasonPhrases.OK, metadata = {} }) {
        this.message = !message ? reasonPhrasesCode : message;
        this.statusCode = statusCode;
        this.metadata = metadata;
    }

    send(res, header = {}) {
        return res.status(this.statusCode).json(this);
    }
}

class OK extends SuccessResponse {
    constructor({ message, statusCode = statusCodes.OK, reasonPhrasesCode = reasonPhrases.OK, metadata }) {
        super({ message, statusCode, reasonPhrasesCode, metadata });
    }
}

class Created extends SuccessResponse {
    constructor({ message, statusCode = statusCodes.CREATED, reasonPhrasesCode = reasonPhrases.CREATED, metadata }) {
        super({ message, statusCode, reasonPhrasesCode, metadata });
    }
}

module.exports = {
    OK,
    Created,
};
