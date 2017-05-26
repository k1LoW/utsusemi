'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const aws = require('aws-sdk');
aws.config.region = config.region;
const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});
const sqs = new aws.SQS({
    apiVersion: '2012-11-05'
});
const targetHost = config.targetHost;
const bucketName = config.bucketName;
const queueName = serverlessConfig.resources.Resources.Channel.Properties.QueueName
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const jsdom = require('jsdom');
const url = require('url');
const { JSDOM } = jsdom;
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
