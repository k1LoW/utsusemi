'use strict';

const winston = require('winston');

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level: 'debug',
            colorize: false,
            timestamp: false
        })
    ]
});

module.exports = logger;
