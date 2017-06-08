'use strict';

const logger = require('./logger');
const yaml = require('js-yaml');
const fs = require('fs');
const packageInfo = JSON.parse(fs.readFileSync(__dirname + '/../../package.json', 'utf8'));
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const moment = require('moment');
const aws = require('./aws')(config);
const s3 = aws.s3;
const lambda = aws.lambda;
const sqs = aws.sqs;
const functionS3Name = serverlessConfig.functions.s3worker.name
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const targetHost = config.targetHost;
const bucketName = config.bucketName;
const queueName = serverlessConfig.resources.Resources.Channel.Properties.QueueName
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const request = require('request-promise-native');
const querystring = require('querystring');
const Scraper = require('./scraper');
const scraper = new Scraper(config);
const Utsusemi = require('./utsusemi');
const utsusemi = new Utsusemi(config);
const jschardet = require('jschardet');
const iconv = require('iconv-lite');

const crawler = {
    walk: (path, depth, uuid, force) => {
        logger.debug('walk: ' + path);
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

                let headers = {
                    'User-Agent': `utsusemi/${packageInfo.version}`
                };
                if (config.crawlerUserAgent) {
                    // custom User-Agent
                    headers['User-Agent'] = config.crawlerUserAgent;
                }

                const bucketKey = utsusemi.bucketKey(path);

                let startPromise;
                if (force) {
                    startPromise = Promise.resolve().then(() => {
                        const options = {
                            method: 'GET',
                            uri: targetHost + path,
                            encoding: null,
                            headers: headers,
                            resolveWithFullResponse: true
                        };
                        return request(options).then((res) => {
                            return res;
                        }).catch((err) => {
                            // Check statusCode
                            if ([403, 404, 410].includes(err.statusCode)) {
                                return true;
                            }
                            throw err;
                        });
                    });
                } else {
                    const objectParams = {
                        Bucket: bucketName,
                        Key: bucketKey
                    };
                    startPromise = s3.getObjectTagging(objectParams).promise()
                        .then((data) => {
                            // Object exist
                            let status = {};
                            data.TagSet.forEach((tag) => {
                                status[tag.Key] = tag.Value;
                            });
                            // Check uuid & depth
                            if (status.uuid === uuid && status.depth >= depth) {
                                logger.debug('status.uuid === uuid && status.depth >= depth: ' + path);
                                return true;
                            }
                            // Check expires
                            if (status.expires > moment().unix()){
                                if (status.contentType.match(/(html|css)/)) {
                                    // HTML or CSS
                                    return lambda.invoke({
                                        FunctionName: functionS3Name,
                                        InvocationType: 'Event',
                                        Payload: JSON.stringify({
                                            path: path,
                                            depth: depth,
                                            uuid: uuid,
                                            contentType: status.contentType
                                        })
                                    }).promise().then(() => {
                                        return true;
                                    }).catch((err) => {
                                        logger.error(err);
                                        throw err;
                                    });
                                }
                            }
                            // Set If-None-Match to headers by etag
                            if (status.etag !== '-') {
                                headers['If-None-Match'] = status.etag;
                            }
                            // Set If-Modified-Since to headers by lastModified
                            headers['If-Modified-Since'] = moment(status.lastModified, 'X').toDate().toUTCString();
                            const options = {
                                method: 'GET',
                                uri: targetHost + path,
                                encoding: null,
                                headers: headers,
                                resolveWithFullResponse: true
                            };

                            return request(options).then((res) => {
                                return res;
                            }).catch((err) => {
                                // Check statusCode
                                if ([403, 404, 410].includes(err.statusCode)) {
                                    return true;
                                }
                                if (err.statusCode !== 304) {
                                    throw err;
                                }
                                if (status.contentType.match(/(html|css)/)) {
                                    // HTML or CSS
                                    return lambda.invoke({
                                        FunctionName: functionS3Name,
                                        InvocationType: 'Event',
                                        Payload: JSON.stringify({
                                            path: path,
                                            depth: depth,
                                            uuid: uuid,
                                            contentType: status.contentType
                                        })
                                    }).promise().then(() => {
                                        return true;
                                    }).catch((err) => {
                                        logger.error(err);
                                        throw err;
                                    });
                                }
                                return true;
                            });
                        })
                        .catch((err) => {
                            // Object not exist
                            if (err.code !== 'NoSuchKey') {
                                throw err;
                            }
                            const options = {
                                method: 'GET',
                                uri: targetHost + path,
                                encoding: null,
                                headers: headers,
                                resolveWithFullResponse: true
                            };
                            return request(options).then((res) => {
                                return res;
                            }).catch((err) => {
                                // Check statusCode
                                if ([403, 404, 410].includes(err.statusCode)) {
                                    return true;
                                }
                                throw err;
                            });
                        });
                }

                return startPromise.then((res) => {
                    if (res === true) {
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

                    if (!contentType.match(/(html|css)/)) {
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
                    let results = ['',[]];
                    const detected = jschardet.detect(res.body);
                    const decoded = iconv.decode(res.body, detected.encoding);
                    if (contentType.match(/html/)) {
                        results = scraper.scrapeHTML(decoded, path, targetHost);
                    } else if (contentType.match(/css/)) {
                        depth = 3; // !!!!
                        results = scraper.scrapeCSS(decoded, path, targetHost);
                    }
                    const body = iconv.encode(results[0], detected.encoding);
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
                        return crawler.enqueue(path, depth, uuid, queueUrl, filtered, force);
                    })
                    .then(() => {
                        return [200, {
                            message: 'Accepted'
                        }];
                    });
            });
    },
    s3walk: (path, depth, uuid, contentType) => {
        logger.debug('s3walk: ' + path);
        if (!contentType.match(/(html|css)/)) {
            throw new 's3walk support only HTML or CSS.';
        }
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

                const bucketKey = utsusemi.bucketKey(path);

                const objectParams = {
                    Bucket: bucketName,
                    Key: bucketKey
                };

                return s3.getObject(objectParams).promise()
                    .then((data) => {
                        let results = ['', []];
                        const detected = jschardet.detect(data.Body);
                        const decoded = iconv.decode(data.Body, detected.encoding);

                        if (contentType.match(/html/)) {
                            results = scraper.scrapeHTML(decoded, path, targetHost);
                        } else if (contentType.match(/css/)) {
                            depth = 3; // !!!!
                            results = scraper.scrapeCSS(decoded, path, targetHost);
                        }
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
                        return crawler.enqueue(path, depth, uuid, queueUrl, filtered, false);
                    })
                    .then(() => {
                        return [200, {
                            message: 'Accepted'
                        }];
                    });
            });
    },
    enqueue: (path, depth, uuid, queueUrl, filtered, force = false) => {
        let queues = [];
        filtered.forEach((path) => {
            const cache = `/tmp/${utsusemi.path(path).replace(/\//g, '__dir__')}-${(depth - 1)}-${uuid}`;
            if (crawler.isFileExist(cache)) {
                // Cache hit
                logger.debug('Cache hit: ' + path);
                return;
            }
            const params = {
                MessageBody: JSON.stringify({
                    path: path,
                    depth: depth - 1,
                    uuid: uuid,
                    force: force
                }),
                QueueUrl: queueUrl
            };
            queues.push(sqs.sendMessage(params).promise());
            fs.writeFile(cache, 'cache');
        });
        return Promise.all(queues);
    },
    isFileExist: (path) => {
        try {
            fs.accessSync(path);
            return true;
        } catch (err) {
            if(err.code === 'ENOENT') {
                return false;
            }
            throw err;
        }
    }
};

module.exports = crawler;
