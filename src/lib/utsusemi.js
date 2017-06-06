'use strict';

const url = require('url');
const querystring = require('querystring');

const separator = '-utsusemi-';

class Utsusemi {
    constructor(config) {
        this.config = config;
    }

    path(path) {
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
    }

    realPath(utsusemiPath) {
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
    }

    bucketKey(path) {
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
        return this.path(bucketKey);
    }

    bucketPrefix(prefix) {
        if (prefix.match(/\?/)) {
            return this.bucketKey(prefix);
        }
        return prefix.replace(/^\//, '');
    }

    rule(rule, path) {
        let links = [];
        if (rule.type === 'import') {
            let importStr = rule.import;
            let urli = importStr.replace(/(?:url\()?['"]*([^)'"]+)['"](?:\)?)/, '$1');
            let absolute = url.resolve(this.config.targetHost + path, urli).replace(this.config.targetHost,'');
            rule.import = importStr.replace(new RegExp(`${urli}`), this.path(absolute));
            links.push(this.realPath(absolute));
            return [rule, links];
        }
        if (rule.type === 'media') {
            rule.rules.map((r) => {
                let results = this.rule(r, path);
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
                let absolute = url.resolve(this.config.targetHost + path, urlp).replace(this.config.targetHost,'');
                d.value = d.value.replace(new RegExp(`${urlp}`), this.path(absolute));
                links.push(this.realPath(absolute));
            });
            return d;
        });
        return [rule, links];
    }
}

module.exports = Utsusemi;
