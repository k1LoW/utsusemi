'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const url = require('url');
const querystring = require('querystring');
const targetHost = config.targetHost;

const separator = '-utsusemi-';

const utsusemi = {
    path: (path) => {
        path = path.replace(/\/\//g, '/');
        if (!path.match(/\?/) || path.match(separator)) {
            return path;
        }
        const parsed = url.parse(path, true, true);
        let pathArray = parsed.pathname.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        const hex = new Buffer(JSON.stringify(parsed.query), 'utf8').toString('hex');
        let utsusemiPath = pathArray.join('.') + separator + hex;
        if (!ext) {
            return decodeURIComponent(utsusemiPath);
        }
        return decodeURIComponent([utsusemiPath, ext].join('.'));
    },
    realPath: (utsusemiPath) => {
        if (!utsusemiPath.match(separator)) {
            return utsusemiPath;
        }
        let pathArray = utsusemiPath.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        let utsusemiPathFront = pathArray.join('.');
        let splitted = utsusemiPathFront.split(separator);
        const query = JSON.parse(new Buffer(splitted[1], 'hex').toString('utf8'));
        if (!ext) {
            return splitted[0] + '?' + querystring.stringify(query);
        }
        return splitted[0] + '.' + ext + '?' + querystring.stringify(query);
    },
    bucketKey: (path) => {
        const parsed = url.parse(path, true, true);
        let pathname = parsed.pathname.replace(/^\//, '');
        if (pathname === '') {
            pathname = 'index.html';
        }
        if (pathname.match(/\/$/)) {
            pathname = pathname + 'index.html';
        }
        let  bucketKey = pathname;
        if (path.match(/\?/)) {
            bucketKey = bucketKey + '?' + querystring.stringify(parsed.query);
        }
        return utsusemi.path(bucketKey);
    },
    bucketPrefix: (prefix) => {
        if (prefix.match(/\?/)) {
            return utsusemi.bucketKey(prefix);
        }
        return prefix.replace(/^\//, '');
    },
    rule: (rule, path) => {
        let links = [];
        if (rule.type === 'import') {
            let importStr = rule.import;
            let urli = importStr.replace(/(?:url\()?['"]*([^)'"]+)['"](?:\)?)/, '$1');
            let absolute = url.resolve(targetHost + path, urli).replace(targetHost,'');
            rule.import = importStr.replace(new RegExp(`${urli}`), utsusemi.path(absolute));
            links.push(utsusemi.realPath(absolute));
            return [rule, links];
        }
        if (rule.type === 'media') {
            rule.rules.map((r) => {
                let results = utsusemi.rule(r, path);
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
                d.value = d.value.replace(new RegExp(`${urlp}`), utsusemi.path(absolute));
                links.push(utsusemi.realPath(absolute));
            });
            return d;
        });
        return [rule, links];
    }
};

module.exports = utsusemi;
