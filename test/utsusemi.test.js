const assert = require('power-assert');
const utsusemi = require('../src/lib/utsusemi');

describe('utsusemi.path', () => {
    it ('if path do not have querystring, utsusemiPath return original path', () => {
        assert(utsusemi.path('/') === '/');
        assert(utsusemi.path('/work/') === '/work/');
        assert(utsusemi.path('/work') === '/work');
        assert(utsusemi.path('/img/logo.png') === '/img/logo.png');
    });
    it ('if path have querystring, utsusemiPath return utsusemi path', () => {
        assert(utsusemi.path('/?page=3') === '/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/work/?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/work?page=3') === '/work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/img/logo.png?page=3') === '/img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});

describe('utsusemi.realPath', () => {
    it ('if path do not have querystring, realPath return original path', () => {
        assert(utsusemi.realPath('/') === '/');
        assert(utsusemi.realPath('/work/') === '/work/');
        assert(utsusemi.realPath('/work') === '/work');
        assert(utsusemi.realPath('/img/logo.png') === '/img/logo.png');
    });
    it ('if path have `-utsusemi-` separator, realPath return real path', () => {
        assert(utsusemi.realPath('/-utsusemi-7b2270616765223a2233227d') === '/?page=3');
        assert(utsusemi.realPath('/work/-utsusemi-7b2270616765223a2233227d') === '/work/?page=3');
        assert(utsusemi.realPath('/work-utsusemi-7b2270616765223a2233227d') === '/work?page=3');
        assert(utsusemi.realPath('/img/logo-utsusemi-7b2270616765223a2233227d.png') === '/img/logo.png?page=3');
    });
});

describe('utsusemi.bucketKey', () => {
    it ('if path do not have querystring, bucketKey return S3 object key path', () => {
        assert(utsusemi.bucketKey('/') === 'index.html');
        assert(utsusemi.bucketKey('/work/') === 'work/index.html');
        assert(utsusemi.bucketKey('/work') === 'work');
        assert(utsusemi.bucketKey('/img/logo.png') === 'img/logo.png');
    });
    it ('if path have querystring, bucketKey return S3 object key path using utsusemiPath', () => {
        assert(utsusemi.bucketKey('/?page=3') === 'index-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketKey('/work/?page=3') === 'work/index-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketKey('/work?page=3') === 'work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/img/logo.png?page=3') === 'img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});
