const assert = require('power-assert');
const crawler = require('../src/lib/crawler');

describe('crawler.utsusemiPath', () => {
    it ('if path do not have querystring, utsusemiPath return original path', () => {
        assert(crawler.utsusemiPath('/') === '/');
        assert(crawler.utsusemiPath('/work/') === '/work/');
        assert(crawler.utsusemiPath('/work') === '/work');
        assert(crawler.utsusemiPath('/img/logo.png') === '/img/logo.png');
    });
    it ('if path have querystring, utsusemiPath return utsusemi path', () => {
        assert(crawler.utsusemiPath('/?page=3') === '/-utsusemi-7b2270616765223a2233227d');
        assert(crawler.utsusemiPath('/work/?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
        assert(crawler.utsusemiPath('/work?page=3') === '/work-utsusemi-7b2270616765223a2233227d');
        assert(crawler.utsusemiPath('/img/logo.png?page=3') === '/img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});

describe('crawler.realPath', () => {
    it ('if path do not have querystring, realPath return original path', () => {
        assert(crawler.realPath('/') === '/');
        assert(crawler.realPath('/work/') === '/work/');
        assert(crawler.realPath('/work') === '/work');
        assert(crawler.realPath('/img/logo.png') === '/img/logo.png');
    });
    it ('if path have `-utsusemi-` separator, realPath return real path', () => {
        assert(crawler.realPath('/-utsusemi-7b2270616765223a2233227d') === '/?page=3');
        assert(crawler.realPath('/work/-utsusemi-7b2270616765223a2233227d') === '/work/?page=3');
        assert(crawler.realPath('/work-utsusemi-7b2270616765223a2233227d') === '/work?page=3');
        assert(crawler.realPath('/img/logo-utsusemi-7b2270616765223a2233227d.png') === '/img/logo.png?page=3');
    });
});

describe('crawler.bucketKey', () => {
    it ('if path do not have querystring, bucketKey return S3 object key path', () => {
        assert(crawler.bucketKey('/') === 'index.html');
        assert(crawler.bucketKey('/work/') === 'work/index.html');
        assert(crawler.bucketKey('/work') === 'work');
        assert(crawler.bucketKey('/img/logo.png') === 'img/logo.png');
    });
    it ('if path have querystring, bucketKey return S3 object key path using utsusemiPath', () => {
        assert(crawler.bucketKey('/?page=3') === 'index-utsusemi-7b2270616765223a2233227d.html');
        assert(crawler.bucketKey('/work/?page=3') === 'work/index-utsusemi-7b2270616765223a2233227d.html');
        assert(crawler.bucketKey('/work?page=3') === 'work-utsusemi-7b2270616765223a2233227d');
        assert(crawler.bucketKey('/img/logo.png?page=3') === 'img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});
