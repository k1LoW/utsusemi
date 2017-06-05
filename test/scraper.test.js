'use strict';

const fs = require('fs');
const describe = require('mocha').describe;
const it = require('mocha').it;
const assert = require('power-assert');
const scraper = require('../src/lib/scraper');

describe('scraper.scrapeCSS()', () => {
    it ('Scrape valid CSS', () => {
        const cssStr = fs.readFileSync(__dirname + '/fixtures/valid.css', 'utf8');
        const path = '/path/to/';
        const scraped = scraper.scrapeCSS(cssStr, path);
        assert(scraped[1].toString() === [].toString());
    });
    it ('Scrape valid CSS with `url()`', () => {
        const cssStr = fs.readFileSync(__dirname + '/fixtures/valid_with_url.css', 'utf8');
        const path = '/path/to/';
        const scraped = scraper.scrapeCSS(cssStr, path);
        assert(scraped[0].match('/img/logo.png'));
        assert(scraped[0].match('/path/img/title.png'));
        assert(scraped[1].toString() === ['/img/logo.png', '/path/img/title.png'].toString());
    });
    it ('Scrape valid CSS with `import`', () => {
        const cssStr = fs.readFileSync(__dirname + '/fixtures/valid_with_import.css', 'utf8');
        const path = '/path/to/';
        const scraped = scraper.scrapeCSS(cssStr, path);
        assert(scraped[0].match('/css/common.css'));
        assert(scraped[0].match('/css/reset.css'));
        assert(scraped[0].match('/path/css/sub.css'));
        assert(scraped[0].match('/path/css/style.css'));
        assert(scraped[1].toString() === ['/css/common.css', '/css/reset.css', '/path/css/sub.css', '/path/css/style.css'].toString());
    });
    it ('Scrape invalid CSS', () => {
        const cssStr = fs.readFileSync(__dirname + '/fixtures/invalid.css', 'utf8');
        const path = '/path/to/';
        const scraped = scraper.scrapeCSS(cssStr, path);
        assert(scraped[0] === cssStr);
        assert(scraped[1].toString() === [].toString());
    });
    it ('Scrape invalid CSS with `url()`', () => {
        const cssStr = fs.readFileSync(__dirname + '/fixtures/invalid_with_url.css', 'utf8');
        const path = '/path/to/';
        const scraped = scraper.scrapeCSS(cssStr, path);
        assert(scraped[0].match('/img/logo.png'));
        assert(scraped[0].match('/path/img/title.png'));
        assert(scraped[1].toString() === ['/img/logo.png', '/path/img/title.png'].toString());
    });
    it ('Scrape invalid CSS with `import`', () => {
        const cssStr = fs.readFileSync(__dirname + '/fixtures/invalid_with_import.css', 'utf8');
        const path = '/path/to/';
        const scraped = scraper.scrapeCSS(cssStr, path);
        assert(scraped[0].match('/css/common.css'));
        assert(scraped[0].match('/css/reset.css'));
        assert(scraped[0].match('/path/css/sub.css'));
        assert(scraped[0].match('/path/css/style.css'));
        assert(scraped[1].toString() === ['/css/reset.css', '/path/css/style.css', '/css/common.css', '/path/css/sub.css'].toString());
    });
});
