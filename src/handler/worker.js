'use strict';

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

module.exports.handler = (event, context, cb) => {
    const queueParams = {
        QueueName: queueName
    };
    setTimeout(function () {
        sqs.getQueueUrl(queueParams).promise()
            .then((data) => {
                const queueUrl = data.QueueUrl;
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
                    return Promise.resolve();
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
                            .then(() => {
                                return lambda.invoke({
                                    FunctionName: functionWorkerName,
                                    InvocationType: 'Event',
                                    Payload: JSON.stringify({
                                    })
                                }).promise();
                            })
                    ]);
                });
                return Promise.all(threads);
            })
            .then(() => {
                cb(null, {});
            })
            .catch((err) => {
                console.log(err);
                cb(err.code, {err:err});
            });
    }, config.workerDelay);
};
