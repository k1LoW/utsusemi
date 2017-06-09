'use strict';

const logger = require('../lib/logger');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const aws = require('../lib/aws')(config);
const sqs = aws.sqs;
const queueName = serverlessConfig.resources.Resources.Channel.Properties.QueueName
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);

module.exports.handler = (event, context, cb) => {
    const queueParams = {
        QueueName: queueName
    };
    sqs.getQueueUrl(queueParams).promise()
        .then((data) => {
            const queueUrl = data.QueueUrl;
            const queueParams = {
                QueueUrl: queueUrl,
                AttributeNames: [
                    'ApproximateNumberOfMessages'
                ]
            };
            return sqs.getQueueAttributes(queueParams).promise();
        })
        .then((data) => {
            const response = {
                statusCode: 200,
                body: JSON.stringify({
                    queueCount: data.Attributes.ApproximateNumberOfMessages
                })
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
