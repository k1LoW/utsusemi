const assert = require('power-assert');
const crawler = require('../src/lib/crawler');

describe('crawler.utsusemiPath', () => {
    it ('if path do not have querystring. utsusemiPath return original path', () => {
        assert(crawler.utsusemiPath('/') === '/');
        assert(crawler.utsusemiPath('/work/') === '/work/');
        assert(crawler.utsusemiPath('/work') === '/work');
    });
    it ('if path have querystring. utsusemiPath return utsusemi path', () => {
        assert(crawler.utsusemiPath('/?page=3') === '/-utsusemi-7b2270616765223a2233227d');
        assert(crawler.utsusemiPath('/work/?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
        assert(crawler.utsusemiPath('/work?page=3') === '/work-utsusemi-7b2270616765223a2233227d');
    });
});
