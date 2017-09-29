'use strict';

const logger = require('../lib/logger');
const aws = require('../lib/aws')();
const lambda = aws.lambda;
const starterFunctionName = `${process.env.UTSUSEMI_SERVICE_NAME}-${process.env.UTSUSEMI_STAGE}-starter`;
const deleteFunctionName = `${process.env.UTSUSEMI_SERVICE_NAME}-${process.env.UTSUSEMI_STAGE}-delete`;
const Ajv = require('ajv');
const ajv = new Ajv();
const schema = require('./nstarter-schema.json');
const uuidV4 = require('uuid/v4');

module.exports.handler = (event, context, cb) => {
    const actions = JSON.parse(event.body);
    const valid = ajv.validate(schema, actions);
    if (!valid) {
        const response = {
            statusCode: 400,
            body: JSON.stringify({
                status: 'error',
                message: 'JSON Schema Error',
                data: ajv.errors
            })
        };
        cb(null, response);
        return;
    }
    const uuid = uuidV4();
    let promises = [];
    actions.forEach((a) => {
        if (a.action == 'in') {
            let event = {
                queryStringParameters: {
                    path: a.path,
                    depth: a.depth,
                    uuid: uuid,
                    force: a.force
                }
            };
            promises.push(lambda.invoke({
                FunctionName: starterFunctionName,
                InvocationType: 'Event',
                Payload: JSON.stringify(event)
            }).promise());
        }
        if (a.action == 'delete') {
            let event = {
                queryStringParameters: {
                    prefix: a.prefix
                }
            };
            promises.push(lambda.invoke({
                FunctionName: deleteFunctionName,
                InvocationType: 'Event',
                Payload: JSON.stringify(event)
            }).promise());
        }
    });
    Promise.all(promises)
        .then(() => {
            const response = {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Accepted'
                })
            };
            cb(null, response);
        })
        .catch((err) => {
            logger.error(err);
            cb(err.code, {err:err});
        });
};
