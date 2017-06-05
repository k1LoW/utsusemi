'use strict';

const jsdom = require('jsdom');
const css = require('css');
const url = require('url');
const { JSDOM } = jsdom;
const utsusemi = require('./utsusemi');

const scraper = {
    scrapeHTML: (htmlStr, path, targetHost) => {
        const dom = new JSDOM(htmlStr);
        const document = dom.window.document;

        let links = [];

        document.querySelectorAll('a,link').forEach((el) => {
            if (el.href && url.resolve(targetHost, el.href).match(targetHost)) {
                let absolute = url.resolve(targetHost + path, el.href).replace(targetHost,'');
                el.href = utsusemi.path(absolute);
                links.push(utsusemi.realPath(absolute));
            }
        });
        document.querySelectorAll('img,script,input,iframe').forEach((el) => {
            if (el.src && url.resolve(targetHost, el.src).match(targetHost)) {
                let absolute = url.resolve(targetHost + path, el.src).replace(targetHost,'');
                el.src = utsusemi.path(absolute);
                links.push(utsusemi.realPath(absolute));
            }
        });

        const filtered = links.filter(function(element, index, array) {
            return array.indexOf(element) === index && element !== path;
        });
        return [dom.serialize(), filtered];
    },
    scrapeCSS: (cssStr, path, targetHost) => {
        try {
            let obj = css.parse(cssStr);
            if (obj.type !== 'stylesheet') {
                return [cssStr, []];
            }
            let links = [];
            obj.stylesheet.rules.map((rule) => {
                let results = utsusemi.rule(rule, path);
                links = links.concat(results[1]);
                return results[0];
            });

            const filtered = links.filter(function(element, index, array) {
                return array.indexOf(element) === index && element !== path;
            });

            return [css.stringify(obj), filtered];
        } catch (e) {
            const matches = cssStr.match(/url\("?'?[^'")]+"?'?\)/g);
            if (matches == null) {
                return [cssStr, []];
            }
            const links = matches.map ((str) => {
                let relative = str.replace(/url\("?'?([^'")]+)"?'?\)/, '$1');
                let absolute = url.resolve(targetHost + path, relative).replace(targetHost,'');
                cssStr = cssStr.replace(relative, absolute);
                return absolute;
            });

            const filtered = links.filter(function(element, index, array) {
                return array.indexOf(element) === index && element !== path;
            });

            return [cssStr, filtered];
        }
    }
};

module.exports = scraper;
