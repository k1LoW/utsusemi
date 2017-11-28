'use strict';

const url = require('url');
const querystring = require('querystring');

const separator = '-utsusemi-';

class Utsusemi {
    path(path) {
        path = this.fixSlash(path.replace(/\/\//g, '/'));
        const parsed = url.parse(path, true, true);
        const hash = parsed.hash ? parsed.hash : '';
        const search = parsed.search ? parsed.search : '';
        let pathArray = parsed.pathname.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        if (!path.match(/\?/) || path.match(separator)) {
            return path;
        }
        const hex = new Buffer(JSON.stringify(parsed.query), 'utf8').toString('hex');
        let utsusemiPath = pathArray.join('.') + separator + hex;
        let suffix = hash;
        if (Number(process.env.UTSUSEMI_WITH_QUERY_STRING)) {
            suffix = search + hash;
        }
        if (!ext) {
            return decodeURIComponent(utsusemiPath) + suffix;
        }
        return decodeURIComponent([utsusemiPath, ext].join('.')) + suffix;
    }

    realPath(utsusemiPath) {
        utsusemiPath = this.fixSlash(utsusemiPath);
        const parsed = url.parse(utsusemiPath, true, true);
        const hash = parsed.hash ? parsed.hash : '';
        const search = parsed.search ? parsed.search : '';
        let pathArray = utsusemiPath.replace(search, '').replace(hash, '').split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        if (!utsusemiPath.match(separator)) {
            return utsusemiPath.replace(/=$/, '').replace(/=([&#])/, '$1');
        }
        let utsusemiPathFront = pathArray.join('.');
        let splitted = utsusemiPathFront.split(separator);
        const query = JSON.parse(new Buffer(splitted[1].replace(/\//, ''), 'hex').toString('utf8'));
        let path = splitted[0];
        const qs = querystring.stringify(query).replace(/=$/, '').replace(/=([&#])/, '$1');
        if (!ext) {
            return path + '?' + qs + hash;
        }
        return path + '.' + ext + '?' + qs + hash;
    }

    bucketKey(path) {
        const parsed = url.parse(path, true, true);
        const hash = parsed.hash ? parsed.hash : '';
        const search = parsed.search ? parsed.search : '';
        if (path.match(/\?/)) {
            return this.path(path).replace(/^\//, '').replace(search, '').replace(hash, '');
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
            if (urli && url.resolve(process.env.UTSUSEMI_TARGET_HOST, urli).match(process.env.UTSUSEMI_TARGET_HOST)) {
                let absolute = url.resolve(process.env.UTSUSEMI_TARGET_HOST + path, urli).replace(process.env.UTSUSEMI_TARGET_HOST,'');
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
                if (urlp && url.resolve(process.env.UTSUSEMI_TARGET_HOST, urlp).match(process.env.UTSUSEMI_TARGET_HOST)) {
                    let absolute = url.resolve(process.env.UTSUSEMI_TARGET_HOST + path, urlp).replace(process.env.UTSUSEMI_TARGET_HOST,'');
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
        const hash = parsed.hash ? parsed.hash : '';
        let pathArray = parsed.pathname.split('.');
        let ext = null;
        if (pathArray.length > 1) {
            ext = pathArray.pop();
        }
        let fixed;
        if (Number(process.env.UTSUSEMI_FORCE_TRAILING_SLASH) && !ext) {
            fixed = pathArray.join('.') + '/';
        } else if (!ext) {
            fixed = pathArray.join('.');
        } else {
            fixed = pathArray.join('.') + '.' + ext;
        }
        if (path.match(/\?/)) {
            fixed = fixed + '?' + querystring.stringify(parsed.query);
        }
        return fixed.replace(/\/\//g, '/') + hash;
    }
}

module.exports = Utsusemi;
