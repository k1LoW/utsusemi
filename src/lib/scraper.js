'use strict';

const jsdom = require('jsdom');
const css = require('css');
const url = require('url');
const { JSDOM } = jsdom;
const Utsusemi = require('./utsusemi');

class Scraper {
    constructor() {
        this.utsusemi = new Utsusemi();
    }

    scrapeHTML(htmlStr, path) {
        const dom = new JSDOM(htmlStr);
        const document = dom.window.document;
        let doctype = '';
        if (document.doctype) {
            doctype = '<!DOCTYPE ' +
                  document.doctype.name +
                  (document.doctype.publicId?' PUBLIC "' +  document.doctype.publicId + '"':'') +
                  (document.doctype.systemId?' "' + document.doctype.systemId + '"':'') + '>';
        }

        let links = [];

        document.querySelectorAll('a,link').forEach((el) => {
            if (el.href && url.resolve(process.env.UTSUSEMI_TARGET_HOST, el.href).match(process.env.UTSUSEMI_TARGET_HOST)) {
                let absolute = url.resolve(process.env.UTSUSEMI_TARGET_HOST + path, el.href).replace(process.env.UTSUSEMI_TARGET_HOST,'');
                el.href = this.utsusemi.path(absolute);
                links.push(this.utsusemi.realPath(absolute));
            }
        });
        document.querySelectorAll('table,tr,td,th').forEach((el) => {
            // <table> <tr> <td> <th> `backgroud` attribute
            let attr = el.attributes.getNamedItem('background');
            if (attr && attr.nodeValue && url.resolve(process.env.UTSUSEMI_TARGET_HOST, attr.nodeValue).match(process.env.UTSUSEMI_TARGET_HOST)) {
                let absolute = url.resolve(process.env.UTSUSEMI_TARGET_HOST + path, attr.nodeValue).replace(process.env.UTSUSEMI_TARGET_HOST,'');
                attr.nodeValue = this.utsusemi.path(absolute);
                el.attributes.setNamedItem(attr);
                links.push(this.utsusemi.realPath(absolute));
            }
        });
        document.querySelectorAll('img,script,input,iframe').forEach((el) => {
            if (el.src && url.resolve(process.env.UTSUSEMI_TARGET_HOST, el.src).match(process.env.UTSUSEMI_TARGET_HOST)) {
                let absolute = url.resolve(process.env.UTSUSEMI_TARGET_HOST + path, el.src).replace(process.env.UTSUSEMI_TARGET_HOST,'');
                el.src = this.utsusemi.path(absolute);
                links.push(this.utsusemi.realPath(absolute));
            }
        });
        document.querySelectorAll('[style]').forEach((el) => {
            let attr = el.attributes.getNamedItem('style');
            const cssStr = attr.nodeValue;
            const scraped = this.scrapeCSS(cssStr, path);
            attr.nodeValue = scraped[0];
            el.attributes.setNamedItem(attr);
            links = links.concat(scraped[1]);
        });

        const filtered = links.filter(function(element, index, array) {
            return array.indexOf(element) === index && element !== path;
        });
        return [doctype + document.documentElement.outerHTML, filtered];
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
                    if (relative && url.resolve(process.env.UTSUSEMI_TARGET_HOST, relative).match(process.env.UTSUSEMI_TARGET_HOST)) {
                        let absolute = url.resolve(process.env.UTSUSEMI_TARGET_HOST + path, relative).replace(process.env.UTSUSEMI_TARGET_HOST,'');
                        cssStr = cssStr.replace(new RegExp(`([\("'])${relative}([\)"'])`), `$1${absolute}$2`);
                        links.push(this.utsusemi.realPath(absolute));
                    }
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
                    if (relative && url.resolve(process.env.UTSUSEMI_TARGET_HOST, relative).match(process.env.UTSUSEMI_TARGET_HOST)) {
                        let absolute = url.resolve(process.env.UTSUSEMI_TARGET_HOST + path, relative).replace(process.env.UTSUSEMI_TARGET_HOST,'');
                        cssStr = cssStr.replace(relative, absolute);
                        links.push(this.utsusemi.realPath(absolute));
                    }
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
