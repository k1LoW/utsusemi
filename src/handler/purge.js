'use strict';

const logger = require('../lib/logger');
const yaml = require('js-yaml');
const fs = require('fs');
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const aws = require('../lib/aws')();
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
                QueueUrl: queueUrl
            };
            return sqs.purgeQueue(queueParams).promise();
        })
        .then(() => {
            const response = {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Purged'
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
