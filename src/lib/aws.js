'use strict';

const AWS = require('aws-sdk');
const aws = () => {
    AWS.config.region = process.env.UTSUSEMI_REGION;
    return {
        s3: new AWS.S3({
            apiVersion: '2006-03-01'
        }),
        lambda: new AWS.Lambda({
            apiVersion: '2015-03-31'
        }),
        sqs: new AWS.SQS({
            apiVersion: '2012-11-05'
        })
    };
};

module.exports = aws;
