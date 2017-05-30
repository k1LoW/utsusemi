const describe = require('mocha').describe;
const it = require('mocha').it;
const assert = require('power-assert');
const utsusemi = require('../src/lib/utsusemi');

describe('utsusemi.path()', () => {
    it ('if path do not have querystring, return original path', () => {
        assert(utsusemi.path('/') === '/');
        assert(utsusemi.path('/work/') === '/work/');
        assert(utsusemi.path('/work') === '/work');
        assert(utsusemi.path('/img/logo.png') === '/img/logo.png');
    });
    it ('if path have querystring, return utsusemi path', () => {
        assert(utsusemi.path('/?page=3') === '/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/work/?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/work?page=3') === '/work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/img/logo.png?page=3') === '/img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});

describe('utsusemi.realPath()', () => {
    it ('if path do not have querystring, return original path', () => {
        assert(utsusemi.realPath('/') === '/');
        assert(utsusemi.realPath('/work/') === '/work/');
        assert(utsusemi.realPath('/work') === '/work');
        assert(utsusemi.realPath('/img/logo.png') === '/img/logo.png');
    });
    it ('if path have `-utsusemi-` separator, return real path', () => {
        assert(utsusemi.realPath('/-utsusemi-7b2270616765223a2233227d') === '/?page=3');
        assert(utsusemi.realPath('/work/-utsusemi-7b2270616765223a2233227d') === '/work/?page=3');
        assert(utsusemi.realPath('/work-utsusemi-7b2270616765223a2233227d') === '/work?page=3');
        assert(utsusemi.realPath('/img/logo-utsusemi-7b2270616765223a2233227d.png') === '/img/logo.png?page=3');
    });
});

describe('utsusemi.bucketKey()', () => {
    it ('if path do not have querystring, return S3 object key path', () => {
        assert(utsusemi.bucketKey('/') === 'index.html');
        assert(utsusemi.bucketKey('/work/') === 'work/index.html');
        assert(utsusemi.bucketKey('/work') === 'work');
        assert(utsusemi.bucketKey('/img/logo.png') === 'img/logo.png');
    });
    it ('if path have querystring, return S3 object key path using utsusemiPath', () => {
        assert(utsusemi.bucketKey('/?page=3') === 'index-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketKey('/work/?page=3') === 'work/index-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketKey('/work?page=3') === 'work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/img/logo.png?page=3') === 'img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});

describe('utsusemi.bucketPrefix', () => {
    it ('if prefix do not have querystring, bucketPrefix return value of S3 bucket prefix', () => {
        assert(utsusemi.bucketPrefix('/') === '');
        assert(utsusemi.bucketPrefix('/work/') === 'work/');
        assert(utsusemi.bucketPrefix('/work') === 'work');
        assert(utsusemi.bucketPrefix('/img/logo.png') === 'img/logo.png');
    });
    it ('if prefix have querystring, bucketPrefix return S3 object key path using utsusemiPath', () => {
        assert(utsusemi.bucketPrefix('/?page=3') === 'index-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketPrefix('/work/?page=3') === 'work/index-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketPrefix('/work?page=3') === 'work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketPrefix('/img/logo.png?page=3') === 'img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});
