'use strict';

const fs = require('fs');
const describe = require('mocha').describe;
const it = require('mocha').it;
const before = require('mocha').before;
const assert = require('power-assert');
const Scraper = require('../src/lib/scraper');

describe('scraper.scrapeHTML()', () => {
    let scraper;
    let config;
    before((done) => {
        config = {targetHost: 'https://example.com'};
        scraper = new Scraper(config);
        done();
    });
    it ('Scrape <table> <tr> <td> <th> `backgroud` attribute image', () => {
        const htmlStr = '<table background="table.jpg"><tr background="../tr.jpg"><th background="../../th.jpg"></th><td background="./td.jpg"></td></tr></table>';
        const path = '/path/to/';
        const scraped = scraper.scrapeHTML(htmlStr, path);
        assert(scraped[0].match('/path/to/table.jpg'));
        assert(scraped[0].match('/path/tr.jpg'));
        assert(scraped[0].match('/th.jpg'));
        assert(scraped[0].match('/path/to/td.jpg'));
        assert(scraped[1].toString() === [
            '/path/to/table.jpg',
            '/path/tr.jpg',
            '/th.jpg',
            '/path/to/td.jpg'
        ].toString());
    });
});

describe('scraper.scrapeCSS()', () => {
    let scraper;
    let config;
    before((done) => {
        config = {targetHost: 'https://example.com'};
        scraper = new Scraper(config);
        done();
    });
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
