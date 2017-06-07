'use strict';

const jsdom = require('jsdom');
const css = require('css');
const url = require('url');
const { JSDOM } = jsdom;
const Utsusemi = require('./utsusemi');

class Scraper {
    constructor(config) {
        this.config = config;
        this.utsusemi = new Utsusemi(config);
    }

    scrapeHTML(htmlStr, path) {
        const dom = new JSDOM(htmlStr);
        const document = dom.window.document;

        let links = [];

        document.querySelectorAll('a,link').forEach((el) => {
            if (el.href && url.resolve(this.config.targetHost, el.href).match(this.config.targetHost)) {
                let absolute = url.resolve(this.config.targetHost + path, el.href).replace(this.config.targetHost,'');
                el.href = this.utsusemi.path(absolute);
                links.push(this.utsusemi.realPath(absolute));
            }
        });
        document.querySelectorAll('table,tr,td,th').forEach((el) => {
            // <table> <tr> <td> <th> `backgroud` attribute
            let attr = el.attributes.getNamedItem('background');
            if (attr && attr.nodeValue && url.resolve(this.config.targetHost, attr.nodeValue).match(this.config.targetHost)) {
                let absolute = url.resolve(this.config.targetHost + path, attr.nodeValue).replace(this.config.targetHost,'');
                attr.nodeValue = this.utsusemi.path(absolute);
                el.attributes.setNamedItem(attr);
                links.push(this.utsusemi.realPath(absolute));
            }
        });
        document.querySelectorAll('img,script,input,iframe').forEach((el) => {
            if (el.src && url.resolve(this.config.targetHost, el.src).match(this.config.targetHost)) {
                let absolute = url.resolve(this.config.targetHost + path, el.src).replace(this.config.targetHost,'');
                el.src = this.utsusemi.path(absolute);
                links.push(this.utsusemi.realPath(absolute));
            }
        });

        const filtered = links.filter(function(element, index, array) {
            return array.indexOf(element) === index && element !== path;
        });
        return [dom.serialize(), filtered];
    }

    scrapeCSS(cssStr, path) {
        try {
            let obj = css.parse(cssStr);
            if (obj.type !== 'stylesheet') {
                return [cssStr, []];
            }
            let links = [];
            obj.stylesheet.rules.map((rule) => {
                let results = this.utsusemi.rule(rule, path);
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
                    let absolute = url.resolve(this.config.targetHost + path, relative).replace(this.config.targetHost,'');
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
                    let absolute = url.resolve(this.config.targetHost + path, relative).replace(this.config.targetHost,'');
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
}

module.exports = Scraper;
