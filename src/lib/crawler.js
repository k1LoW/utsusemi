'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const packageInfo = JSON.parse(fs.readFileSync(__dirname + '/../../package.json', 'utf8'));
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
const functionS3Name = serverlessConfig.functions.s3worker.name
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const targetHost = config.targetHost;
const bucketName = config.bucketName;
const queueName = serverlessConfig.resources.Resources.Channel.Properties.QueueName
      .replace('${self:service}', serverlessConfig.service)
      .replace('${self:provider.stage}', serverlessConfig.provider.stage);
const request = require('request-promise-native');
const jsdom = require('jsdom');
const css = require('css');
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

                let headers = {
                    'User-Agent': `utsusemi/${packageInfo.version}`
                };

                return s3.getObjectTagging(objectParams).promise()
                    .then((data) => {
                        // Object exist
                        let status = {};
                        data.TagSet.forEach((tag) => {
                            status[tag.Key] = tag.Value;
                        });
                        // Check uuid & depth
                        if (status.uuid === uuid && status.depth >= depth) {
                            return true;
                        }
                        // Check expires
                        if (status.expires > moment().unix()){
                            if (status.contentType.match(/(html|css)/)) {
                                // HTML or CSS
                                lambda.invoke({
                                    FunctionName: functionS3Name,
                                    InvocationType: 'Event',
                                    Payload: JSON.stringify({
                                        path: path,
                                        depth: depth,
                                        uuid: uuid,
                                        contentType: status.contentType
                                    })
                                }).promise().then((data) => {
                                }).catch((err) => {
                                    console.log(err);
                                });
                            }
                            return true;
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
                        return request(options);
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
                        return request(options);
                    })
                    .catch((err) => {
                        console.log(err);
                        return true;
                    })
                    .then((res) => {
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
                        if (res.statusCode === 304) {
                            // Check statusCode
                            if (contentType.match(/(html|css)/)) {
                                // HTML or CSS
                                lambda.invoke({
                                    FunctionName: functionS3Name,
                                    InvocationType: 'Event',
                                    Payload: JSON.stringify({
                                        path: path,
                                        depth: depth,
                                        uuid: uuid,
                                        contentType: contentType
                                    })
                                }).promise().then(() => {
                                }).catch((err) => {
                                    console.log(err);
                                });
                            }
                            return true;
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
                        let body = '';
                        let filtered = [];
                        let results = ['',[]];
                        if (contentType.match(/html/)) {
                            results = crawler.scrapeHTML(res.body.toString(), path);
                            body = results[0];
                            filtered = results[1];
                        } else if (contentType.match(/css/)) {
                            results = crawler.scrapeCSS(res.body.toString(), path);
                            body = results[0];
                            filtered = results[1];
                        }

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
    s3walk: (path, depth, uuid, contentType) => {
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

                const bucketKey = crawler.bucketKey(path);

                const objectParams = {
                    Bucket: bucketName,
                    Key: bucketKey
                };

                return s3.getObject(objectParams).promise()
                    .then((data) => {
                        let results = ['', []];
                        if (contentType.match(/html/)) {
                            results = crawler.scrapeHTML(data.Body.toString(), path);
                        } else if (contentType.match(/css/)) {
                            results = crawler.scrapeCSS(data.Body.toString(), path);
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
                        return crawler.queue(path, depth, uuid, queueUrl, filtered);
                    })
                    .then(() => {
                        return [200, {
                            message: 'Accepted'
                        }];
                    });
            });
    },
    scrapeHTML: (htmlStr, path) => {
        const dom = new JSDOM(htmlStr);
        const document = dom.window.document;

        let links = [];

        document.querySelectorAll('a,link').forEach((el) => {
            if (el.href && url.resolve(targetHost, el.href).match(targetHost)) {
                let absolute = url.resolve(targetHost + path, el.href).replace(targetHost,'');
                el.href = crawler.utsusemiPath(absolute);
                links.push(crawler.realPath(absolute));
            }
        });
        document.querySelectorAll('img,script,input').forEach((el) => {
            if (el.src && url.resolve(targetHost, el.src).match(targetHost)) {
                let absolute = url.resolve(targetHost + path, el.src).replace(targetHost,'');
                el.src = crawler.utsusemiPath(absolute);
                links.push(crawler.realPath(absolute));
            }
        });

        const filtered = links.filter(function(element, index, array) {
            return array.indexOf(element) === index && element !== path;
        });
        return [dom.serialize(), filtered];
    },
    scrapeCSS: (cssStr, path) => {
        let obj = css.parse(cssStr);
        if (obj.type !== 'stylesheet') {
            return [cssStr, []];
        }
        let links = [];
        obj.stylesheet.rules.map((rule) => {
            let results = crawler.utsusemiRule(rule, path);
            links = links.concat(results[1]);
            return results[0];
        });

        const filtered = links.filter(function(element, index, array) {
            return array.indexOf(element) === index && element !== path;
        });

        return [css.stringify(obj), filtered];
    },
    utsusemiRule: (rule, path) => {
        let links = [];
        if (rule.type === 'media') {
            rule.rules.map((r) => {
                let results = crawler.utsusemiRule(r, path);
                links = links.concat(results[1]);
                return results[0];
            });
            return [rule, links];
        }
        if (rule.type !== 'rule') {
            return [rule, links];
        }
        rule.declarations.map((d) => {
            if (!d.value || !d.value.match(/url\(['"]*([^'")]+)['"]*\)/)) {
                return d;
            }
            const matches = d.value.match(/url\(['"]*([^)'"]+)['"]*\)/g);
            matches.forEach((m) => {
                let urlp = m.replace(/.*url\(['"]*([^)'"]+)['"]*\).*/, '$1');
                let absolute = url.resolve(targetHost + path, urlp).replace(targetHost,'');
                d.value = d.value.replace(new RegExp(`${urlp}`), crawler.utsusemiPath(absolute));
                links.push(crawler.realPath(absolute));
            });
            return d;
        });
        return [rule, links];
    },
    queue: (path, depth, uuid, queueUrl, filtered) => {
        let queues = [];
        filtered.forEach((path) => {
            const cache = `/tmp/${crawler.utsusemiPath(path).replace(/\//g, '__dir__')}-${(depth - 1)}-${uuid}`;
            if (crawler.isFileExist(cache)) {
                // cache hit
                return;
            }
            const params = {
                MessageBody: JSON.stringify({
                    path: path,
                    depth: depth - 1,
                    uuid: uuid
                }),
                QueueUrl: queueUrl
            };
            queues.push(sqs.sendMessage(params).promise());
            fs.writeFile(cache, 'cache');
        });
        return Promise.all(queues);
    },
    bucketKey: (path) => {
        let bucketKey = crawler.utsusemiPath(path).replace(/^\//, '');
        if (bucketKey === '') {
            bucketKey = 'index.html';
        }
        if (bucketKey.match(/\/$/)) {
            bucketKey = bucketKey + 'index.html';
        }
        return bucketKey;
    },
    utsusemiPath: (path) => {
        path = path.replace(/\/\//g, '/');
        if (!path.match(/\?/) || path.match(/-utsusemi-/)) {
            return path;
        }
        const parsed = url.parse(path, true, true);
        let pathArray = parsed.pathname.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        const hex = new Buffer(JSON.stringify(parsed.query), 'utf8').toString('hex');
        let utsusemiPath = pathArray.join('.') + '-utsusemi-' + hex;
        if (!ext) {
            return decodeURIComponent(utsusemiPath);
        }
        return decodeURIComponent([utsusemiPath, ext].join('.'));
    },
    realPath: (utsusemiPath) => {
        if (!utsusemiPath.match(/-utsusemi-/)) {
            return utsusemiPath;
        }
        let pathArray = utsusemiPath.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        let utsusemiPathFront = pathArray.join('.');
        let splitted = utsusemiPathFront.split('-utsusemi-');
        const query = JSON.parse(new Buffer(splitted[1], 'hex').toString('utf8'));
        if (!ext) {
            return splitted[0] + '?' + querystring.stringify(query);
        }
        return splitted[0] + '.' + ext + '?' + querystring.stringify(query);
    },
    isFileExist: (path) => {
        try {
            fs.accessSync(path);
            return true;
        } catch (err) {
            if(err.code === 'ENOENT') {
                return false;
            }
        }
        return false;
    }
};

module.exports = crawler;
