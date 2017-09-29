'use strict';

const logger = require('../lib/logger');
const aws = require('../lib/aws')();
const lambda = aws.lambda;
const functionWorkerName = `${process.env.UTSUSEMI_SERVICE_NAME}-${process.env.UTSUSEMI_STAGE}-worker`;
const uuidV4 = require('uuid/v4');
const crawler = require('../lib/crawler');

module.exports.handler = (event, context, cb) => {
    const path = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('path') ? event.queryStringParameters.path : null;
    const depth = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('depth') ? event.queryStringParameters.depth : 1;
    const uuid = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('uuid') ? event.queryStringParameters.uuid : uuidV4();
    const force = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('force') ? Boolean(event.queryStringParameters.force) : false;

    crawler.walk(path, depth, uuid, force)
        .then((data) => {
            const response = {
                statusCode: data[0],
                body: JSON.stringify(data[1])
            };
            const lambdaParams = {
                FunctionName: functionWorkerName,
                InvocationType: 'Event',
                Payload: JSON.stringify({
                    start: true
                })
            };
            let workers = [];
            for (let i = 0; i < Number(process.env.UTSUSEMI_WORKER_PROCESS); i++) {
                workers.push(lambda.invoke(lambdaParams).promise());
            }
            return Promise.all(workers)
                .then(() => {
                    return response;
                });
        })
        .then((data) => {
            cb(null, data);
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
