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
        const parsed = url.parse(path, true, true);
        const hash = parsed.hash ? parsed.hash : '';
        let pathArray = parsed.pathname.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        if (!path.match(/\?/) || path.match(separator)) {
            return this.fixSlash(path) + hash;
        }
        const hex = new Buffer(JSON.stringify(parsed.query), 'utf8').toString('hex');
        let utsusemiPath = this.fixSlash(pathArray.join('.')) + separator + hex;
        if (!ext) {
            return decodeURIComponent(utsusemiPath) + hash;
        }
        return decodeURIComponent([utsusemiPath, ext].join('.')) + hash;
    }

    realPath(utsusemiPath) {
        const parsed = url.parse(utsusemiPath, true, true);
        const hash = parsed.hash ? parsed.hash : '';
        let pathArray = utsusemiPath.replace(hash, '').split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        if (!utsusemiPath.match(separator)) {
            return this.fixSlash(utsusemiPath) + hash;
        }
        let utsusemiPathFront = pathArray.join('.');
        let splitted = utsusemiPathFront.split(separator);
        const query = JSON.parse(new Buffer(splitted[1], 'hex').toString('utf8'));
        let path = this.fixSlash(splitted[0]);
        if (!ext) {
            return path + '?' + querystring.stringify(query) + hash;
        }
        return path + '.' + ext + '?' + querystring.stringify(query) + hash;
    }

    bucketKey(path) {
        const parsed = url.parse(path, true, true);
        const hash = parsed.hash ? parsed.hash : '';
        if (path.match(/\?/)) {
            return this.path(path).replace(/^\//, '').replace(hash, '');
        }
        let pathname = parsed.pathname;
        if (pathname === '/') {
            pathname = 'index.html';
        }
        if (pathname.match(/\/$/)) {
            pathname = pathname + 'index.html';
        }
        return pathname.replace(/^\//, '').replace(hash, '');
    }

    bucketPrefix(prefix) {
        const parsed = url.parse(prefix, true, true);
        const hash = parsed.hash ? parsed.hash : '';
        if (prefix.match(/\?/)) {
            return this.bucketKey(prefix);
        }
        return prefix.replace(/^\//, '').replace(hash, '');
    }

    rule(rule, path) {
        let links = [];
        if (rule.type === 'import') {
            let importStr = rule.import;
            let urli = importStr.replace(/(?:url\()?['"]*([^)'"]+)['"](?:\)?)/, '$1');
            if (urli && url.resolve(this.config.targetHost, urli).match(this.config.targetHost)) {
                let absolute = url.resolve(this.config.targetHost + path, urli).replace(this.config.targetHost,'');
                rule.import = importStr.replace(new RegExp(`${urli}`), this.path(absolute));
                links.push(this.realPath(absolute));
            }
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
        if (rule.type !== 'rule' && rule.type !== 'font-face') {
            return [rule, links];
        }
        rule.declarations.map((d) => {
            if (!d.value || !d.value.match(/url\(['"]*([^'")]+)['"]*\)/)) {
                return d;
            }
            const matches = d.value.match(/url\(['"]*([^)'"]+)['"]*\)/g);
            matches.forEach((m) => {
                let urlp = m.replace(/.*url\(['"]*([^)'"]+)['"]*\).*/, '$1');
                if (urlp && url.resolve(this.config.targetHost, urlp).match(this.config.targetHost)) {
                    let absolute = url.resolve(this.config.targetHost + path, urlp).replace(this.config.targetHost,'');
                    d.value = d.value.replace(`${urlp}`, this.path(absolute));
                    links.push(this.realPath(absolute));
                }
            });
            return d;
        });
        return [rule, links];
    }

    fixSlash(path) {
        const parsed = url.parse(path, true, true);
        let pathArray = parsed.pathname.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        let fixed;
        if (this.config.forceTrailingSlash && !ext) {
            fixed = pathArray.join('.') + '/';
        } else if (!ext) {
            fixed = pathArray.join('.');
        } else {
            fixed = pathArray.join('.') + '.' + ext;
        }
        if (path.match(/\?/)) {
            fixed = fixed + '?' + querystring.stringify(parsed.query);
        }
        return fixed.replace(/\/\//g, '/');
    }
}

module.exports = Utsusemi;
