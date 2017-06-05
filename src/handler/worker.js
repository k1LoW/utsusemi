'use strict';

const logger = require('../lib/logger');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const aws = require('aws-sdk');
aws.config.region = config.region;
const lambda = new aws.Lambda({
    region: config.region
});
const sqs = new aws.SQS({
    apiVersion: '2012-11-05'
});
const functionWorkerName = serverlessConfig.functions.worker.name
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const queueName = serverlessConfig.resources.Resources.Channel.Properties.QueueName
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const crawler = require('../lib/crawler');
const sleep = require('sleep-promise');

module.exports.handler = (event, context, cb) => {
    const queueParams = {
        QueueName: queueName
    };
    let delay = config.workerDelay;
    if (event.start) {
        // To wait for queue completion to SQS
        delay += 3000;
    }
    sleep(delay)
        .then(() => {
            return sqs.getQueueUrl(queueParams).promise()
                .then((data) => {
                    const queueUrl = data.QueueUrl;
                    logger.debug('queueUrl: ' + queueUrl);
                    const queueParams = {
                        QueueUrl: queueUrl,
                        MaxNumberOfMessages: config.threadsPerWorker
                    };
                    return Promise.all([
                        queueUrl,
                        sqs.receiveMessage(queueParams).promise()
                    ]);
                })
                .then((data) => {
                    const queueUrl = data[0];
                    if (!data[1].Messages) {
                        logger.debug('No Queue');
                        return Promise.resolve(true);
                    }
                    const threads = data[1].Messages.map((m) => {
                        const message = JSON.parse(m.Body);
                        const queueParams = {
                            QueueUrl: queueUrl,
                            ReceiptHandle: m.ReceiptHandle
                        };
                        return Promise.all([
                            sqs.deleteMessage(queueParams).promise(),
                            crawler.walk(message.path, message.depth, message.uuid)
                        ]);
                    });
                    return Promise.all(threads);
                });
        })
        .then((data) => {
            if (data === true) {
                return Promise.resolve(true);
            }
            logger.debug('Re invoke worker');
            return lambda.invoke({
                FunctionName: functionWorkerName,
                InvocationType: 'Event',
                Payload: JSON.stringify({
                })
            }).promise();
        })
        .then(() => {
            cb(null, {});
        })
        .catch((err) => {
            logger.error(err);
            cb(err.code, {err:err});
        });
};
