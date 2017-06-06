'use strict';

const jsdom = require('jsdom');
const css = require('css');
const url = require('url');
const { JSDOM } = jsdom;
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const Utsusemi = require('./utsusemi');
const utsusemi = new Utsusemi(config);

const scraper = {
    scrapeHTML: (htmlStr, path, targetHost = 'https://example.com') => {
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
    scrapeCSS: (cssStr, path, targetHost = 'https://example.com') => {
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
            // Manual scrape CSS
            let links = [];
            let matches = [];

            // url() / @import url()
            matches = cssStr.match(/url\("?'?[^'")]+"?'?\)/g);
            if (matches !== null) {
                matches.forEach ((str) => {
                    let relative = str.replace(/url\("?'?([^'")]+)"?'?\)/, '$1');
                    let absolute = url.resolve(targetHost + path, relative).replace(targetHost,'');
                    cssStr = cssStr.replace(relative, absolute);
                    links.push(absolute);
                });

                links = links.filter(function(element, index, array) {
                    return array.indexOf(element) === index && element !== path;
                });
            }

            // @import '/path/to/style.css'
            matches = cssStr.match(/@import\s+["']([^'"]+)["']/g);
            if (matches !== null) {
                matches.forEach ((str) => {
                    let relative = str.replace(/@import\s+["']([^'"]+)["']/, '$1');
                    let absolute = url.resolve(targetHost + path, relative).replace(targetHost,'');
                    cssStr = cssStr.replace(relative, absolute);
                    links.push(absolute);
                });

                links = links.filter(function(element, index, array) {
                    return array.indexOf(element) === index && element !== path;
                });
            }

            return [cssStr, links];
        }
    }
};

module.exports = scraper;
