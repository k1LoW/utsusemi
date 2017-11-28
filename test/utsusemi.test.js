'use strict';

const describe = require('mocha').describe;
const it = require('mocha').it;
const before = require('mocha').before;
const assert = require('power-assert');
const Utsusemi = require('../src/lib/utsusemi');

describe('utsusemi.path()', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '0';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '0';
        utsusemi = new Utsusemi();
        done();
    });
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
        assert(utsusemi.path('/work?page=3&limit=10') === '/work-utsusemi-7b2270616765223a2233222c226c696d6974223a223130227d');
        assert(utsusemi.path('/img/logo.png?page=3') === '/img/logo-utsusemi-7b2270616765223a2233227d.png');
        assert(utsusemi.path('/assets/fonts/icomoon/icomoon.eot?mtxlfj#hash') === '/assets/fonts/icomoon/icomoon-utsusemi-7b226d74786c666a223a22227d.eot#hash');
    });
    it ('if path have double slash, return single slash', () => {
        assert(utsusemi.path('//') === '/');
        assert(utsusemi.path('/work//') === '/work/');
        assert(utsusemi.path('//work') === '/work');
        assert(utsusemi.path('//img//logo.png') === '/img/logo.png');
    });
});

describe('utsusemi.realPath()', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '0';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '0';
        utsusemi = new Utsusemi();
        done();
    });
    it ('if path do not have querystring, return original path', () => {
        assert(utsusemi.realPath('/') === '/');
        assert(utsusemi.realPath('/work/') === '/work/');
        assert(utsusemi.realPath('/work') === '/work');
        assert(utsusemi.realPath('/img/logo.png') === '/img/logo.png');
        assert(utsusemi.realPath('/path/to/icomoon/icomoon.eot?mtxlfj#iefix') === '/path/to/icomoon/icomoon.eot?mtxlfj#iefix');
    });
    it ('if path have `-utsusemi-` separator, return real path', () => {
        assert(utsusemi.realPath('/-utsusemi-7b2270616765223a2233227d') === '/?page=3');
        assert(utsusemi.realPath('/work/-utsusemi-7b2270616765223a2233227d') === '/work/?page=3');
        assert(utsusemi.realPath('/work-utsusemi-7b2270616765223a2233227d') === '/work?page=3');
        assert(utsusemi.realPath('/work-utsusemi-7b2270616765223a2233222c226c696d6974223a223130227d') === '/work?page=3&limit=10');
        assert(utsusemi.realPath('/img/logo-utsusemi-7b2270616765223a2233227d.png') === '/img/logo.png?page=3');
        assert(utsusemi.realPath('/assets/fonts/icomoon/icomoon-utsusemi-7b226d74786c666a223a22227d.eot#hash') === '/assets/fonts/icomoon/icomoon.eot?mtxlfj#hash');
    });
});

describe('utsusemi.bucketKey()', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '0';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '0';
        utsusemi = new Utsusemi();
        done();
    });
    it ('if path do not have querystring, return S3 object key path', () => {
        assert(utsusemi.bucketKey('/') === 'index.html');
        assert(utsusemi.bucketKey('/work/') === 'work/index.html');
        assert(utsusemi.bucketKey('/work') === 'work');
        assert(utsusemi.bucketKey('/img/logo.png') === 'img/logo.png');
    });
    it ('if path have querystring, return S3 object key path using utsusemi.path()', () => {
        assert(utsusemi.bucketKey('/?page=3') === '-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/work/?page=3') === 'work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/work?page=3') === 'work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/work.html?page=3') === 'work-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketKey('/img/logo.png?page=3') === 'img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});

describe('utsusemi.fixSlash()', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '0';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '0';
        utsusemi = new Utsusemi();
        done();
    });
    it ('if process.env.UTSUSEMI_FORCE_TRAILING_SLASH = 0, return path', () => {
        assert(utsusemi.fixSlash('/path/to') === '/path/to');
        assert(utsusemi.fixSlash('/path/to/') === '/path/to/');
        assert(utsusemi.fixSlash('/path/to/logo.png') === '/path/to/logo.png');
        assert(utsusemi.fixSlash('/path/to/index.html?page=3#hash') === '/path/to/index.html?page=3#hash');
        assert(utsusemi.fixSlash('/work/?page=3#hash') === '/work/?page=3#hash');
        assert(utsusemi.fixSlash('/work?page=3#hash') === '/work?page=3#hash');
    });
    it ('if process.env.UTSUSEMI_FORCE_TRAILING_SLASH = 1, return slashed path', () => {
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '1';
        assert(utsusemi.fixSlash('/path/to') === '/path/to/');
        assert(utsusemi.fixSlash('/path/to/') === '/path/to/');
        assert(utsusemi.fixSlash('/path/to/logo.png') === '/path/to/logo.png');
        assert(utsusemi.fixSlash('/path/to/index.html?page=3#hash') === '/path/to/index.html?page=3#hash');
        assert(utsusemi.fixSlash('/work/?page=3#hash') === '/work/?page=3#hash');
        assert(utsusemi.fixSlash('/work?page=3#hash') === '/work/?page=3#hash');
    });
});

describe('utsusemi.bucketPrefix', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '0';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '0';
        utsusemi = new Utsusemi();
        done();
    });
    it ('if prefix do not have querystring, bucketPrefix return value of S3 bucket prefix', () => {
        assert(utsusemi.bucketPrefix('/') === '');
        assert(utsusemi.bucketPrefix('/work/') === 'work/');
        assert(utsusemi.bucketPrefix('/work') === 'work');
        assert(utsusemi.bucketPrefix('/img/logo.png') === 'img/logo.png');
    });
    it ('if prefix have querystring, bucketPrefix return S3 object key path using utsusemi.path()', () => {
        assert(utsusemi.bucketPrefix('/?page=3') === '-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketPrefix('/work/?page=3') === 'work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketPrefix('/work?page=3') === 'work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketPrefix('/work.html?page=3') === 'work-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketPrefix('/img/logo.png?page=3') === 'img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});

describe('process.env.UTSUSEMI_FORCE_TRAILING_SLASH = \'1\'', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '1';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '0';
        utsusemi = new Utsusemi();
        done();
    });
    it ('utsusemi.path() return set trailing slash', () => {
        assert(utsusemi.path('/work/') === '/work/');
        assert(utsusemi.path('/work') === '/work/');
        assert(utsusemi.path('/work/?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/work?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
    });
    it ('utsusemi.realPath() return set trailing slash', () => {
        assert(utsusemi.realPath('/work/') === '/work/');
        assert(utsusemi.realPath('/work') === '/work/');
        assert(utsusemi.realPath('/work/?page=3') === '/work/?page=3');
        assert(utsusemi.realPath('/work?page=3') === '/work/?page=3');
        assert(utsusemi.realPath('/path/to/icomoon/icomoon.eot?mtxlfj#iefix') === '/path/to/icomoon/icomoon.eot?mtxlfj#iefix');
        assert(utsusemi.path('/work/?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/work?page=3') === '/work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.path('/path/to/work.html?key') === '/path/to/work-utsusemi-7b226b6579223a22227d.html');
        assert(utsusemi.realPath('/work/-utsusemi-7b2270616765223a2233227d') === '/work/?page=3');
    });
});

describe('process.env.UTSUSEMI_WITH_QUERY_STRING = \'1\'', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '0';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '1';
        utsusemi = new Utsusemi();
        done();
    });
    it ('if path have querystring, return utsusemi path with querystring', () => {
        assert(utsusemi.path('/?page=3') === '/-utsusemi-7b2270616765223a2233227d?page=3');
        assert(utsusemi.path('/work/?page=3') === '/work/-utsusemi-7b2270616765223a2233227d?page=3');
        assert(utsusemi.path('/work?page=3') === '/work-utsusemi-7b2270616765223a2233227d?page=3');
        assert(utsusemi.path('/img/logo.png?page=3') === '/img/logo-utsusemi-7b2270616765223a2233227d.png?page=3');
    });
    it ('utsusemi.realPath() return correct querystring', () => {
        assert(utsusemi.realPath('/work/-utsusemi-7b2270616765223a2233227d?page=3') === '/work/?page=3');
    });
    it ('if path have querystring, return S3 object key path using utsusemi.path() but no querystring', () => {
        assert(utsusemi.bucketKey('/?page=3') === '-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/work/?page=3') === 'work/-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/work?page=3') === 'work-utsusemi-7b2270616765223a2233227d');
        assert(utsusemi.bucketKey('/work.html?page=3') === 'work-utsusemi-7b2270616765223a2233227d.html');
        assert(utsusemi.bucketKey('/img/logo.png?page=3') === 'img/logo-utsusemi-7b2270616765223a2233227d.png');
    });
});

describe('#hash', () => {
    let utsusemi;
    before((done) => {
        process.env.UTSUSEMI_TARGET_HOST = 'https://example.com';
        process.env.UTSUSEMI_FORCE_TRAILING_SLASH = '0';
        process.env.UTSUSEMI_WITH_QUERY_STRING = '0';
        utsusemi = new Utsusemi();
        done();
    });
    it ('if path have #hash, return path() realPath() only set #hash', () => {
        assert(utsusemi.path('/#hash') === '/#hash');
        assert(utsusemi.realPath('/#hash') === '/#hash');
        assert(utsusemi.bucketKey('/#hash') === 'index.html');
        assert(utsusemi.bucketPrefix('/#hash') === '');

        assert(utsusemi.path('/work/?page=3#hash') === '/work/-utsusemi-7b2270616765223a2233227d#hash');
        assert(utsusemi.realPath('/work/-utsusemi-7b2270616765223a2233227d#hash') === '/work/?page=3#hash');
    });
});
