'use strict';

const logger = require('../lib/logger');
const crawler = require('../lib/crawler');

module.exports.handler = (event, context, cb) => {
    const path = event.path;
    const depth = event.depth;
    const uuid = event.uuid;
    const contentType = event.contentType;

    crawler.s3walk(path, depth, uuid, contentType)
        .then((data) => {
            const response = {
                statusCode: data[0],
                body: JSON.stringify(data[1])
            };
            cb(null, response);
        })
        .catch((err) => {
            logger.error(err);
            const response = {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Internal Server Error',
                    err: err
                })
            };
            cb(null, response);
        });
};
