'use strict';

const logger = require('../lib/logger');
const aws = require('../lib/aws')();
const sqs = aws.sqs;
const queueName = `${process.env.UTSUSEMI_SERVICE_NAME}-${process.env.UTSUSEMI_STAGE}-Channel`;

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
