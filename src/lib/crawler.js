'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const moment = require('moment');
const aws = require('aws-sdk');
aws.config.region = config.region;
const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});
const lambda = new aws.Lambda({
    region: config.region
});
const sqs = new aws.SQS({
    apiVersion: '2012-11-05'
});
const functionS3Name = serverlessConfig.functions.s3get.name
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const targetHost = config.targetHost;
const bucketName = config.bucketName;
const queueName = serverlessConfig.resources.Resources.Channel.Properties.QueueName
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const request = require('request-promise-native');
const jsdom = require('jsdom');
const url = require('url');
const querystring = require('querystring');
const { JSDOM } = jsdom;

const crawler = {
    walk: (path, depth, uuid) => {
        return Promise.resolve()
            .then(() => {
                if (depth == 0 || !depth) {
                    return [200, {
                        message: 'Finish'
                    }];
                }

                if (!path || !path.match(/^\//) || !uuid) {
                    return [400, {
                        message: 'Bad Request'
                    }];
                }

                const bucketKey = crawler.bucketKey(path);

                const objectParams = {
                    Bucket: bucketName,
                    Key: bucketKey
                };

                return s3.getObjectTagging(objectParams).promise()
                    .then((data) => {
                        // Objectが存在
                        let status = {};
                        data.TagSet.forEach((tag) => {
                            status[tag.Key] = tag.Value;
                        });
                        // uuid と depthを確認してこれ以上走査が必要ないと判断したら何もしない
                        if (status.uuid === uuid && status.depth >= depth) {
                            return true;
                        }
                        let headers = {};
                        // expiresを過ぎていなかったらS3からデータを取得して利用する            
                        if (status.expires > moment().unix()){
                            if (status.contentType.match(/html/)) {
                                lambda.invoke({
                                    FunctionName: functionS3Name,
                                    InvocationType: 'Event',
                                    Payload: JSON.stringify({
                                        path: path,
                                        depth: depth - 1,
                                        uuid: uuid
                                    })
                                }).promise().then((data) => {
                                }).catch((err) => {
                                    console.log(err);
                                });
                            }
                            // htmlコンテンツでない場合は何もしない
                            return true;
                        }
                        // headersにetagからIf-None-Matchを埋め込む
                        if (status.etag !== '-') {
                            headers['If-None-Match'] = status.etag;
                        }
                        // headersにlastModifiedからIf-Modified-Sinceを埋め込む
                        headers['If-Modified-Since'] = moment(status.lastModified, 'X').toDate().toUTCString();
                        const options = {
                            method: 'GET',
                            uri: targetHost + path,
                            encoding: null,
                            headers: headers,
                            resolveWithFullResponse: true
                        };
                        return request(options);            
                    })
                    .catch((err) => {
                        // status objectがない
                        if (err.code !== 'NoSuchKey') {
                            throw err;
                        }
                        const options = {
                            method: 'GET',
                            uri: targetHost + path,
                            encoding: null,
                            resolveWithFullResponse: true
                        };
                        return request(options);
                    })    
                    .then((res) => {
                        if (res === true) {
                            return true;
                        }
                        if (res.statusCode >= 400) {
                            return true;
                        }
                        let contentType = 'text/html';
                        let now = moment().unix();
                        let expires = now;
                        let etag = '-';
                        let lastModified = now;
                        for(let h in res.headers) {
                            if (h.toLowerCase() === 'Content-Type'.toLowerCase()) {
                                contentType = res.headers[h].replace(/;.*$/, '');
                            }
                            if (h.toLowerCase() === 'Expires'.toLowerCase()) {
                                expires = moment(res.headers[h]).unix();
                            }
                            if (h.toLowerCase() === 'Etag'.toLowerCase()) {
                                etag = res.headers[h].replace(/"/g,'');
                            }
                            if (h.toLowerCase() === 'Last-Modified'.toLowerCase()) {
                                lastModified = moment(res.headers[h]).unix();
                            }
                        }
                        if (res.statusCode === 304) {
                            console.log(res.statusCode);
                            // 304 Not Modifiedを受け取ったらS3からデータを取得して利用する
                            if (contentType.match(/html/)) {
                                lambda.invoke({
                                    FunctionName: functionS3Name,
                                    InvocationType: 'Event',
                                    Payload: JSON.stringify({
                                        path: path,
                                        depth: depth - 1,
                                        uuid: uuid
                                    })
                                }).promise().then((data) => {
                                }).catch((err) => {
                                    console.log(err);
                                });
                                return true;
                            } else {
                                // htmlコンテンツでない場合は何もしない
                                return true;
                            }
                        }

                        const status = {
                            contentType: contentType,
                            expires: expires,
                            etag: etag,
                            lastModified: lastModified,
                            depth: depth,
                            uuid: uuid
                        };

                        const queueParams = {
                            QueueName: queueName
                        };
                        
                        if (!contentType.match(/html/)) {
                            const objectParams = {
                                Bucket: bucketName,
                                Key: bucketKey,
                                Body: res.body,
                                ContentType: contentType,
                                Tagging: querystring.stringify(status)
                            };
                            return Promise.all([
                                [],
                                sqs.getQueueUrl(queueParams).promise(),
                                s3.putObject(objectParams).promise()
                            ]);
                        }

                        const results = crawler.scrape(res.body, path);
                        const body = results[0];
                        const filtered = results[1];
                        
                        const objectParams = {
                            Bucket: bucketName,
                            Key: bucketKey,
                            Body: body,
                            ContentType: contentType,
                            Tagging: querystring.stringify(status)
                        };
                        return Promise.all([
                            filtered,
                            sqs.getQueueUrl(queueParams).promise(),
                            s3.putObject(objectParams).promise()
                        ]);
                    })
                    .then((data) => {
                        if (data === true || depth - 1 === 0) {
                            return true;
                        }
                        const filtered = data[0];
                        const queueUrl = data[1].QueueUrl;
                        return crawler.queue(path, depth, uuid, queueUrl, filtered);
                    })
                    .then(() => {
                        return [200, {
                            message: 'Accepted'
                        }];
                    });
            });
    },
    s3walk: (path, depth, uuid) => {
        return Promise.resolve()
            .then(() => {
                if (depth == 0 || !depth) {
                    return [200, {
                        message: 'Finish'
                    }];
                }

                if (!path || !path.match(/^\//) || !uuid) {
                    return [400, {
                        message: 'Bad Request'
                    }];
                }
                
                const bucketKey = crawler.bucketKey(path);
                
                const objectParams = {
                    Bucket: bucketName,
                    Key: bucketKey
                };
                
                return s3.getObject(objectParams).promise()
                    .then((data) => {
                        const results = crawler.scrape(data.Body.toString(), path);
                        // const body = results[0];
                        const filtered = results[1];

                        const queueParams = {
                            QueueName: queueName
                        };
                        
                        return Promise.all([
                            filtered,
                            sqs.getQueueUrl(queueParams).promise()
                        ]);
                    })
                    .then((data) => {
                        if (data === true || depth - 1 === 0) {
                            return true;
                        }
                        const filtered = data[0];
                        const queueUrl = data[1].QueueUrl;
                        return crawler.queue(path, depth, uuid, queueUrl, filtered);
                    })
                    .then(() => {
                        return [200, {
                            message: 'Accepted'
                        }];
                    });
            });
    },
    scrape: (html, path) => {
        const dom = new JSDOM(html);
        const document = dom.window.document;

        let links = [];

        document.querySelectorAll('a,link').forEach((el) => {
            if (el.href && url.resolve(targetHost, el.href).match(targetHost)) {
                let absolute = url.resolve(targetHost + path, el.href).replace(targetHost,'');
                el.href = crawler.utsusemiPath(absolute);
                links.push(absolute);
            }
        });
        document.querySelectorAll('img,script').forEach((el) => {
            if (el.src && url.resolve(targetHost, el.src).match(targetHost)) {
                let absolute = url.resolve(targetHost + path, el.src).replace(targetHost,'');
                el.src = crawler.utsusemiPath(absolute);
                links.push(absolute);
            }
        });

        const filtered = links.filter(function(element, index, array) {
            return array.indexOf(element) === index && element !== path;
        });

        return [dom.serialize(), filtered];
    },
    queue: (path, depth, uuid, queueUrl, filtered) => {
        let queues = [];
        
        filtered.forEach((path) => {
            const params = {
                MessageBody: JSON.stringify({
                    path: path,
                    depth: depth - 1,
                    uuid: uuid
                }),
                QueueUrl: queueUrl
            };
            queues.push(sqs.sendMessage(params).promise());
        });
        
        return Promise.all(queues);
    },
    bucketKey: (path) => {
        let bucketKey = crawler.utsusemiPath(path).replace(/^\//, '');
        if (bucketKey === '') {
            bucketKey = 'index.html';
        }
        if (bucketKey.match(/\/$/)) {
            bucketKey = path + 'index.html';
        }
        return bucketKey;
    },
    utsusemiPath: (path) => {
        if (!path.match(/\?/)) {
            return path;
        }
        const parsed = url.parse(path, true, false);
        let pathArray = parsed.pathname.split('.');
        const ext = pathArray.pop();
        let utsusemiPath = pathArray.join('.');
        Object.keys(parsed.query).forEach(function(key) {
            utsusemiPath += ['', key, this[key]].join('-');
        }, parsed.query);
        return decodeURIComponent([utsusemiPath, ext].join('.'));
    }
};

module.exports = crawler;
