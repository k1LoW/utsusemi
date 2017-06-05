'use strict';

const console = require('console');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const aws = require('aws-sdk');
aws.config.region = config.region;
const lambda = new aws.Lambda({
    region: config.region
});
const functionWorkerName = serverlessConfig.functions.worker.name
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const uuidV4 = require('uuid/v4');
const crawler = require('../lib/crawler');

module.exports.handler = (event, context, cb) => {
    const path = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('path') ? event.queryStringParameters.path : null;
    const depth = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('depth') ? event.queryStringParameters.depth : 1;
    const uuid = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('uuid') ? event.queryStringParameters.uuid : uuidV4();

    crawler.walk(path, depth, uuid)
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
            for (let i = 0; i < config.workerProcess; i++) {
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
            console.error(err);
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
