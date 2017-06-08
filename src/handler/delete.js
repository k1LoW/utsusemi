'use strict';

const logger = require('../lib/logger');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const aws = require('../lib/aws')(config);
const s3 = aws.s3;
const bucketName = config.bucketName;
const Utsusemi = require('../lib/utsusemi');
const utsusemi = new Utsusemi(config);

module.exports.handler = (event, context, cb) => {
    const prefix = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('prefix') ? event.queryStringParameters.prefix : null;

    const recursiveDeleteObjects = (params) => {
        return s3.listObjectsV2(params).promise()
            .then((data) => {
                if (data.Contents.length == 0) {
                    return Promise.resolve();
                }
                let deleteParams = {Bucket: params.Bucket};
                deleteParams.Delete = {Objects:[]};
                data.Contents.forEach(function(content) {
                    deleteParams.Delete.Objects.push({Key: content.Key});
                });
                return s3.deleteObjects(deleteParams).promise();
            })
            .then((data) => {
                if (data && data.Deleted.length == 1000) {
                    return recursiveDeleteObjects(params);
                }
                return [200, {
                    message: 'Deleted'
                }];
            });
    };

    Promise.resolve().then(() => {
        if (!prefix || !prefix.match(/^\//)) {
            return [400, {
                message: 'Bad Request'
            }];
        }

        const params = {
            Bucket: bucketName,
            Prefix: utsusemi.bucketPrefix(prefix)
        };
        return recursiveDeleteObjects(params);
    })
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
